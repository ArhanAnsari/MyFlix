"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/video-player";
import { VideoActions } from "@/components/video/video-actions";
import { apiRequest } from "@/lib/client/api";
import type { VideoDocument } from "@/lib/types";

export default function VideoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest<{ video: VideoDocument }>(`/api/videos/${params.id}`, {
          cache: "no-store",
          onUnauthorized: () => router.replace("/login"),
        });
        setVideo(data.video);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  const manifestUrl = useMemo(() => {
    if (!video?.hlsFileId) return "";
    return `/api/stream/${video.$id}/manifest`;
  }, [video?.hlsFileId, video?.$id]);

  const subtitleUrl = useMemo(() => {
    if (!video?.subtitleFileId) return "";
    return `/api/subtitles/${video.$id}`;
  }, [video?.subtitleFileId, video?.$id]);

  const deleteVideo = async () => {
    const confirmed = window.confirm("Delete this video permanently?");
    if (!confirmed) return;

    try {
      await apiRequest(`/api/videos/${params.id}`, {
        method: "DELETE",
        onUnauthorized: () => router.replace("/login"),
      });
      router.replace("/dashboard");
    } catch {
      // Keep user on page when deletion fails.
    }
  };

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-600">Loading video...</p>
      </AppShell>
    );
  }

  if (!video) {
    return (
      <AppShell>
        <p className="text-sm text-slate-600">Video not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Card className="border-stone-300/60 dark:border-slate-700/60 bg-linear-to-br from-stone-50/95 to-stone-100/95 dark:from-slate-800/80 dark:to-slate-900/80">
          <CardContent className="space-y-4 p-4 sm:p-6">
            {manifestUrl ? (
              <VideoPlayer videoId={video.$id} manifestUrl={manifestUrl} subtitleUrl={subtitleUrl} />
            ) : (
              <div className="flex items-center justify-center rounded-lg bg-slate-200/50 p-8 dark:bg-slate-700/30">
                <p className="text-sm text-slate-600 dark:text-slate-400">Video processing in progress. Please wait...</p>
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{video.title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{video.description || "No description"}</p>
            </div>

            <Button 
              variant="danger" 
              onClick={deleteVideo}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
            >
              Delete video
            </Button>
          </CardContent>
        </Card>

        <VideoActions video={video} onVideoUpdate={setVideo} />
      </div>
    </AppShell>
  );
}
