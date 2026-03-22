"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/video-player";
import type { VideoDocument } from "@/lib/types";

export default function VideoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/videos/${params.id}`, { cache: "no-store" });
      if (!res.ok) {
        router.replace("/dashboard");
        return;
      }

      const data = await res.json();
      setVideo(data.video);
      setLoading(false);
    };

    void load();
  }, [params.id, router]);

  const manifestUrl = useMemo(() => {
    if (!video?.hlsFileId) return "";
    return `/api/stream/${video.$id}/manifest`;
  }, [video?.hlsFileId]);

  const subtitleUrl = useMemo(() => {
    if (!video?.subtitleFileId) return "";
    return `/api/subtitles/${video.$id}`;
  }, [video?.subtitleFileId]);

  const deleteVideo = async () => {
    const confirmed = window.confirm("Delete this video permanently?");
    if (!confirmed) return;

    const res = await fetch(`/api/videos/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/dashboard");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-zinc-400">Loading video...</p>
      </AppShell>
    );
  }

  if (!video) {
    return (
      <AppShell>
        <p className="text-sm text-zinc-400">Video not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Card className="border-zinc-800 bg-zinc-950/80">
          <CardContent className="space-y-4 p-4 sm:p-6">
            {manifestUrl ? (
              <VideoPlayer videoId={video.$id} manifestUrl={manifestUrl} subtitleUrl={subtitleUrl} />
            ) : (
              <p className="text-sm text-zinc-400">Video processing in progress. Refresh in a moment.</p>
            )}

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-zinc-100">{video.title}</h1>
              <p className="text-sm text-zinc-400">{video.description || "No description"}</p>
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
