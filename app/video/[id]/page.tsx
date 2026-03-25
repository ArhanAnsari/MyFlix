"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/video-player";
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
        <Card className="border-stone-300 bg-[linear-gradient(150deg,#fffdf8_0%,#f0e5d6_100%)]">
          <CardContent className="space-y-4 p-4 sm:p-6">
            {manifestUrl ? (
              <VideoPlayer videoId={video.$id} manifestUrl={manifestUrl} subtitleUrl={subtitleUrl} />
            ) : (
              <p className="text-sm text-slate-600">Video processing in progress. Refresh in a moment.</p>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{video.title}</h1>
              <p className="text-sm text-slate-600">{video.description || "No description"}</p>
            </div>

            <Button variant="danger" onClick={deleteVideo}>
              Delete video
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
