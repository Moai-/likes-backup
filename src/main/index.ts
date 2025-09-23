import { app, BrowserWindow, shell, protocol } from "electron";
import { URL } from "node:url";
import { createReadStream } from "node:fs";
import path from "node:path";
import "./api";
import { THUMB_DIR } from "./thumbs";

const __dirname = path.dirname(__filename);
const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
	{
		scheme: "thumb",
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			corsEnabled: true,
			stream: true,
		},
	},
]);

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

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
	protocol.handle("thumb", async (request) => {
		const u = new URL(request.url);
		const fileName = decodeURIComponent(u.pathname.replace(/^\/+/, ""))
		const fullPath = path.join(THUMB_DIR, fileName);
		return new Response(createReadStream(fullPath) as any);
	});
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
