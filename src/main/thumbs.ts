import { app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

export const THUMB_DIR = path.join(app.getPath("userData"), "thumbs");

function fileSafeExtFromContentType(ct?: string | null) {
	if (!ct) return ".jpg";
	if (ct.includes("png")) return ".png";
	if (ct.includes("webp")) return ".webp";
	if (ct.includes("jpeg")) return ".jpg";
	if (ct.includes("gif")) return ".gif";
	return ".jpg";
}

async function ensureThumbDir() {
	await fs.mkdir(THUMB_DIR, { recursive: true });
}

export async function cacheOneThumbnail(
	id: string,
	url: string,
): Promise<string | null> {
	try {
		await ensureThumbDir();
		// fetch head-ish: just fetch and check content-type
		const resp = await fetch(url, { redirect: "follow" });
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		const ct = resp.headers.get("content-type");
		const ext = fileSafeExtFromContentType(ct);
		const filePath = path.join(THUMB_DIR, `${id}${ext}`);

		const ab = await resp.arrayBuffer();
		await fs.writeFile(filePath, Buffer.from(ab));

		return filePath; // absolute path; renderer will prefix with file://
	} catch {
		return null;
	}
}
