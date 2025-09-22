import type { LikesPage, OAuthProfile } from "@/config/google";

// connects to api inside preload.ts
declare global {
	interface Window {
		bridge: {
			googleSignIn(): Promise<boolean>;
			googleProfile(): Promise<OAuthProfile | null>;
			googleSignOut(): Promise<boolean>;
			listLikesPage(pageToken?: string): Promise<LikesPage>;
			exportJson(payload: unknown): Promise<boolean>;
			ping(): Promise<string>;
		};
	}
}
