import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getAdminDatabases,
  getAdminStorage,
  getAdminFunctions,
} from "@/lib/appwrite";
import { handleApiError, jsonForbidden, requireEnv } from "@/lib/server/api";
import {
  extractFileIdFromUrl,
  extractSegmentIdsFromManifest,
} from "@/lib/video-files";

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
    watchHistoryCollectionId: requireEnv(
      "APPWRITE_WATCH_HISTORY_COLLECTION_ID",
      process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID,
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
  try {
    const { databaseId, videosCollectionId } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;
    const databases = getAdminDatabases();

    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      id,
    );
    if (video.userId !== user.$id) return jsonForbidden();

    return NextResponse.json({ video });
  } catch (error) {
    return handleApiError(error, "Failed to fetch video");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const {
      databaseId,
      videosCollectionId,
      watchHistoryCollectionId,
      bucketId,
    } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;
    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      id,
    );
    if (video.userId !== user.$id) return jsonForbidden();

    const fileIds = [
      video.originalFileId,
      video.hlsFileId,
      video.subtitleFileId,
    ].filter(Boolean) as string[];

    if (video.thumbnailUrl && typeof video.thumbnailUrl === "string") {
      const thumbId = extractFileIdFromUrl(video.thumbnailUrl);
      if (thumbId) fileIds.push(thumbId);
    }

    if (video.hlsFileId) {
      try {
        const manifestData = await storage.getFileDownload(
          bucketId,
          video.hlsFileId,
        );
        const manifestText = Buffer.from(manifestData).toString("utf8");
        fileIds.push(...extractSegmentIdsFromManifest(manifestText));
      } catch {
        // Ignore manifest read issues during deletion; continue best-effort cleanup.
      }
    }

    await Promise.allSettled(
      fileIds.map((fileId) => storage.deleteFile(bucketId, fileId)),
    );
    await Promise.allSettled([
      databases.deleteDocument(databaseId, videosCollectionId, id),
      databases.deleteDocument(
        databaseId,
        watchHistoryCollectionId,
        `${user.$id}_${id}`,
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete video");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { databaseId, videosCollectionId } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      action: string;
      [key: string]: unknown;
    };

    if (!body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const databases = getAdminDatabases();

    // Get video to verify ownership
    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      id,
    );
    if (video.userId !== user.$id) return jsonForbidden();

    // Rename video
    if (body.action === "rename") {
      const newTitle = body.title as string;
      if (!newTitle || typeof newTitle !== "string") {
        return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      }

      const updated = await databases.updateDocument(
        databaseId,
        videosCollectionId,
        id,
        {
          title: newTitle.trim(),
        },
      );

      return NextResponse.json({ video: updated }, { status: 200 });
    }

    // Update description
    if (body.action === "update-description") {
      const description = body.description as string;
      if (typeof description !== "string") {
        return NextResponse.json(
          { error: "Invalid description" },
          { status: 400 },
        );
      }

      const updated = await databases.updateDocument(
        databaseId,
        videosCollectionId,
        id,
        {
          description: description.trim(),
        },
      );

      return NextResponse.json({ video: updated }, { status: 200 });
    }

    // Retry processing
    if (body.action === "retry-processing") {
      const functionId = process.env.APPWRITE_VIDEO_FUNCTION_ID;
      if (!functionId) {
        return NextResponse.json(
          { error: "Processing not available" },
          { status: 503 },
        );
      }

      // Update status to processing
      await databases.updateDocument(databaseId, videosCollectionId, id, {
        processingStatus: "processing",
      });

      // Trigger function
      try {
        const functions = getAdminFunctions();
        await functions.createExecution(
          functionId,
          JSON.stringify({
            videoId: id,
            fileId: video.originalFileId,
            userId: user.$id,
          }),
          false,
        );
      } catch (err) {
        // Log error but return success as function was triggered
        console.error("Failed to trigger processing:", err);
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "Failed to update video");
  }
}
