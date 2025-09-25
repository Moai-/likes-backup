export const YT_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

export type OAuthProfile = {
	email?: string;
	name?: string;
	picture?: string;
};

export type NormalizedVideo = {
	id: string; // videoId
	title: string;
	titleLC: string;
	channelTitle?: string;
	channelLC: string;
	duration?: string; // ISO 8601
	publishedAt?: string;
	likedAt?: string;
	likedAtTS?: number;
	thumbnailUrl?: string; // best available
	dateLogged: string; // when we saved locally
	dateLoggedTS?: number;
	thumbnailLocalPath?: string; // absolute path to cached file
};

export type LikesPage = {
	items: NormalizedVideo[];
	nextPageToken?: string;
	totalFetched: number;
};
