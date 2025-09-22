import {
	Box,
	Button,
	Card,
	CardBody,
	HStack,
	Input,
	Spinner,
	Text,
} from "@chakra-ui/react";

type Props = {
	isAuthed: boolean;
	isSyncing: boolean;
	totalCount: number;
	query: string;
	onQuery: (v: string) => void;
	onSync: () => void;
	onExport: () => void;
};

export function ControlsBar({
	isAuthed,
	isSyncing,
	totalCount,
	query,
	onQuery,
	onSync,
	onExport,
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
