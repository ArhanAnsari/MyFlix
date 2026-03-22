import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { extractFileIdFromUrl, extractSegmentIdsFromManifest } from "@/lib/video-files";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID!;
const watchHistoryCollectionId = process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID!;
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID!;

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const databases = getAdminDatabases();

    const video = await databases.getDocument(databaseId, videosCollectionId, id);
    if (video.userId !== user.$id) return forbidden();

    return NextResponse.json({ video });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch video";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, id);
    if (video.userId !== user.$id) return forbidden();

    const fileIds = [video.originalFileId, video.hlsFileId, video.subtitleFileId].filter(Boolean) as string[];

    if (video.thumbnailUrl && typeof video.thumbnailUrl === "string") {
      const thumbId = extractFileIdFromUrl(video.thumbnailUrl);
      if (thumbId) fileIds.push(thumbId);
    }

    if (video.hlsFileId) {
      try {
        const manifestData = await storage.getFileDownload(bucketId, video.hlsFileId);
        const manifestText = Buffer.from(manifestData).toString("utf8");
        fileIds.push(...extractSegmentIdsFromManifest(manifestText));
      } catch {
        // Ignore manifest read issues during deletion; continue best-effort cleanup.
      }
    }

    await Promise.allSettled(fileIds.map((fileId) => storage.deleteFile(bucketId, fileId)));
    await Promise.allSettled([
      databases.deleteDocument(databaseId, videosCollectionId, id),
      databases.deleteDocument(databaseId, watchHistoryCollectionId, `${user.$id}_${id}`),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
