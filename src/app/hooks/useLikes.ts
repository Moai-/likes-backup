import { useCallback, useEffect, useMemo, useState } from "react";
import type { NormalizedVideo } from "@/config/google";
import { db } from "@/config/db";
import { toaster } from "@/components/ui/toaster";
import { sortItems, type SortMode } from "@/app/utils/sort";

export function useLikes() {
	const [items, setItems] = useState<NormalizedVideo[]>([]);
	const [count, setCount] = useState(0);
	const [query, setQuery] = useState("");
	const [isSyncing, setSyncing] = useState(false);
	const [sortMode, setSortMode] = useState<SortMode>("liked-desc");

	const refreshFromDB = useCallback(async () => {
		const all = await db.videos.toArray();
		setItems(sortItems(all, sortMode));
		setCount(all.length);
	}, [sortMode]);

	useEffect(() => {
		(async () => {
			const all = await db.videos.toArray();
			setItems(sortItems(all, sortMode));
			setCount(all.length);
		})();
	}, [sortMode]);

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
			const all = await db.videos.toArray();
			await refreshFromDB();
			toaster.create({
				title: `Cached ${Object.values(map).filter(Boolean).length} thumbnails`,
				type: "success",
			});
		},
		[items, refreshFromDB],
	);

	const checkAvailability = useCallback(
		async (subset?: NormalizedVideo[]) => {
			const ids = (subset ?? items).map((v) => v.id);
			if (ids.length === 0) return;
			const missingIds = await window.bridge.checkAvailability(ids);
			await db.transaction("rw", db.videos, async () => {
				// mark missing true for reported, false for others
				const missingSet = new Set(missingIds);
				for (const v of ids) {
					await db.videos.update(v, { isMissing: missingSet.has(v) });
				}
			});
			const all = await db.videos.toArray();
			await refreshFromDB();
			toaster.create({
				title: `Marked ${missingIds.length} as missing`,
				type: "info",
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
						if (!existing) await db.videos.put(v); // keep first-seen (original title/thumbnail)
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
		setQuery,
		setSortMode,
		filtered,
		// actions
		syncLikes,
		exportJson,
		cacheThumbnails,
		checkAvailability,
		// ui state
		isSyncing,
	};
}
