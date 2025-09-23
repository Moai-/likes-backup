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
	onCheckAvailability: () => void;
};

const sortOptions = createListCollection({
	items: [
		{ label: 'Title - Asc', value: 'title-asc'},
		{ label: 'Liked - Asc', value: 'liked-asc'},
		{ label: 'Liked - Desc', value: 'liked-desc'},
		{ label: 'Logged - Desc', value: 'logged-desc'},
		{ label: 'Channel - Asc', value: 'channel-asc'},

	]
});

export function ControlsBar({
	isAuthed,
	isSyncing,
	totalCount,
	query,
	sortMode,
	onSortMode,
	onQuery,
	onSync,
	onExport,
	onCacheThumbs,
	onCheckAvailability,
}: Props) {
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
					<Button
						onClick={onCheckAvailability}
						disabled={!isAuthed || totalCount === 0}
					>
						Check availability
					</Button>
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
									<Select.Item item={sortOption} key={sortOption.value}>{sortOption.label}</Select.Item>
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
						value={query}
						onChange={(e) => onQuery(e.target.value)}
						maxW="360px"
					/>
				</HStack>
			</CardBody>
		</Card.Root>
	);
}
