import Link from "next/link";
import { Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { VideoCardMenu } from "@/components/video/video-card-menu";
import { formatDuration } from "@/lib/utils";
import type { VideoDocument } from "@/lib/types";

type VideoCardProps = {
  video: VideoDocument;
};

export function VideoCard({ video }: VideoCardProps) {
  const getStatusIcon = () => {
    const status = video.processingStatus || "pending";
    const iconProps = "h-4 w-4";
    
    switch (status) {
      case "completed":
        return <CheckCircle2 className={`${iconProps} text-green-600`} />;
      case "processing":
        return <Loader2 className={`${iconProps} text-blue-600 animate-spin`} />;
      case "failed":
        return <AlertCircle className={`${iconProps} text-red-600`} />;
      default:
        return <Clock className={`${iconProps} text-amber-600`} />;
    }
  };

  const getStatusColor = () => {
    const status = video.processingStatus || "pending";
    switch (status) {
      case "completed":
        return "bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "processing":
        return "bg-blue-100/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "failed":
        return "bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    }
  };

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
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Thumbnail unavailable
            </div>
          )}
          
          {/* Duration and Status Badge */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="rounded-lg border border-white/40 bg-black/60 px-2 py-1 text-xs text-stone-100">
              {formatDuration(video.duration)}
            </span>
            <div
              onClick={(e) => e.preventDefault()}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${getStatusColor()}`}
            >
              {getStatusIcon()}
              <span className="capitalize">{video.processingStatus || "pending"}</span>
            </div>
          </div>

          {/* Action Menu */}
          <div
            onClick={(e) => e.preventDefault()}
            className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100"
          >
            <VideoCardMenu video={video} />
          </div>
        </div>
        
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-slate-900">{video.title}</h3>
          <p className="line-clamp-2 text-sm text-slate-600">{video.description || "No description"}</p>
        </div>
      </Card>
    </Link>
  );
}
