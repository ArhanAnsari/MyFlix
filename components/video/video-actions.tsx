"use client";

import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Clock, Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/client/api";
import type { VideoDocument } from "@/lib/types";

type VideoActionsProps = {
  video: VideoDocument;
  onVideoUpdate: (video: VideoDocument) => void;
};

export function VideoActions({ video, onVideoUpdate }: VideoActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(video.title);
  const [editingDescription, setEditingDescription] = useState(video.description);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleSaveTitle = async () => {
    if (!editingTitle.trim()) return;
    
    setIsLoading(true);
    try {
      const data = await apiRequest<{ video: VideoDocument }>(`/api/videos/${video.$id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "rename", title: editingTitle }),
      });
      onVideoUpdate(data.video);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ video: VideoDocument }>(`/api/videos/${video.$id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "update-description", description: editingDescription }),
      });
      onVideoUpdate(data.video);
    } catch (error) {
      console.error("Failed to update description:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
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
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const data = await apiRequest<{ shareUrl: string }>(`/api/videos/${video.$id}/share`, {
        method: "POST",
      });
      setShareLink(data.shareUrl);
      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareUrl);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setShareLink(null), 3000);
    } catch (error) {
      console.error("Failed to generate share link:", error);
      alert("Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusDisplay = () => {
    const status = video.processingStatus || "pending";
    const statusConfig = {
      pending: { icon: Clock, label: "Pending", color: "text-amber-700 dark:text-amber-300" },
      processing: { icon: Loader2, label: "Processing", color: "text-blue-700 dark:text-blue-300" },
      completed: { icon: CheckCircle2, label: "Completed", color: "text-green-700 dark:text-green-300" },
      failed: { icon: AlertCircle, label: "Failed", color: "text-red-700 dark:text-red-300" },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        {status === "processing" ? (
          <Icon className={`h-4 w-4 animate-spin ${config.color}`} />
        ) : (
          <Icon className={`h-4 w-4 ${config.color}`} />
        )}
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>
    );
  };

  return (
    <Card className="border-stone-300/60 dark:border-slate-700/60">
      <CardHeader>
        <CardTitle>Video Details</CardTitle>
        <CardDescription>Manage your video information and settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100 dark:text-slate-400">Processing Status</label>
          <div className="flex items-center justify-between rounded-lg border border-stone-300/50 bg-stone-50/50 p-3 dark:border-slate-600/50 dark:bg-slate-700/30">
            {getStatusDisplay()}
            <span className="text-xs text-slate-700 dark:text-slate-300">Direct streaming mode</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Original
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || video.processingStatus !== "completed"}
            variant="outline"
            className="flex-1 gap-2"
          >
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Link...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Create Share Link
              </>
            )}
          </Button>
        </div>

        {shareLink && (
          <div className="rounded-lg border border-green-300/50 bg-green-50/50 p-3 dark:border-green-600/50 dark:bg-green-700/30">
            <p className="text-xs text-green-700 dark:text-green-300 mb-2">✓ Link copied to clipboard!</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 break-all">{shareLink}</p>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100 dark:text-slate-400">Title</label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="dark:bg-slate-700/50 dark:border-slate-600/50"
                maxLength={255}
              />
              <Button
                onClick={handleSaveTitle}
                disabled={isLoading || !editingTitle.trim()}
                size="sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditingTitle(video.title);
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-stone-300/50 bg-stone-50/50 p-3 dark:border-slate-600/50 dark:bg-slate-700/30">
              <p className="font-medium">{video.title}</p>
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                size="sm"
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100 dark:text-slate-400">Description</label>
          <Textarea
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            placeholder="Add a description..."
            maxLength={5000}
            className="dark:bg-slate-700/50 dark:border-slate-600/50"
            rows={4}
          />
          <div className="flex justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {editingDescription.length}/5000 characters
            </span>
            {editingDescription !== video.description && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDescription}
                  disabled={isLoading}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button
                  onClick={() => setEditingDescription(video.description)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Video Info */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-300/50 bg-stone-50/50 p-3 dark:border-slate-600/50 dark:bg-slate-700/30">
          <div>
            <p className="text-xs text-slate-700 dark:text-slate-300">Duration</p>
            <p className="font-medium">{Math.floor(video.duration)}s</p>
          </div>
          <div>
            <p className="text-xs text-slate-700 dark:text-slate-300">File Size</p>
            <p className="font-medium">{(video.size / 1024 / 1024).toFixed(2)}MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
