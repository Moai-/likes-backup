import { SortMode } from "@/app/utils/sort";
import {
	Box,
	Button,
	Card,
	CardBody,
	HStack,
	Input,
	Select,
	Spinner,
	Text,
	createListCollection,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Props = {
	isAuthed: boolean;
	isSyncing: boolean;
	totalCount: number;
	query: string;
	sortMode:
		| "liked-desc"
		| "liked-asc"
		| "logged-desc"
		| "title-asc"
		| "channel-asc";
	onSortMode: (m: Props["sortMode"]) => void;
	onQuery: (v: string) => void;
	onSync: () => void;
	onExport: () => void;
	onCacheThumbs: () => void;
};

const sortOptions = createListCollection({
	items: [
		{ label: "Title - Asc", value: "title-asc" },
		{ label: "Liked - Asc", value: "liked-asc" },
		{ label: "Liked - Desc", value: "liked-desc" },
		{ label: "Logged - Desc", value: "logged-desc" },
		{ label: "Channel - Asc", value: "channel-asc" },
	],
});

export function ControlsBar({
	isAuthed,
	isSyncing,
	totalCount,
	sortMode,
	onSortMode,
	onQuery,
	onSync,
	onExport,
	onCacheThumbs,
}: Props) {
	const [rawQuery, setRawQuery] = useState("");
	useEffect(() => {
		const t = setTimeout(() => onQuery(rawQuery), 250);
		return () => clearTimeout(t);
	}, [rawQuery, onQuery]);
	return (
		<Card.Root>
			<CardBody>
				<HStack gap={3} flexWrap="wrap">
					<Button onClick={onSync} disabled={!isAuthed || isSyncing}>
						{isSyncing ? <Spinner size="sm" mr={2} /> : null}
						Sync Likes
					</Button>
					<Button onClick={onExport} disabled={totalCount === 0}>
						Export JSON
					</Button>
					<Button onClick={onCacheThumbs} disabled={totalCount === 0}>
						Cache thumbnails
					</Button>
				</HStack>
				<HStack gap={3} flexWrap="wrap" mt={3}>
					<Select.Root
						multiple={false}
						collection={sortOptions}
						value={[sortMode]}
						onValueChange={(details) =>
							onSortMode(details.value[0] as SortMode)
						}
						maxW="220px"
					>
						<Select.HiddenSelect />
						<Select.Control>
							<Select.Trigger>
								<Select.ValueText placeholder="Sort by..." />
							</Select.Trigger>
							<Select.IndicatorGroup>
								<Select.Indicator />
							</Select.IndicatorGroup>
						</Select.Control>
						<Select.Positioner>
							<Select.Content>
								{sortOptions.items.map((sortOption) => (
									<Select.Item item={sortOption} key={sortOption.value}>
										{sortOption.label}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Positioner>
					</Select.Root>
					<Text color="gray.500">
						Saved: {totalCount.toLocaleString()} items
					</Text>
					<Box flex="1" />
					<Input
						placeholder="Search title or channel…"
						value={rawQuery}
						onChange={(e) => setRawQuery(e.target.value)}
						maxW="360px"
					/>
				</HStack>
			</CardBody>
		</Card.Root>
	);
}
