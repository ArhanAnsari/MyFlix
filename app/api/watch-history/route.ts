import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID!;
const historyCollectionId = process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID!;

export async function GET() {
  try {
    const user = await requireUser();
    const databases = getAdminDatabases();

    const history = await databases.listDocuments(databaseId, historyCollectionId, [
      Query.equal("userId", user.$id),
      Query.orderDesc("updatedAt"),
      Query.limit(8),
    ]);

    if (history.documents.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const videoIds = Array.from(
      new Set(
        history.documents
          .map((doc) => (typeof doc.videoId === "string" ? doc.videoId : ""))
          .filter(Boolean),
      ),
    );

    if (videoIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const videos = await databases.listDocuments(databaseId, videosCollectionId, [
      Query.equal("userId", user.$id),
      Query.equal("$id", videoIds),
      Query.limit(videoIds.length),
    ]);

    const videoById = new Map(videos.documents.map((video) => [video.$id, video]));

    const items = history.documents
      .map((entry) => {
        const video = videoById.get(entry.videoId);
        if (!video) return null;

        return {
          video,
          progress: entry.progress ?? 0,
          updatedAt: entry.updatedAt ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch watch history";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
