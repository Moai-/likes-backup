import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	Box,
	Button,
	Card,
	CardBody,
	Container,
	HStack,
	Heading,
	Image,
	Input,
	SimpleGrid,
	Spinner,
	Stack,
	Text,
} from "@chakra-ui/react";
import type { LikesPage, NormalizedVideo, OAuthProfile } from "@/config/google";
import { db } from "@/config/db";
import { toaster } from "@/components/ui/toaster";

// Types from preload
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

export function App() {
	const [profile, setProfile] = useState<OAuthProfile | null>(null);
	const [isSyncing, setSyncing] = useState(false);
	const [query, setQuery] = useState("");
	const [count, setCount] = useState(0);
	const [items, setItems] = useState<NormalizedVideo[]>([]);
	const filtered = useMemo(() => {
		if (!query) return items;
		const q = query.toLowerCase();
		return items.filter(
			(v) =>
				v.title.toLowerCase().includes(q) ||
				(v.channelTitle ?? "").toLowerCase().includes(q),
		);
	}, [items, query]);

	useEffect(() => {
		(async () => {
			// show count & initial cache
			const all = await db.videos.toArray();
			setItems(
				all.sort((a, b) =>
					(b.dateLogged || "").localeCompare(a.dateLogged || ""),
				),
			);
			setCount(all.length);
			// try fetch profile silently (if tokens exist)
			const p = await window.bridge.googleProfile();
			if (p) setProfile(p);
		})();
	}, []);

	const handleSignIn = async () => {
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
	};

	const handleSignOut = async () => {
		await window.bridge.googleSignOut();
		setProfile(null);
		toaster.create({ title: "Signed out", type: "info" });
	};

	const handleSync = async () => {
		setSyncing(true);
		let fetched = 0;
		let pageToken: string | undefined;
		try {
			do {
				const page = await window.bridge.listLikesPage(pageToken);
				pageToken = page.nextPageToken;
				fetched += page.totalFetched;

				// Upsert into Dexie; avoid duplicates by id
				await db.transaction("rw", db.videos, async () => {
					for (const v of page.items) {
						const existing = await db.videos.get(v.id);
						if (!existing) await db.videos.put(v); // keep first-seen (with original title)
					}
				});
			} while (pageToken);

			const all = await db.videos.toArray();
			setItems(
				all.sort((a, b) =>
					(b.dateLogged || "").localeCompare(a.dateLogged || ""),
				),
			);
			setCount(all.length);

			toaster.create({ title: `Synced ${fetched} items`, type: "success" });
		} catch (e: any) {
			toaster.create({
				title: "Sync failed",
				description: e?.message ?? String(e),
				type: "error",
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleExport = async () => {
		const data = await db.videos.toArray();
		const ok = await window.bridge.exportJson(data);
		if (ok) toaster.create({ title: "Exported JSON", type: "success" });
	};

	return (
		<Container maxW="7xl" py={6}>
			<Stack gap={4}>
				<HStack justify="space-between">
					<Heading size="lg">YouTube Liked Backup</Heading>
					<HStack>
						{profile ? (
							<>
								{profile.picture && (
									<Image
										src={profile.picture}
										alt="avatar"
										boxSize="32px"
										borderRadius="full"
									/>
								)}
								<Text>{profile.name ?? "Signed in"}</Text>
								<Button variant="outline" onClick={handleSignOut}>
									Sign out
								</Button>
							</>
						) : (
							<Button onClick={handleSignIn}>Connect Google</Button>
						)}
					</HStack>
				</HStack>

				<Card.Root>
					<CardBody>
						<HStack gap={3} flexWrap="wrap">
							<Button onClick={handleSync} disabled={!profile || isSyncing}>
								{isSyncing ? <Spinner size="sm" mr={2} /> : null}
								Sync Likes
							</Button>
							<Button onClick={handleExport} disabled={count === 0}>
								Export JSON
							</Button>
							<Text color="gray.500">
								Saved: {count.toLocaleString()} items
							</Text>
							<Box flex="1" />
							<Input
								placeholder="Search title or channel…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								maxW="360px"
							/>
						</HStack>
					</CardBody>
				</Card.Root>

				<SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
					{filtered.map((v) => (
						<Card.Root key={v.id} overflow="hidden">
							{v.thumbnailUrl && (
								<Image
									src={v.thumbnailUrl}
									alt={v.title}
									aspectRatio={(16 / 9) as any}
								/>
							)}
							<CardBody>
								<Stack gap={1}>
									<Text fontWeight="semibold">{v.title}</Text>
									<Text fontSize="sm" color="gray.500">
										{v.channelTitle ?? "Unknown channel"}
									</Text>
								</Stack>
							</CardBody>
						</Card.Root>
					))}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}
