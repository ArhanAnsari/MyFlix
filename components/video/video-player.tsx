"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/api";
import { WATCH_HISTORY_INTERVAL_MS } from "@/lib/constants";

type VideoPlayerProps = {
  videoId: string;
  streamUrl?: string;
  subtitleUrl?: string;
};

export function VideoPlayer({ videoId, streamUrl, subtitleUrl }: VideoPlayerProps) {
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const videoUrl = streamUrl ?? `/api/stream/${videoId}`;

  useEffect(() => {
    const video = videoRef;
    if (!video) return;

    const onCanPlay = () => {
      setReady(true);
      setBuffering(false);
      setPlaybackError(null);
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onError = () => {
      setBuffering(false);
      setPlaybackError("Playback failed. Try refreshing the page.");
    };

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("error", onError);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef;
    if (!video || !ready) return;

    const loadProgress = async () => {
      const data = await apiRequest<{ progress: number }>(`/api/watch-history/${videoId}`, {
        cache: "no-store",
      });
      if (typeof data.progress === "number" && data.progress > 0) {
        video.currentTime = data.progress;
      }
    };

    void loadProgress();
  }, [ready, videoId]);

  useEffect(() => {
    const video = videoRef;
    if (!video || !ready) return;

    const saveProgress = () => {
      if (video.paused || video.ended) return;

      void apiRequest(`/api/watch-history/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: Math.floor(video.currentTime) }),
      });
    };

    const interval = setInterval(saveProgress, WATCH_HISTORY_INTERVAL_MS);

    const flushOnHide = () => {
      void apiRequest(`/api/watch-history/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: Math.floor(video.currentTime) }),
      });
    };

    window.addEventListener("beforeunload", flushOnHide);
    document.addEventListener("visibilitychange", flushOnHide);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", flushOnHide);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, [ready, videoId]);

  const timeLabel = `${Math.floor(currentTime)}s / ${Math.floor(duration)}s`;

  return (
    <div className="space-y-3">
      <div className="relative">
        <video
          ref={setVideoRef}
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-2xl border border-stone-300 bg-black shadow-[0_24px_30px_-20px_rgba(15,23,42,0.7)]"
        >
          {subtitleUrl ? (
            <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default />
          ) : null}
        </video>

        {!ready && !playbackError ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/35">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading video...
            </div>
          </div>
        ) : null}

        {buffering && ready ? (
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            Buffering...
          </div>
        ) : null}

        {playbackError ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/70 p-4 text-center">
            <div className="space-y-2 text-white">
              <AlertCircle className="mx-auto h-6 w-6 text-red-300" />
              <p className="text-sm">{playbackError}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-300 bg-stone-50/70 px-3 py-2 text-xs text-slate-700">
        <span>Direct Streaming</span>
        <span>{timeLabel}</span>
      </div>
    </div>
  );
}