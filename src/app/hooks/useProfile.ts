import { useCallback, useEffect, useState } from "react";
import type { OAuthProfile } from "@/config/google";
import { toaster } from "@/components/ui/toaster";

export function useProfile() {
	const [profile, setProfile] = useState<OAuthProfile | null>(null);
	const isAuthed = !!profile;

	useEffect(() => {
		// Try to fetch profile silently if tokens exist
		(async () => {
			const p = await window.bridge.googleProfile();
			if (p) setProfile(p);
		})();
	}, []);

	const signIn = useCallback(async () => {
		try {
			const ok = await window.bridge.googleSignIn();
			if (ok) {
				const p = await window.bridge.googleProfile();
				setProfile(p);
				toaster.create({ title: "Signed in", type: "success" });
			}
		} catch (e: any) {
			toaster.create({
				title: "Sign-in failed",
				description: e?.message ?? String(e),
				type: "error",
			});
		}
	}, []);

	const signOut = useCallback(async () => {
		await window.bridge.googleSignOut();
		setProfile(null);
		toaster.create({ title: "Signed out", type: "info" });
	}, []);

	return { profile, isAuthed, signIn, signOut };
}
