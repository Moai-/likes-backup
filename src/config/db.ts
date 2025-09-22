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

		this.version(2)
			.stores({
				videos:
					"id, title, channelTitle, dateLogged, isMissing, thumbnailLocalPath",
			})
			.upgrade(async (tx) => {
				tx.table("videos")
					.toCollection()
					.modify((v: any) => {
						if (typeof v.isMissing === "undefined") v.isMissing = false;
						if (typeof v.thumbnailLocalPath === "undefined")
							v.thumbnailLocalPath = undefined;
					});
			});
	}
}

export const db = new YTDB();
