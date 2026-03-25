"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/client/api";
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
        const data = await apiRequest<{ totalVideos: number; totalBytes: number }>("/api/settings/stats", {
          cache: "no-store",
          onUnauthorized: () => router.replace("/login"),
        });
        setTotalVideos(data.totalVideos ?? 0);
        setTotalBytes(data.totalBytes ?? 0);
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, [router]);

  const deleteAccountData = async () => {
    const confirmed = window.confirm("Delete all videos and account data? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiRequest("/api/settings/delete-account", {
        method: "DELETE",
        onUnauthorized: () => router.replace("/login"),
      });
      router.replace("/signup");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto grid w-full max-w-3xl gap-4">
        <Card className="border-stone-300 bg-[linear-gradient(160deg,#fffdf8_0%,#f3e8da_100%)]">
          <CardHeader>
            <CardTitle>Storage usage</CardTitle>
            <CardDescription>Overview of your private cloud consumption.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
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

        <Card className="border-red-300 bg-red-50/70">
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
