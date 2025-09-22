import { useCallback, useEffect, useMemo, useState } from "react";
import type { NormalizedVideo } from "@/config/google";
import { db } from "@/config/db";
import { toaster } from "@/components/ui/toaster";
import { sortByDateLoggedDesc } from "@/app/utils/sort";

export function useLikes() {
	const [items, setItems] = useState<NormalizedVideo[]>([]);
	const [count, setCount] = useState(0);
	const [query, setQuery] = useState("");
	const [isSyncing, setSyncing] = useState(false);

	// Initial load
	useEffect(() => {
		(async () => {
			const all = await db.videos.toArray();
			setItems(all.sort(sortByDateLoggedDesc));
			setCount(all.length);
		})();
	}, []);

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
			setItems(all.sort(sortByDateLoggedDesc));
			setCount(all.length);

			toaster.create({ title: `Synced ${fetched} items`, type: "success" });
		} catch (e) {
			toaster.create({
				title: "Sync failed",
				description: e instanceof Error ? e.message : String(e),
				type: "error",
			});
		} finally {
			setSyncing(false);
		}
	}, []);

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
		filtered,
		// actions
		syncLikes,
		exportJson,
		// ui state
		isSyncing,
	};
}
