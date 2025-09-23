import type { OAuthProfile, LikesPage, NormalizedVideo } from "@/config/google";
import { ipcMain, dialog, shell } from "electron";
import {
	createOAuthClient,
	ensureAuthorized,
	getYoutubeClient,
	TOKEN_PATH,
} from "./oauth";
import fs from "node:fs/promises";
import { cacheOneThumbnail } from "./thumbs";

ipcMain.handle("open.external", async (_evt, url: string) => {
	await shell.openExternal(url);
})

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

		// 1) Get items from the Liked playlist (LL)
		const pli = await yt.playlistItems.list({
			part: ["snippet", "contentDetails"],
			playlistId: "LL",
			maxResults: 50,
			pageToken,
		});

		const itemsPI = pli.data.items ?? [];
		const nextPageToken = pli.data.nextPageToken ?? undefined;

		// Collect videoIds + likedAt from playlistItems
		const ids = itemsPI
			.map((it) => it.contentDetails?.videoId)
			.filter((x): x is string => !!x);

		// 2) Enrich with videos.list for duration, better thumbs, publish date
		let byId = new Map<string, any>();
		if (ids.length) {
			const vres = await yt.videos.list({
				part: ["snippet", "contentDetails"],
				id: ids,
				maxResults: 50,
			});
			for (const v of vres.data.items ?? []) {
				if (v.id) byId.set(v.id, v);
			}
		}

		// 3) Normalize
		const pickBestThumb = (s: any) => {
			const t = s?.thumbnails ?? {};
			return (
				t.maxres?.url ||
				t.standard?.url ||
				t.high?.url ||
				t.medium?.url ||
				t.default?.url
			);
		};

		const normalized = itemsPI.map((pi) => {
			const vid = pi.contentDetails?.videoId!;
			const likedAt = pi.snippet?.publishedAt || undefined; // when added to Liked (you liked it)
			const v = byId.get(vid); // may be missing if unavailable/removed
			const s = v?.snippet ?? pi.snippet ?? {};
			const c = v?.contentDetails ?? {};

			const n: NormalizedVideo = {
				id: vid,
				title: s.title ?? "Unknown title",
				channelTitle: s.channelTitle,
				duration: c.duration,
				publishedAt: s.publishedAt, // original publish date (if available)
				likedAt, // << NEW
				thumbnailUrl: pickBestThumb(s),
				dateLogged: new Date().toISOString(),
			};
			return n;
		});

		return {
			items: normalized,
			nextPageToken,
			totalFetched: normalized.length,
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

ipcMain.handle(
	"thumbnail.cacheMany",
	async (_evt, items: Array<{ id: string; url: string }>) => {
		const results: Record<string, string | null> = {};
		// Limit concurrency to be gentle
		const queue = items.slice();
		const workers = Math.min(6, Math.max(1, items.length));
		const runWorker = async () => {
			while (queue.length) {
				// biome-ignore lint/style/noNonNullAssertion: there will always be an item when length is non-zero
				const { id, url } = queue.shift()!;
				results[id] = await cacheOneThumbnail(id, url);
			}
		};
		await Promise.all(Array.from({ length: workers }, runWorker));
		return results; // { [id]: '/abs/path' | null }
	},
);

ipcMain.handle("youtube.checkAvailability", async (_evt, ids: string[]) => {
	const yt = await getYoutubeClient();
	const missing = new Set<string>(ids);

	// YouTube Data API allows up to 50 IDs per call
	for (let i = 0; i < ids.length; i += 50) {
		const batch = ids.slice(i, i + 50);
		const res = await yt.videos.list({
			part: ["id"],
			id: batch,
			maxResults: 50,
		});
		const returned = new Set(
			(res.data.items ?? []).map((it) => it.id).filter(Boolean),
		);
		// Items that still exist are not missing
		for (const id of batch) if (returned.has(id)) missing.delete(id);
	}
	return Array.from(missing); // video IDs that are now unavailable
});
