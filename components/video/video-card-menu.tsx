"use client";

import { useState } from "react";
import { Download, Share2, MoreVertical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client/api";
import type { VideoDocument } from "@/lib/types";

type VideoCardMenuProps = {
  video: VideoDocument;
};

export function VideoCardMenu({ video }: VideoCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/videos/${video.$id}/download`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${video.title || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download video:", error);
      alert("Failed to download video");
    } finally {
      setIsDownloading(false);
      setIsOpen(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (video.processingStatus !== "completed") {
      alert("This video is still being processed. Please wait.");
      return;
    }

    setIsSharing(true);
    try {
      const data = await apiRequest<{ shareUrl: string }>(`/api/videos/${video.$id}/share`, {
        method: "POST",
      });
      setShareLink(data.shareUrl);
      await navigator.clipboard.writeText(data.shareUrl);
      setTimeout(() => {
        setShareLink(null);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to generate share link:", error);
      alert("Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-stone-300/60 bg-white shadow-lg dark:border-slate-700/60 dark:bg-slate-800">
          {shareLink && (
            <div className="border-b border-stone-200 bg-green-50/50 p-2 dark:border-slate-700 dark:bg-green-900/30">
              <p className="text-xs text-green-700 dark:text-green-300">✓ Link copied!</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 break-all mt-1">
                {shareLink}
              </p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download Original</span>
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing || video.processingStatus !== "completed"}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition border-t border-stone-200 dark:border-slate-700"
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span>Create Link</span>
          </button>

          {video.processingStatus !== "completed" && (
            <div className="border-t border-stone-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Status: {video.processingStatus || "pending"}
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
