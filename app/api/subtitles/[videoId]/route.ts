import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { handleApiError, jsonForbidden, requireEnv } from "@/lib/server/api";

function getConfig() {
  return {
    databaseId: requireEnv("APPWRITE_DATABASE_ID", process.env.APPWRITE_DATABASE_ID),
    videosCollectionId: requireEnv("APPWRITE_VIDEOS_COLLECTION_ID", process.env.APPWRITE_VIDEOS_COLLECTION_ID),
    bucketId: requireEnv("APPWRITE_STORAGE_BUCKET_ID", process.env.APPWRITE_STORAGE_BUCKET_ID),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const { databaseId, videosCollectionId, bucketId } = getConfig();
    const user = await requireUser();
    const { videoId } = await context.params;

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, videoId);
    if (video.userId !== user.$id) {
      return jsonForbidden();
    }

    if (!video.subtitleFileId) {
      return NextResponse.json({ error: "Subtitle not found" }, { status: 404 });
    }

    const subtitleData = await storage.getFileDownload(bucketId, video.subtitleFileId);

    return new NextResponse(subtitleData as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "Unable to stream subtitle");
  }
}
