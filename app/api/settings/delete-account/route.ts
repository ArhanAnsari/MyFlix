import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage, getAdminUsers } from "@/lib/appwrite";
import { handleApiError, requireEnv } from "@/lib/server/api";
import { extractFileIdFromUrl, extractSegmentIdsFromManifest } from "@/lib/video-files";

function getConfig() {
  return {
    databaseId: requireEnv("APPWRITE_DATABASE_ID", process.env.APPWRITE_DATABASE_ID),
    videosCollectionId: requireEnv("APPWRITE_VIDEOS_COLLECTION_ID", process.env.APPWRITE_VIDEOS_COLLECTION_ID),
    historyCollectionId: requireEnv(
      "APPWRITE_WATCH_HISTORY_COLLECTION_ID",
      process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID,
    ),
    bucketId: requireEnv("APPWRITE_STORAGE_BUCKET_ID", process.env.APPWRITE_STORAGE_BUCKET_ID),
  };
}

export async function DELETE() {
  try {
    const { databaseId, videosCollectionId, historyCollectionId, bucketId } = getConfig();
    const user = await requireUser();
    const databases = getAdminDatabases();
    const storage = getAdminStorage();
    const users = getAdminUsers();

    const videos = await databases.listDocuments(databaseId, videosCollectionId, [
      Query.equal("userId", user.$id),
      Query.limit(5000),
    ]);

    const history = await databases.listDocuments(databaseId, historyCollectionId, [
      Query.equal("userId", user.$id),
      Query.limit(5000),
    ]);

    const fileIds: string[] = [];

    for (const doc of videos.documents) {
      fileIds.push(...[doc.originalFileId, doc.hlsFileId, doc.subtitleFileId].filter(Boolean));

      if (doc.thumbnailUrl && typeof doc.thumbnailUrl === "string") {
        const thumbId = extractFileIdFromUrl(doc.thumbnailUrl);
        if (thumbId) fileIds.push(thumbId);
      }

      if (doc.hlsFileId) {
        try {
          const manifestData = await storage.getFileDownload(bucketId, doc.hlsFileId);
          const manifestText = Buffer.from(manifestData).toString("utf8");
          fileIds.push(...extractSegmentIdsFromManifest(manifestText));
        } catch {
          // Ignore manifest read issues and continue cleanup.
        }
      }
    }

    await Promise.allSettled(fileIds.map((fileId) => storage.deleteFile(bucketId, fileId)));

    await Promise.allSettled([
      ...videos.documents.map((doc) => databases.deleteDocument(databaseId, videosCollectionId, doc.$id)),
      ...history.documents.map((doc) => databases.deleteDocument(databaseId, historyCollectionId, doc.$id)),
    ]);

    await users.delete(user.$id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete account data");
  }
}
