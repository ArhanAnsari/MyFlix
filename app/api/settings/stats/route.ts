import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";
import { handleApiError, requireEnv } from "@/lib/server/api";

function getConfig() {
  return {
    databaseId: requireEnv("APPWRITE_DATABASE_ID", process.env.APPWRITE_DATABASE_ID),
    videosCollectionId: requireEnv("APPWRITE_VIDEOS_COLLECTION_ID", process.env.APPWRITE_VIDEOS_COLLECTION_ID),
  };
}

export async function GET() {
  try {
    const { databaseId, videosCollectionId } = getConfig();
    const user = await requireUser();
    const databases = getAdminDatabases();

    const videos = await databases.listDocuments(databaseId, videosCollectionId, [
      Query.equal("userId", user.$id),
      Query.limit(5000),
    ]);

    const totalVideos = videos.total;
    const totalBytes = videos.documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);

    return NextResponse.json({ totalVideos, totalBytes });
  } catch (error) {
    return handleApiError(error, "Failed to fetch settings");
  }
}
