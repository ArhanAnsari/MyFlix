import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { handleApiError, jsonForbidden, requireEnv } from "@/lib/server/api";
import { extractSegmentIdsFromManifest } from "@/lib/video-files";

function getConfig() {
  return {
    databaseId: requireEnv("APPWRITE_DATABASE_ID", process.env.APPWRITE_DATABASE_ID),
    videosCollectionId: requireEnv("APPWRITE_VIDEOS_COLLECTION_ID", process.env.APPWRITE_VIDEOS_COLLECTION_ID),
    bucketId: requireEnv("APPWRITE_STORAGE_BUCKET_ID", process.env.APPWRITE_STORAGE_BUCKET_ID),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string; segmentId: string }> },
) {
  try {
    const { databaseId, videosCollectionId, bucketId } = getConfig();
    const user = await requireUser();
    const { videoId, segmentId } = await context.params;

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, videoId);
    if (video.userId !== user.$id) {
      return jsonForbidden();
    }

    if (!video.hlsFileId) {
      return NextResponse.json({ error: "HLS manifest not ready" }, { status: 404 });
    }

    const manifestData = await storage.getFileDownload(bucketId, video.hlsFileId);
    const manifestText = Buffer.from(manifestData).toString("utf8");
    const allowedSegmentIds = extractSegmentIdsFromManifest(manifestText);

    if (!allowedSegmentIds.includes(segmentId)) {
      return NextResponse.json({ error: "Segment not allowed" }, { status: 403 });
    }

    const segmentData = await storage.getFileDownload(bucketId, segmentId);

    return new NextResponse(segmentData as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "Unable to stream segment");
  }
}
