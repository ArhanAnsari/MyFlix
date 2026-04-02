"use client";

import { ID } from "appwrite";
import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/appwrite-client";
import { apiRequest } from "@/lib/client/api";
import { useTheme } from "@/lib/theme-context";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE_BYTES } from "@/lib/constants";

type UploadDropzoneProps = {
  bucketId: string;
  userId: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "calculating...";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function UploadDropzone({ bucketId, userId }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement | null>(null);
  const uploadStartTimeRef = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { theme } = useTheme();

  const getAllowedExtensions = () => [".mp4", ".mkv", ".webm", ".mov", ".avi", ".flv", ".ogv", ".3gp", ".m4v"];

  const validate = (videoFile: File) => {
    const mimeTypeValid = ALLOWED_VIDEO_TYPES.includes(videoFile.type);
    const fileName = videoFile.name.toLowerCase();
    const extensionValid = getAllowedExtensions().some((ext) => fileName.endsWith(ext));

    if (!mimeTypeValid && !extensionValid) {
      return "Unsupported format. Supported: MP4, MKV, WebM, MOV, AVI, FLV, OGV, 3GP, M4V.";
    }

    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      return "File is larger than 5GB.";
    }

    return null;
  };

  const setSelectedFile = (videoFile: File | null) => {
    if (!videoFile) return;

    const validationError = validate(videoFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(videoFile);
    setTitle(videoFile.name.replace(/\.[^/.]+$/, ""));
    setError(null);
  };

  const setSelectedSubtitle = (subtitle: File | null) => {
    if (!subtitle) return;

    const isVtt = subtitle.name.toLowerCase().endsWith(".vtt") || subtitle.type === "text/vtt";
    if (!isVtt) {
      setError("Subtitle must be a .vtt file.");
      return;
    }

    if (subtitle.size > 5 * 1024 * 1024) {
      setError("Subtitle file must be under 5MB.");
      return;
    }

    setSubtitleFile(subtitle);
    setError(null);
  };

  const getDuration = async (videoFile: File) => {
    return new Promise<number>((resolve) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(el.src);
        resolve(Number.isFinite(el.duration) ? el.duration : 0);
      };
      el.onerror = () => resolve(0);
      el.src = URL.createObjectURL(videoFile);
    });
  };

  const onUpload = async () => {
    if (!file || !title) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadSpeed(0);
    setTimeRemaining(0);
    uploadStartTimeRef.current = Date.now();

    const duration = await getDuration(file);

    try {
      const uploadResult = await storage.createFile(
        bucketId,
        ID.unique(),
        file,
        [],
        (progressEvent: { progress: number }) => {
          const progressPercent = Math.round(progressEvent.progress);
          setProgress(progressPercent);
          
          if (uploadStartTimeRef.current && progressPercent > 0) {
            const elapsedMs = Date.now() - uploadStartTimeRef.current;
            const elapsedSecs = elapsedMs / 1000;
            const bytesUploaded = (file.size * progressPercent) / 100;
            const speed = bytesUploaded / elapsedSecs;
            setUploadSpeed(speed);
            
            const remainingBytes = file.size - bytesUploaded;
            const remaining = remainingBytes / speed;
            setTimeRemaining(remaining);
          }
        },
      );

      let subtitleFileId = "";

      if (subtitleFile) {
        const subtitleUpload = await storage.createFile(
          bucketId,
          ID.unique(),
          subtitleFile,
          [],
        );
        subtitleFileId = subtitleUpload.$id;
      }

      await apiRequest("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          originalFileId: uploadResult.$id,
          subtitleFileId,
          size: file.size,
          duration,
        }),
        onUnauthorized: () => window.location.assign("/login"),
      });

      setProgress(100);
      setFile(null);
      setSubtitleFile(null);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      uploadStartTimeRef.current = null;
    }
  };

  return (
    <Card className={`border-stone-300/60 transition-all ${
      theme === "dark"
        ? "bg-linear-to-br from-slate-800/80 to-slate-900/80 border-slate-700/60 text-slate-100"
        : "bg-linear-to-br from-stone-50/95 to-stone-100/95 text-slate-900"
    }`}>
      <CardHeader>
        <CardTitle className="text-2xl">Upload video</CardTitle>
        <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          Drag and drop or select a file. Max size is 5GB. Supported formats: MP4, MKV, WebM, MOV, AVI, FLV, OGV, 3GP, M4V.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0] ?? null;
            setSelectedFile(dropped);
          }}
          className={`flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition ${
            theme === "dark"
              ? "border-slate-600/60 bg-slate-700/40 hover:border-orange-500/70 hover:bg-slate-600/50"
              : "border-stone-400/60 bg-stone-100/40 hover:border-orange-500/70 hover:bg-white/50"
          } p-6`}
        >
          <UploadCloud className="h-8 w-8 text-orange-600" />
          <p className="text-sm">{file ? file.name : "Drop video here or click to browse"}</p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4,video/webm,.webm,video/quicktime,.mov,video/x-matroska,.mkv,video/x-msvideo,.avi,video/x-flv,.flv,video/ogg,.ogv,video/3gpp,.3gp,video/x-m4v,.m4v"
          className="hidden"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <Input 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            maxLength={120} 
            className={`transition-colors ${
              theme === "dark"
                ? "bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500"
                : "bg-white/50 border-stone-300/50 text-slate-900 placeholder:text-slate-400"
            }`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="subtitle">
            Subtitle (.vtt, optional)
          </label>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => subtitleInputRef.current?.click()}
              className={`transition-colors ${
                theme === "dark"
                  ? "border-slate-600/50 bg-slate-700/50 text-slate-100 hover:bg-slate-600/70"
                  : "border-stone-300/50 bg-stone-100/50 text-slate-900 hover:bg-stone-200/50"
              }`}
            >
              {subtitleFile ? "Change subtitle" : "Upload subtitle"}
            </Button>
            <span className={`text-sm ${ theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{subtitleFile?.name ?? "No subtitle selected"}</span>
          </div>
          <input
            ref={subtitleInputRef}
            id="subtitle"
            type="file"
            accept=".vtt,text/vtt"
            className="hidden"
            onChange={(event) => setSelectedSubtitle(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            className={`transition-colors ${
              theme === "dark"
                ? "bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500"
                : "bg-white/50 border-stone-300/50 text-slate-900 placeholder:text-slate-400"
            }`}
          />
        </div>

        {uploading ? (
          <div className="space-y-3">
            <Progress value={progress} className={`bg-slate-700/50 dark:bg-slate-600/50`} />
            <div className={`grid grid-cols-3 gap-4 text-sm`}>
              <div>
                <p className="font-semibold">Progress</p>
                <p className="text-lg text-orange-600 dark:text-orange-400">{progress}%</p>
              </div>
              <div>
                <p className="font-semibold">Speed</p>
                <p className="text-lg text-orange-600 dark:text-orange-400">{formatBytes(uploadSpeed)}/s</p>
              </div>
              <div>
                <p className="font-semibold">Time Remaining</p>
                <p className="text-lg text-orange-600 dark:text-orange-400">{formatTime(timeRemaining)}</p>
              </div>
            </div>
          </div>
        ) : null}
        {error ? <p className={`text-sm ${ theme === "dark" ? "text-red-400" : "text-red-600"}`}>{error}</p> : null}

        <Button 
          onClick={onUpload} 
          disabled={!file || !title || uploading} 
          className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-medium"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
