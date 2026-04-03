"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";

import { VideoPlayer } from "@/components/video/video-player";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { apiRequest } from "@/lib/client/api";
import type { VideoDocument } from "@/lib/types";

export default function SharePage() {
  const { token } = useParams() as { token: string };
  const [video, setVideo] = useState<VideoDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedVideo = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<{
          video: VideoDocument;
        }>(`/api/share/${token}`, { cache: "no-store" });
        setVideo(data.video);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("410")) {
            setError("This share link has expired");
          } else {
            setError("Failed to load shared video");
          }
        } else {
          setError("Failed to load shared video");
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      void fetchSharedVideo();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md border-red-300/60 bg-red-50/30">
          <div className="p-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Error</h1>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Video not found</p>
      </div>
    );
  }

  const streamUrl = `/api/stream/${video.$id}?share=${token}`;
  const subtitleUrl = video.subtitleFileId
    ? `/api/subtitles/${video.$id}?share=${token}`
    : undefined;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <Logo href="/" size="sm" textClassName="text-white" />
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{video.title}</h1>
          {video.description && (
            <p className="text-slate-300 text-sm">{video.description}</p>
          )}
        </div>

        <VideoPlayer
          videoId={video.$id}
          streamUrl={streamUrl}
          subtitleUrl={subtitleUrl}
        />

        <Card className="mt-6 border-stone-300/60 dark:border-slate-700/60 p-4">
          <h2 className="text-lg font-semibold mb-2">Video Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 dark:text-slate-400">Duration</p>
              <p className="font-medium">{Math.floor(video.duration)}s</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">File Size</p>
              <p className="font-medium">
                {(video.size / 1024 / 1024).toFixed(2)}MB
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
