"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VideoCard } from "@/components/video/video-card";
import { PAGE_SIZE } from "@/lib/constants";
import type { VideoDocument } from "@/lib/types";

type ContinueWatchingItem = {
  video: VideoDocument;
  progress: number;
  updatedAt: string | null;
};

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoDocument[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      });
      if (search.trim()) params.set("search", search.trim());

      try {
        const res = await fetch(`/api/videos?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          setVideos([]);
          setTotal(0);
          return;
        }

        const data = await res.json();
        setVideos(data.videos ?? []);
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [page, search, sort]);

  useEffect(() => {
    const loadContinueWatching = async () => {
      try {
        const res = await fetch("/api/watch-history", { cache: "no-store" });
        if (!res.ok) {
          setContinueWatching([]);
          return;
        }

        const data = await res.json();
        setContinueWatching(data.items ?? []);
      } catch {
        setContinueWatching([]);
      }
    };

    void loadContinueWatching();
  }, []);

  return (
    <AppShell>
      <section className="space-y-5">
        {continueWatching.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <h2 className="text-base font-semibold text-zinc-100">Continue Watching</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {continueWatching.map((item) => {
                const duration = item.video.duration > 0 ? item.video.duration : 1;
                const progressPercent = Math.max(0, Math.min(100, Math.round((item.progress / duration) * 100)));

                return (
                  <Link
                    key={item.video.$id}
                    href={`/video/${item.video.$id}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 transition hover:border-cyan-500/60"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium text-zinc-100">{item.video.title}</p>
                      <span className="text-xs text-zinc-400">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by title"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setSort((prev) => (prev === "desc" ? "asc" : "desc"));
            }}
          >
            Sort: {sort === "desc" ? "Newest" : "Oldest"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400">Loading videos...</p>
        ) : videos.length === 0 ? (
          <p className="text-sm text-zinc-400">No videos found. Upload your first one.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.$id} video={video} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
          <p className="text-sm text-zinc-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
