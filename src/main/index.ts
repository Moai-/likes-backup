import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import { google } from "googleapis";
import {
	YT_SCOPES,
	type OAuthProfile,
	type NormalizedVideo,
	type LikesPage,
} from "@/config/google";
import type { OAuth2Client } from "google-auth-library";

const __dirname = path.dirname(__filename);
const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

const TOKEN_PATH = path.join(app.getPath("userData"), "google-oauth.json");

async function loadClientJson(): Promise<any | null> {
	// 1) Environment variable (raw JSON or base64)
	const envJson = process.env.GOOGLE_CLIENT_JSON;
	if (envJson) {
		try {
			const maybeBase64 = Buffer.from(envJson, "base64").toString("utf8");
			const parsed = JSON.parse(maybeBase64);
			if (parsed?.installed?.client_id) return parsed;
		} catch {
			// not base64, try raw
			try {
				const parsed = JSON.parse(envJson);
				if (parsed?.installed?.client_id) return parsed;
			} catch {}
		}
	}

	// 2) Packaged location (extraResources)
	const packagedPath = path.join(process.resourcesPath, "google-client.json");
	try {
		const buf = await fs.readFile(packagedPath, "utf8");
		const parsed = JSON.parse(buf);
		if (parsed?.installed?.client_id) return parsed;
	} catch {}

	// 3) Dev repo location
	const devPath = path.join(app.getAppPath(), "assets", "google-client.json");
	try {
		const buf = await fs.readFile(devPath, "utf8");
		const parsed = JSON.parse(buf);
		if (parsed?.installed?.client_id) return parsed;
	} catch {}

	// 4) User drop-in (manual)
	const userPath = path.join(app.getPath("userData"), "google-client.json");
	try {
		const buf = await fs.readFile(userPath, "utf8");
		const parsed = JSON.parse(buf);
		if (parsed?.installed?.client_id) return parsed;
	} catch {}

	return null;
}

async function readJson<T>(p: string): Promise<T | null> {
	try {
		return JSON.parse(await fs.readFile(p, "utf8")) as T;
	} catch (e) {
		return null;
	}
}

async function writeJson<T>(p: string, data: T) {
	await fs.mkdir(path.dirname(p), { recursive: true });
	await fs.writeFile(p, JSON.stringify(data, null, 2));
}

function pickBestThumb(s: any): string | undefined {
	const t = s?.thumbnails ?? {};
	return (
		t.maxres?.url ||
		t.standard?.url ||
		t.high?.url ||
		t.medium?.url ||
		t.default?.url
	);
}

function normalize(v: any): NormalizedVideo {
	const s = v.snippet ?? {};
	const c = v.contentDetails ?? {};
	return {
		id: v.id,
		title: s.title || "Unknown Title",
		channelTitle: s.channelTitle,
		duration: c.duration,
		publishedAt: s.publishedAt,
		thumbnailUrl: pickBestThumb(s),
		dateLogged: new Date().toISOString(),
	};
}

async function createOAuthClient(): Promise<OAuth2Client> {
	const client = await loadClientJson();
	if (!client?.installed?.client_id || !client?.installed?.client_secret) {
		throw new Error("Client ID or secret not found");
	}

	const { client_id, client_secret } = client.installed;

	// IMPORTANT: do NOT bind a redirect URI here. We’ll bind a dynamic
	// 127.0.0.1:<randomPort> during the first-time auth flow inside ensureAuthorized().
	const oAuth2Client = new google.auth.OAuth2({
		clientId: client_id,
		clientSecret: client_secret,
	});

	// Load tokens if present
	const tokens = await readJson<any>(TOKEN_PATH);
	if (tokens) {
		oAuth2Client.setCredentials(tokens);
	}

	// Persist token refreshes
	oAuth2Client.on("tokens", async (t) => {
		const merged = { ...(await readJson<any>(TOKEN_PATH)), ...t };
		await writeJson(TOKEN_PATH, merged);
	});

	return oAuth2Client;
}

