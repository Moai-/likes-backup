import { Button, Card, CardBody, Image, Stack, Text } from "@chakra-ui/react";
import type { NormalizedVideo } from "@/config/google";
import React from "react";

type Props = { video: NormalizedVideo };

function waybackListUrl(videoId: string) {
	// All snapshots list:
	// return `https://web.archive.org/web/*/https://www.youtube.com/watch?v=${videoId}`;
	// Or jump to closest snapshot automatically:
	return `https://web.archive.org/web/2id_/https://www.youtube.com/watch?v=${videoId}`;
}

export const VideoCard = React.memo(({ video }: Props) => {
	const localFileName = video.thumbnailLocalPath
		? video.thumbnailLocalPath
				.split(/[\\/]/)
				.pop() // basename
		: undefined;
	const src = localFileName
		? `thumb://cache/${localFileName}`
		: (video.thumbnailUrl ?? undefined);

	const openYoutube = () => {
		if (video.id) {
			window.bridge.openExternal(`https://www.youtube.com/watch?v=${video.id}`);
		}
	};

	const openWayback = (e: React.MouseEvent) => {
		e.stopPropagation(); // don’t trigger the thumbnail’s click
		if (video.id) window.bridge.openExternal(waybackListUrl(video.id));
	};

	let isUnavailable = false;

	const title = (() => {
		isUnavailable = true;
		if (video.title === "Deleted video") return `Deleted: ${video.id}`;
		if (video.title === "Private video") return `Private: ${video.id}`;
		isUnavailable = false;
		return video.title;
	})();

	return (
		<Card.Root overflow="hidden" position="relative">
			{src && (
				<Image
					src={src}
					alt={title}
					loading="lazy"
					aspectRatio={16 / 9}
					cursor="pointer"
					onClick={openYoutube}
				/>
			)}
			<CardBody>
				<Stack gap={1}>
					{isUnavailable && (
						<Button
							size="xs"
							variant="solid"
							colorPalette="red"
							onClick={openWayback}
						>
							Missing
						</Button>
					)}
					<Text fontWeight="semibold">{title}</Text>
					<Text fontSize="sm" color="gray.500">
						{video.channelTitle ?? "Unknown channel"}
					</Text>
				</Stack>
			</CardBody>
		</Card.Root>
	);
});
