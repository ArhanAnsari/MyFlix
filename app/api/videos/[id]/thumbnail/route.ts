import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { handleApiError, jsonForbidden, requireEnv } from "@/lib/server/api";
import { extractFileIdFromUrl } from "@/lib/video-files";

function getConfig() {
  return {
    databaseId: requireEnv("APPWRITE_DATABASE_ID", process.env.APPWRITE_DATABASE_ID),
    videosCollectionId: requireEnv("APPWRITE_VIDEOS_COLLECTION_ID", process.env.APPWRITE_VIDEOS_COLLECTION_ID),
    bucketId: requireEnv("APPWRITE_STORAGE_BUCKET_ID", process.env.APPWRITE_STORAGE_BUCKET_ID),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { databaseId, videosCollectionId, bucketId } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, id);
    if (video.userId !== user.$id) {
      return jsonForbidden();
    }

    if (!video.thumbnailUrl || typeof video.thumbnailUrl !== "string") {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
    }

    const thumbnailFileId = extractFileIdFromUrl(video.thumbnailUrl);
    if (!thumbnailFileId) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
    }

    const thumbnailData = await storage.getFileDownload(bucketId, thumbnailFileId);

    return new NextResponse(thumbnailData as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "Unable to stream thumbnail");
  }
}
