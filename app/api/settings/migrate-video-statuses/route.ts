import { Query } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
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
  };
}

export async function POST() {
  const ctx = createApiLogContext("settings/migrate-video-statuses");

  try {
    const { databaseId, videosCollectionId } = getConfig();
    const user = await requireUser();
    logApiStart(ctx, `userId=${user.$id}`);

    const databases = getAdminDatabases();
    const videos = await databases.listDocuments(
      databaseId,
      videosCollectionId,
      [Query.equal("userId", user.$id), Query.limit(5000)],
    );

    let updated = 0;
    let skipped = 0;

    await Promise.allSettled(
      videos.documents.map(async (doc) => {
        const hasOriginal = Boolean(doc.originalFileId);
        const targetStatus = hasOriginal ? "completed" : "failed";

        if (doc.processingStatus === targetStatus) {
          skipped += 1;
          return;
        }

        await databases.updateDocument(
          databaseId,
          videosCollectionId,
          doc.$id,
          {
            processingStatus: targetStatus,
          },
        );
        updated += 1;
      }),
    );

    logApiSuccess(
      ctx,
      `userId=${user.$id} total=${videos.documents.length} updated=${updated} skipped=${skipped}`,
    );

    return NextResponse.json({
      ok: true,
      total: videos.documents.length,
      updated,
      skipped,
    });
  } catch (error) {
    return handleApiErrorWithContext(
      error,
      "Failed to migrate video statuses",
      ctx,
    );
  }
}
