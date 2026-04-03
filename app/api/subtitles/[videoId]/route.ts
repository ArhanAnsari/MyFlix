import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";

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
  const sharesCollectionId =
    process.env.APPWRITE_SHARES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION_ID ||
    "shares";

  return {
    databaseId: requireEnv(
      "APPWRITE_DATABASE_ID",
      process.env.APPWRITE_DATABASE_ID,
    ),
    videosCollectionId: requireEnv(
      "APPWRITE_VIDEOS_COLLECTION_ID",
      process.env.APPWRITE_VIDEOS_COLLECTION_ID,
    ),
    sharesCollectionId,
    bucketId: requireEnv(
      "APPWRITE_STORAGE_BUCKET_ID",
      process.env.APPWRITE_STORAGE_BUCKET_ID,
    ),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> },
) {
  const ctx = createApiLogContext("subtitles/video");
  try {
    const { databaseId, videosCollectionId, sharesCollectionId, bucketId } =
      getConfig();
    const { videoId } = await context.params;
    const shareToken = new URL(request.url).searchParams.get("share");
    logApiStart(ctx, `videoId=${videoId} hasShareToken=${Boolean(shareToken)}`);

    const databases = getAdminDatabases();
    const storage = getAdminStorage();

    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      videoId,
    );

    // Check access: authenticated user or valid share token
    let authorized = false;

    try {
      const user = await requireUser();
      // Verify ownership for authenticated users
      authorized = video.userId === user.$id;
    } catch {
      // User not authenticated, check share token
      if (shareToken) {
        const shares = await databases.listDocuments(
          databaseId,
          sharesCollectionId,
          [Query.equal("videoId", videoId), Query.equal("token", shareToken)],
        );

        if (shares.documents.length > 0) {
          const share = shares.documents[0];
          const expiresAt = new Date(share.expiresAt).getTime();
          authorized = expiresAt > Date.now();
        }
      }
    }

    if (!authorized) {
      return jsonForbidden();
    }

    if (!video.subtitleFileId) {
      return NextResponse.json(
        { error: "Subtitle not found" },
        { status: 404 },
      );
    }

    const subtitleData = await storage.getFileDownload(
      bucketId,
      video.subtitleFileId,
    );

    logApiSuccess(ctx, `videoId=${videoId}`);

    return new NextResponse(subtitleData as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return handleApiErrorWithContext(error, "Unable to stream subtitle", ctx);
  }
}
