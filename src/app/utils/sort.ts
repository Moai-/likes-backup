import type { NormalizedVideo } from "@/config/google";

export function sortByDateLoggedDesc(a: NormalizedVideo, b: NormalizedVideo) {
	return (b.dateLogged || "").localeCompare(a.dateLogged || "");
}
