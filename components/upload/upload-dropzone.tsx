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
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE_BYTES } from "@/lib/constants";

type UploadDropzoneProps = {
  bucketId: string;
  userId: string;
};

export function UploadDropzone({ bucketId, userId }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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

    const duration = await getDuration(file);

    try {
      const uploadResult = await storage.createFile(
        bucketId,
        ID.unique(),
        file,
        [],
        // Appwrite web SDK supports progress callback in recent versions.
        (progressEvent: { progress: number }) => {
          setProgress(Math.round(progressEvent.progress));
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
    }
  };

  return (
    <Card className="border-stone-300 bg-[linear-gradient(160deg,#fffdf8_0%,#f2e7d7_100%)]">
      <CardHeader>
        <CardTitle className="text-2xl">Upload video</CardTitle>
        <CardDescription>
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
          className="flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-400 bg-stone-100/80 p-6 text-slate-700 transition hover:border-orange-500 hover:bg-white"
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
          <label htmlFor="title" className="text-sm text-slate-700">
            Title
          </label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-700" htmlFor="subtitle">
            Subtitle (.vtt, optional)
          </label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => subtitleInputRef.current?.click()}>
              {subtitleFile ? "Change subtitle" : "Upload subtitle"}
            </Button>
            <span className="text-sm text-slate-600">{subtitleFile?.name ?? "No subtitle selected"}</span>
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
          <label htmlFor="description" className="text-sm text-slate-700">
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </div>

        {uploading ? <Progress value={progress} /> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button onClick={onUpload} disabled={!file || !title || uploading} className="w-full">
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
