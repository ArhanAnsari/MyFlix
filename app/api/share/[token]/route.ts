import { NextResponse } from "next/server";

import { getAdminDatabases } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  logApiStart,
  logApiSuccess,
  requireEnv,
} from "@/lib/server/api";
import { Query } from "node-appwrite";

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
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const ctx = createApiLogContext("share/token");
  try {
    const { databaseId, videosCollectionId, sharesCollectionId } = getConfig();
    const { token } = await context.params;
    logApiStart(ctx, `tokenPrefix=${token.slice(0, 8)}`);
    const databases = getAdminDatabases();

    // Query share record by token
    const shares = await databases.listDocuments(
      databaseId,
      sharesCollectionId,
      [Query.equal("token", token)],
    );

    if (!shares.documents || shares.documents.length === 0) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    const share = shares.documents[0];

    // Check if expired
    const expiresAt = new Date(share.expiresAt).getTime();
    if (expiresAt < Date.now()) {
      return NextResponse.json(
        { error: "Share link expired" },
        { status: 410 },
      );
    }

    // Get video
    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      share.videoId,
    );

    logApiSuccess(ctx, `videoId=${video.$id}`);

    return NextResponse.json({ video, share });
  } catch (error) {
    return handleApiErrorWithContext(
      error,
      "Failed to retrieve shared video",
      ctx,
    );
  }
}
