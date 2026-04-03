import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  jsonForbidden,
  logApiStart,
  logApiSuccess,
  requireEnv,
} from "@/lib/server/api";

function getConfig() {
  return {
    databaseId: requireEnv(
      "APPWRITE_DATABASE_ID",
      process.env.APPWRITE_DATABASE_ID,
    ),
    videosCollectionId: requireEnv(
      "APPWRITE_VIDEOS_COLLECTION_ID",
      process.env.APPWRITE_VIDEOS_COLLECTION_ID,
    ),
    bucketId: requireEnv(
      "APPWRITE_STORAGE_BUCKET_ID",
      process.env.APPWRITE_STORAGE_BUCKET_ID,
    ),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = createApiLogContext("videos/download");
  try {
    const { databaseId, videosCollectionId, bucketId } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;
    logApiStart(ctx, `userId=${user.$id} videoId=${id}`);
    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    // Get video document
    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      id,
    );

    // Verify ownership
    if (video.userId !== user.$id) {
      return jsonForbidden();
    }

    if (!video.originalFileId) {
      return NextResponse.json(
        { error: "Original file not found" },
        { status: 404 },
      );
    }

    // Get the file download
    const fileData = await storage.getFileDownload(
      bucketId,
      video.originalFileId,
    );
    const fileBuffer = Buffer.from(fileData);

    logApiSuccess(
      ctx,
      `userId=${user.$id} videoId=${id} bytes=${fileBuffer.length}`,
    );

    // Return file as download
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${video.title || "video"}.mp4"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiErrorWithContext(error, "Failed to download video", ctx);
  }
}
