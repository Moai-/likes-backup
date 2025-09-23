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
		? `thumb://cache/${localFileName}`
		: (video.thumbnailUrl ?? undefined);

	const handleClick = () => {
		if (video.id) {
			window.bridge.openExternal(`https://www.youtube.com/watch?v=${video.id}`);
		}
	}

	const title = video.title === "Deleted video"
		? `Deleted: ${video.id}`
		: video.title;
		
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
			{src && <Image src={src} alt={title} aspectRatio={16 / 9} cursor="pointer" onClick={handleClick} />}
			<CardBody>
				<Stack gap={1}>
					<Text fontWeight="semibold">{title}</Text>
					<Text fontSize="sm" color="gray.500">
						{video.channelTitle ?? "Unknown channel"}
					</Text>
				</Stack>
			</CardBody>
		</Card.Root>
	);
}
