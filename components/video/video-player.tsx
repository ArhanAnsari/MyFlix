"use client";

import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/api";
import { WATCH_HISTORY_INTERVAL_MS } from "@/lib/constants";

type VideoPlayerProps = {
  videoId: string;
  manifestUrl: string;
  subtitleUrl?: string;
};

export function VideoPlayer({ videoId, manifestUrl, subtitleUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [ready, setReady] = useState(false);

  const supportsNativeHls = useMemo(() => {
    if (typeof document === "undefined") return false;
    const testVideo = document.createElement("video");
    return testVideo.canPlayType("application/vnd.apple.mpegurl") !== "";
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (supportsNativeHls) {
      const onCanPlay = () => setReady(true);
      video.addEventListener("canplay", onCanPlay, { once: true });
      video.src = manifestUrl;
      return () => {
        video.removeEventListener("canplay", onCanPlay);
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = true;
        },
      });

      hls.loadSource(manifestUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
      hlsRef.current = hls;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [manifestUrl, supportsNativeHls]);

  useEffect(() => {
    const video = videoRef.current;
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
    const video = videoRef.current;
    if (!video || !ready) return;

    const interval = setInterval(() => {
      if (video.paused || video.ended) return;

      void apiRequest(`/api/watch-history/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: Math.floor(video.currentTime) }),
      });
    }, WATCH_HISTORY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ready, videoId]);

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        controls
        playsInline
        className="aspect-video w-full rounded-2xl border border-stone-300 bg-black shadow-[0_24px_30px_-20px_rgba(15,23,42,0.7)]"
      >
        {subtitleUrl ? (
          <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default />
        ) : null}
      </video>
      {!ready ? <p className="text-sm text-slate-600">Loading stream...</p> : null}
    </div>
  );
}
