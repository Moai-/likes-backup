import Dexie, { type Table } from "dexie";
import type { NormalizedVideo } from "@/config/google";

export interface LikedVideo extends NormalizedVideo {}

class YTDB extends Dexie {
	videos!: Table<LikedVideo, string>;
	constructor() {
		super("yt-liked-db");
		this.version(1).stores({
			videos: "id, title, channelTitle, dateLogged",
		});
	}
}

export const db = new YTDB();
