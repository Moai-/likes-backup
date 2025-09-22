import { SimpleGrid } from "@chakra-ui/react";
import type { NormalizedVideo } from "@/config/google";
import { VideoCard } from "./videoCard";

type Props = {
	items: NormalizedVideo[];
};

export function VideoGrid({ items }: Props) {
	return (
		<SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
			{items.map((v) => (
				<VideoCard key={v.id} video={v} />
			))}
		</SimpleGrid>
	);
}
