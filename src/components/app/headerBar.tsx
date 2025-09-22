import { HStack, Heading, Image, Button, Text } from "@chakra-ui/react";
import type { OAuthProfile } from "@/config/google";

type Props = {
	profile: OAuthProfile | null;
	onSignIn: () => void;
	onSignOut: () => void;
};

export function HeaderBar({ profile, onSignIn, onSignOut }: Props) {
	return (
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
						<Button variant="outline" onClick={onSignOut}>
							Sign out
						</Button>
					</>
				) : (
					<Button onClick={onSignIn}>Connect Google</Button>
				)}
			</HStack>
		</HStack>
	);
}
