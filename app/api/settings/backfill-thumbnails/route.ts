import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  logApiStart,
  logApiSuccess,
  requireEnv,
} from "@/lib/server/api";
import {
  buildThumbnailUrl,
  generateSvgThumbnail,
  uploadSvgThumbnail,
} from "@/lib/server/thumbnail";

function getConfig() {
  return {
    endpoint: requireEnv(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT",
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    ),
    projectId: requireEnv(
      "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    ),
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

export async function POST() {
  const ctx = createApiLogContext("settings/backfill-thumbnails");

  try {
    const { endpoint, projectId, databaseId, videosCollectionId, bucketId } =
      getConfig();
    const user = await requireUser();
    logApiStart(ctx, `userId=${user.$id}`);

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const videos = await databases.listDocuments(
      databaseId,
      videosCollectionId,
      [Query.equal("userId", user.$id), Query.limit(5000)],
    );

    const targetVideos = videos.documents.filter(
      (video) =>
        !video.thumbnailUrl || String(video.thumbnailUrl).trim() === "",
    );

    let updated = 0;
    let failed = 0;

    for (const video of targetVideos) {
      try {
        const svg = generateSvgThumbnail(video.title || "Video");
        const thumbnailFileId = await uploadSvgThumbnail(
          storage,
          bucketId,
          user.$id,
          svg,
        );
        const thumbnailUrl = buildThumbnailUrl(
          endpoint,
          bucketId,
          thumbnailFileId,
          projectId,
        );

        await databases.updateDocument(
          databaseId,
          videosCollectionId,
          video.$id,
          {
            thumbnailUrl,
          },
        );

        updated += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[api][settings/backfill-thumbnails][${ctx.requestId}] failed videoId=${video.$id}`,
          err,
        );
      }
    }

    logApiSuccess(
      ctx,
      `userId=${user.$id} total=${videos.documents.length} updated=${updated} failed=${failed}`,
    );

    return NextResponse.json({
      ok: true,
      total: videos.documents.length,
      updated,
      failed,
      unchanged: videos.documents.length - targetVideos.length,
    });
  } catch (error) {
    return handleApiErrorWithContext(
      error,
      "Failed to backfill thumbnails",
      ctx,
    );
  }
}
