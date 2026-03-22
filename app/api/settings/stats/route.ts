import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID!;

export async function GET() {
  try {
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
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