async function ensureAuthorized(oAuth2Client: OAuth2Client): Promise<void> {
	// If we already have tokens, nothing to do.
	const creds = oAuth2Client.credentials;
	if (creds.refresh_token || creds.access_token) return;

	// First-time auth: spin up a loopback server on a random port
	const clientJson = await loadClientJson();
	if (
		!clientJson?.installed?.client_id ||
		!clientJson?.installed?.client_secret
	) {
		throw new Error("Client JSON malformed or missing");
	}
	const { client_id, client_secret } = clientJson.installed;

	const server = http.createServer();
	const port: number = await new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			resolve(typeof addr === "object" && addr ? (addr.port as number) : 0);
		});
	});

	const redirectUri = `http://127.0.0.1:${port}`;

	// Build a temporary client that is explicitly bound to this redirect URI
	const authClient = new google.auth.OAuth2({
		clientId: client_id,
		clientSecret: client_secret,
		redirectUri, // <— bound to 127.0.0.1:<randomPort>
	});

	// Persist new tokens
	authClient.on("tokens", async (t) => {
		const merged = { ...(await readJson<any>(TOKEN_PATH)), ...t };
		await writeJson(TOKEN_PATH, merged);
	});

	const state = Math.random().toString(36).slice(2);

	// Do NOT pass { redirectUri: ... } here — the library expects `redirect_uri`
	// and we already set the client’s redirectUri above.
	const authUrl = authClient.generateAuthUrl({
		access_type: "offline",
		scope: YT_SCOPES,
		prompt: "consent",
		state,
	});

	await shell.openExternal(authUrl);

	const code: string = await new Promise((resolve, reject) => {
		server.on("request", (req, res) => {
			try {
				const u = new URL(req.url || "", redirectUri);
				if (u.pathname === "/" && u.searchParams.has("code")) {
					if (u.searchParams.get("state") !== state)
						throw new Error("OAuth State Mismatch");
					const code = u.searchParams.get("code")!;
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<b>Login complete.</b> You can close this window now.");
					resolve(code);
				} else {
					res.writeHead(404);
					res.end();
				}
			} catch (e) {
				reject(e);
			} finally {
				server.close();
			}
		});
	});

	// Exchange code using *the same client* (same redirectUri)
	const { tokens } = await authClient.getToken(code);
	await writeJson(TOKEN_PATH, tokens);

	// Copy credentials onto your original client instance so the rest of your code keeps working
	oAuth2Client.setCredentials(tokens);
}

async function getYoutubeClient() {
	const auth = await createOAuthClient();
	await ensureAuthorized(auth);
	return google.youtube({ version: "v3", auth });
}

ipcMain.handle("google.signIn", async () => {
	const auth = await createOAuthClient();
	await ensureAuthorized(auth);
	return true;
});

ipcMain.handle("google.profile", async (): Promise<OAuthProfile | null> => {
	try {
		const yt = await getYoutubeClient();
		const res = await yt.channels.list({
			part: ["snippet"],
			mine: true,
		});
		const s = res.data.items?.[0]?.snippet;
		return s
			? {
					name: s.title || "No title",
					picture: s.thumbnails?.default?.url || "",
				}
			: null;
	} catch (e) {
		return null;
	}
});

ipcMain.handle("google.signOut", async () => {
	try {
		await fs.rm(TOKEN_PATH, { force: true });
	} catch (e) {
		return false;
	}
	return true;
});

ipcMain.handle(
	"youtube.listLikesPage",
	async (_evt, pageToken?: string): Promise<LikesPage> => {
		const yt = await getYoutubeClient();

		// Approach A: videos.list myRating=like (fast, direct)
		const resp = await yt.videos.list({
			part: ["snippet", "contentDetails"],
			myRating: "like",
			maxResults: 50,
			pageToken,
		});

		const items = (resp.data.items ?? []).map(normalize);
		return {
			items,
			nextPageToken: resp.data.nextPageToken ?? undefined,
			totalFetched: items.length,
		};
	},
);

ipcMain.handle("export.json", async (_evt, payload: unknown) => {
	const { canceled, filePath } = await dialog.showSaveDialog({
		title: "Save JSON Export",
		defaultPath: "liked-videos.json",
		filters: [{ name: "JSON", extensions: ["json"] }],
	});
	if (canceled || !filePath) {
		return false;
	}
	await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
	return true;
});

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 720,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	mainWindow.once("ready-to-show", () => mainWindow?.show());

	if (isDev && process.env.VITE_DEV_SERVER_URL) {
		console.log("Loading dev server URL", process.env.VITE_DEV_SERVER_URL);
		await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWindow.webContents.openDevTools();
	} else {
		const indexHtml = path.join(__dirname, "../renderer/index.html");
		await mainWindow.loadFile(indexHtml);
	}

	// Open external links in default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});
}

// Example: hook up a trivial ping IPC so we know wiring works
ipcMain.handle("ping", async () => {
	return "pong";
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
