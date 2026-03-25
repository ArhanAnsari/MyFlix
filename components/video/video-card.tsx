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
      <Card className="group overflow-hidden border-stone-300/90 transition hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-[0_30px_40px_-30px_rgba(23,32,51,0.7)]">
        <div className="relative aspect-video overflow-hidden bg-stone-200">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/videos/${video.$id}/thumbnail`}
              alt={video.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Processing thumbnail...</div>
          )}
          <span className="absolute bottom-2 right-2 rounded-lg border border-white/40 bg-black/60 px-2 py-1 text-xs text-stone-100">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-slate-900">{video.title}</h3>
          <p className="line-clamp-2 text-sm text-slate-600">{video.description || "No description"}</p>
        </div>
      </Card>
    </Link>
  );
}
