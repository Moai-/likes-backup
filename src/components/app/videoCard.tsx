import { Card, CardBody, Image, Stack, Text } from "@chakra-ui/react";
import type { NormalizedVideo } from "@/config/google";

type Props = {
	video: NormalizedVideo;
};

export function VideoCard({ video }: Props) {
	return (
		<Card.Root overflow="hidden">
			{video.thumbnailUrl && (
				<Image
					src={video.thumbnailUrl}
					alt={video.title}
					aspectRatio={16 / 9}
				/>
			)}
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
