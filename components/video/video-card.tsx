import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { VideoDocument } from "@/lib/types";

type VideoCardProps = {
  video: VideoDocument;
};

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link href={`/video/${video.$id}`}>
      <Card className="group overflow-hidden border-zinc-800 transition hover:border-cyan-500/60 hover:shadow-[0_20px_50px_-30px_rgba(6,182,212,0.9)]">
        <div className="relative aspect-video overflow-hidden bg-zinc-900">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">Processing thumbnail...</div>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-zinc-100">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-1 font-medium text-zinc-100">{video.title}</h3>
          <p className="line-clamp-2 text-sm text-zinc-400">{video.description || "No description"}</p>
        </div>
      </Card>
    </Link>
  );
}
