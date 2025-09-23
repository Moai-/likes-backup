import { contextBridge, ipcRenderer } from "electron";
import type { LikesPage, OAuthProfile } from "./google";

const api = {
	googleSignIn: () => ipcRenderer.invoke("google.signIn") as Promise<boolean>,
	googleProfile: () =>
		ipcRenderer.invoke("google.profile") as Promise<OAuthProfile | null>,
	googleSignOut: () => ipcRenderer.invoke("google.signOut") as Promise<boolean>,

	listLikesPage: (pageToken?: string) =>
		ipcRenderer.invoke(
			"youtube.listLikesPage",
			pageToken,
		) as Promise<LikesPage>,
	exportJson: (payload: unknown) =>
		ipcRenderer.invoke("export.json", payload) as Promise<boolean>,

	cacheThumbnails: (items: Array<{ id: string; url: string }>) =>
		ipcRenderer.invoke("thumbnail.cacheMany", items) as Promise<
			Record<string, string | null>
		>,
	checkAvailability: (ids: string[]) =>
		ipcRenderer.invoke("youtube.checkAvailability", ids) as Promise<string[]>,

	openExternal: (url: string) => ipcRenderer.invoke("open.external", url) as Promise<void>,
};

contextBridge.exposeInMainWorld("bridge", api);

export type PreloadApi = typeof api;
