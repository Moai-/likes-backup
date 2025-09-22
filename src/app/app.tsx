import { Container, Stack } from "@chakra-ui/react";
import { useProfile } from "./hooks/useProfile";
import { useLikes } from "./hooks/useLikes";
import { ControlsBar, HeaderBar, VideoGrid } from "@/components/app";

export function App() {
	const { profile, isAuthed, signIn, signOut } = useProfile();
	const { count, query, setQuery, filtered, syncLikes, exportJson, isSyncing } =
		useLikes();

	return (
		<Container maxW="7xl" py={6}>
			<Stack gap={4}>
				<HeaderBar profile={profile} onSignIn={signIn} onSignOut={signOut} />
				<ControlsBar
					isAuthed={isAuthed}
					isSyncing={isSyncing}
					totalCount={count}
					query={query}
					onQuery={setQuery}
					onSync={syncLikes}
					onExport={exportJson}
				/>
				<VideoGrid items={filtered} />
			</Stack>
		</Container>
	);
}
