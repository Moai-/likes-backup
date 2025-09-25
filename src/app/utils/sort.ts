/** biome-ignore-all lint/style/noNonNullAssertion: Query always available */
import type { NormalizedVideo } from "@/config/google";
import { db } from "@/config/db";

export function sortByDateLoggedDesc(a: NormalizedVideo, b: NormalizedVideo) {
	return (b.dateLogged || "").localeCompare(a.dateLogged || "");
}

export type SortMode =
	| "liked-desc"
	| "liked-asc"
	| "logged-desc"
	| "title-asc"
	| "channel-asc";

function cmpStr(a?: string, b?: string) {
	return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

export function sortItems(items: NormalizedVideo[], mode: SortMode) {
	const copy = items.slice();
	switch (mode) {
		case "liked-desc":
			return copy.sort((a, b) =>
				(b.likedAt ?? "").localeCompare(a.likedAt ?? ""),
			);
		case "liked-asc":
			return copy.sort((a, b) =>
				(a.likedAt ?? "").localeCompare(b.likedAt ?? ""),
			);
		case "logged-desc":
			return copy.sort((a, b) =>
				(b.dateLogged ?? "").localeCompare(a.dateLogged ?? ""),
			);
		case "title-asc":
			return copy.sort((a, b) => cmpStr(a.title, b.title));
		case "channel-asc":
			return copy.sort((a, b) => cmpStr(a.channelTitle, b.channelTitle));
		default:
			return copy;
	}
}

export async function loadSorted(mode: SortMode, q?: string) {
	const hasQ = !!q && q.trim().length > 0;
	const query = (s: string) => s.toLowerCase();

	console.log("query", hasQ, query(q!), mode);

	switch (mode) {
		case "liked-desc":
			return hasQ
				? (
						await db.videos
							.where("titleLC")
							.startsWithIgnoreCase(query(q!))
							.toArray()
					)
						.concat(
							await db.videos
								.where("channelLC")
								.startsWithIgnoreCase(query(q!))
								.toArray(),
						)
						.sort((a, b) => (b.likedAtTS ?? 0) - (a.likedAtTS ?? 0))
				: db.videos.orderBy("likedAtTS").reverse().toArray();

		case "liked-asc":
			return hasQ
				? (
						await db.videos
							.where("titleLC")
							.startsWithIgnoreCase(query(q!))
							.toArray()
					)
						.concat(
							await db.videos
								.where("channelLC")
								.startsWithIgnoreCase(query(q!))
								.toArray(),
						)
						.sort((a, b) => (a.likedAtTS ?? 0) - (b.likedAtTS ?? 0))
				: db.videos.orderBy("likedAtTS").toArray();

		case "logged-desc":
			return hasQ
				? (
						await db.videos
							.where("titleLC")
							.startsWithIgnoreCase(query(q!))
							.toArray()
					)
						.concat(
							await db.videos
								.where("channelLC")
								.startsWithIgnoreCase(query(q!))
								.toArray(),
						)
						.sort((a, b) => (b.dateLoggedTS ?? 0) - (a.dateLoggedTS ?? 0))
				: db.videos.orderBy("dateLoggedTS").reverse().toArray();

		case "title-asc":
			return hasQ
				? db.videos.where("titleLC").startsWithIgnoreCase(query(q!)).toArray()
				: db.videos.orderBy("titleLC").toArray();

		case "channel-asc":
			return hasQ
				? db.videos.where("channelLC").startsWithIgnoreCase(query(q!)).toArray()
				: db.videos.orderBy("channelLC").toArray();
	}
}
