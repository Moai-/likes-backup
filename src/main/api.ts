import type { OAuthProfile, LikesPage } from "@/config/google";
import { ipcMain, dialog } from "electron";
import {
	createOAuthClient,
	ensureAuthorized,
	getYoutubeClient,
	normalize,
	TOKEN_PATH,
} from "./oauth";
import fs from "node:fs/promises";

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
