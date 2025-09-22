export const YT_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

export type OAuthProfile = {
	email?: string;
	name?: string;
	picture?: string;
};

export type NormalizedVideo = {
	id: string; // videoId
	title: string;
	channelTitle?: string;
	duration?: string; // ISO 8601
	publishedAt?: string;
	thumbnailUrl?: string; // best available
	dateLogged: string; // when we saved locally
};

export type LikesPage = {
	items: NormalizedVideo[];
	nextPageToken?: string;
	totalFetched: number;
};
