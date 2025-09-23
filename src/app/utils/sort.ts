import type { NormalizedVideo } from "@/config/google";

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
