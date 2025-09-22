import { app, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import { google } from "googleapis";
import { YT_SCOPES, type NormalizedVideo } from "@/config/google";
import type { OAuth2Client } from "google-auth-library";

export const TOKEN_PATH = path.join(
	app.getPath("userData"),
	"google-oauth.json",
);

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

export function normalize(v: any): NormalizedVideo {
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

export async function createOAuthClient(): Promise<OAuth2Client> {
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

export async function ensureAuthorized(
	oAuth2Client: OAuth2Client,
): Promise<void> {
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

export async function getYoutubeClient() {
	const auth = await createOAuthClient();
	await ensureAuthorized(auth);
	return google.youtube({ version: "v3", auth });
}
