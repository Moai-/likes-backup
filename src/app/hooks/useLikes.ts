import { useCallback, useEffect, useMemo, useState } from "react";
import type { NormalizedVideo } from "@/config/google";
import { db } from "@/config/db";
import { toaster } from "@/components/ui/toaster";
import { loadSorted, type SortMode } from "@/app/utils/sort";

export function useLikes() {
	const [items, setItems] = useState<NormalizedVideo[]>([]);
	const [count, setCount] = useState(0);
	const [query, setQuery] = useState("");
	const [isSyncing, setSyncing] = useState(false);
	const [sortMode, setSortMode] = useState<SortMode>("liked-desc");

	const refreshFromDB = useCallback(async () => {
		const list = await loadSorted(sortMode, query);
		// de-dup when merging title+channel matches
		const seen = new Set<string>();
		const unique = list.filter((v) =>
			seen.has(v.id) ? false : (seen.add(v.id), true),
		);
		setItems(unique);
		setCount(await db.videos.count());
	}, [sortMode, query]);

	useEffect(() => {
		void refreshFromDB();
	}, [refreshFromDB]);

	// Initial load
	useEffect(() => {
		(async () => {
			const all = await db.videos.toArray();
			await refreshFromDB();
			setCount(all.length);
		})();
	}, [refreshFromDB]);

	const cacheThumbnails = useCallback(
		async (subset?: NormalizedVideo[]) => {
			const list = ((Array.isArray(subset) && subset) || items)
				.filter((v) => !v.thumbnailLocalPath && v.thumbnailUrl) // not cached yet
				.map((v) => ({ id: v.id, url: v.thumbnailUrl! }));
			if (list.length === 0) {
				toaster.create({
					title: "All thumbnails already cached",
					type: "info",
				});
				return;
			}
			const map = await window.bridge.cacheThumbnails(list);
			// persist paths into Dexie
			await db.transaction("rw", db.videos, async () => {
				for (const v of list) {
					const p = map[v.id];
					if (p) await db.videos.update(v.id, { thumbnailLocalPath: p });
				}
			});
			await refreshFromDB();
			toaster.create({
				title: `Cached ${Object.values(map).filter(Boolean).length} thumbnails`,
				type: "success",
			});
		},
		[items, refreshFromDB],
	);

	const filtered = useMemo(() => {
		if (!query) return items;
		const q = query.toLowerCase();
		return items.filter(
			(v) =>
				v.title.toLowerCase().includes(q) ||
				(v.channelTitle ?? "").toLowerCase().includes(q),
		);
	}, [items, query]);

	const syncLikes = useCallback(async () => {
		setSyncing(true);
		let fetched = 0;
		let pageToken: string | undefined;

		try {
			do {
				const page = await window.bridge.listLikesPage(pageToken);
				pageToken = page.nextPageToken;
				fetched += page.totalFetched;

				// Upsert into Dexie; avoid duplicates by id
				await db.transaction("rw", db.videos, async () => {
					for (const v of page.items) {
						const existing = await db.videos.get(v.id);
						if (!existing)
							await db.videos.put({
								...v,
								titleLC: (v.title ?? "").toLowerCase(),
								channelLC: (v.channelTitle ?? "").toLowerCase(),
								likedAtTS: v.likedAt
									? Date.parse(v.likedAt) || undefined
									: undefined,
								dateLoggedTS: v.dateLogged
									? Date.parse(v.dateLogged) || undefined
									: undefined,
							}); // keep first-seen (original title/thumbnail)
					}
				});
			} while (pageToken);

			const all = await db.videos.toArray();
			await refreshFromDB();
			setCount(all.length);

			toaster.create({ title: `Synced ${fetched} items`, type: "success" });
			try {
				await cacheThumbnails();
			} catch {
				/* ignore */
			}
		} catch (e) {
			toaster.create({
				title: "Sync failed",
				description: e instanceof Error ? e.message : String(e),
				type: "error",
			});
		} finally {
			setSyncing(false);
		}
	}, [cacheThumbnails, refreshFromDB]);

	const exportJson = useCallback(async () => {
		const data = await db.videos.toArray();
		const ok = await window.bridge.exportJson(data);
		if (ok) toaster.create({ title: "Exported JSON", type: "success" });
	}, []);

	return {
		// data
		items,
		count,
		// search
		query,
		sortMode,
		setQuery,
		setSortMode,
		filtered,
		// actions
		syncLikes,
		exportJson,
		cacheThumbnails,
		// ui state
		isSyncing,
	};
}
