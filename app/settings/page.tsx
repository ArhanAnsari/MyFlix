"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/settings/stats", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        setTotalVideos(data.totalVideos ?? 0);
        setTotalBytes(data.totalBytes ?? 0);
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  const deleteAccountData = async () => {
    const confirmed = window.confirm("Delete all videos and account data? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", { method: "DELETE" });
      if (res.ok) {
        router.replace("/signup");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto grid w-full max-w-3xl gap-4">
        <Card className="border-zinc-800 bg-zinc-950/90">
          <CardHeader>
            <CardTitle>Storage usage</CardTitle>
            <CardDescription>Overview of your private cloud consumption.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            {loading ? (
              <p>Loading stats...</p>
            ) : (
              <>
                <p>Total videos: {totalVideos}</p>
                <p>Total storage used: {formatBytes(totalBytes)}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-900/60 bg-red-950/20">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Delete your full account and all associated content.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={deleteAccountData} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete account data"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
