import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { extractFileIdFromUrl } from "@/lib/video-files";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID!;
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID!;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(databaseId, videosCollectionId, id);
    if (video.userId !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const message = error instanceof Error ? error.message : "Unable to stream thumbnail";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
