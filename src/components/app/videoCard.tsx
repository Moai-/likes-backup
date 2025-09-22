import { Badge, Card, CardBody, Image, Stack, Text } from "@chakra-ui/react";
import type { NormalizedVideo } from "@/config/google";

type Props = { video: NormalizedVideo };

export function VideoCard({ video }: Props) {
	const localFileName = video.thumbnailLocalPath
		? video.thumbnailLocalPath
				.split(/[\\/]/)
				.pop() // basename
		: undefined;
	const src = localFileName
		? `thumb:///${localFileName}`
		: (video.thumbnailUrl ?? undefined);

	return (
		<Card.Root overflow="hidden" position="relative">
			{video.isMissing && (
				<Badge
					position="absolute"
					top="2"
					right="2"
					colorPalette="red"
					variant="solid"
				>
					Missing
				</Badge>
			)}
			{src && <Image src={src} alt={video.title} aspectRatio={16 / 9} />}
			<CardBody>
				<Stack gap={1}>
					<Text fontWeight="semibold">{video.title}</Text>
					<Text fontSize="sm" color="gray.500">
						{video.channelTitle ?? "Unknown channel"}
					</Text>
				</Stack>
			</CardBody>
		</Card.Root>
	);
}
