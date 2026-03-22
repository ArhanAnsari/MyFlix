import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID!;
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID!;

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const user = await requireUser();
    const { videoId } = await context.params;

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, videoId);
    if (video.userId !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!video.hlsFileId) {
      return NextResponse.json({ error: "HLS manifest not ready" }, { status: 404 });
    }

    const fileData = await storage.getFileDownload(bucketId, video.hlsFileId);
    const manifestText = Buffer.from(fileData).toString("utf8");

    return new NextResponse(manifestText, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to stream manifest";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
