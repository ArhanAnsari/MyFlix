import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { Query } from "node-appwrite";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  jsonForbidden,
  logApiStart,
  logApiSuccess,
  requireEnv,
} from "@/lib/server/api";
import { ID } from "node-appwrite";

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

function generateShareToken(
  videoId: string,
  userId: string,
): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const tokenData = `${videoId}:${userId}:${expiresAt}`;
  const token = createHash("sha256").update(tokenData).digest("hex");
  return { token, expiresAt };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = createApiLogContext("videos/share");
  try {
    const { databaseId, videosCollectionId, sharesCollectionId } = getConfig();
    const user = await requireUser();
    const { id } = await context.params;
    logApiStart(
      ctx,
      `userId=${user.$id} videoId=${id} sharesCollectionId=${sharesCollectionId}`,
    );
    const databases = getAdminDatabases();

    // Get and verify video ownership
    const video = await databases.getDocument(
      databaseId,
      videosCollectionId,
      id,
    );

    if (video.userId !== user.$id) {
      return jsonForbidden();
    }

    // Reuse latest active share if it exists, otherwise create one.
    const existingShares = await databases.listDocuments(
      databaseId,
      sharesCollectionId,
      [
        Query.equal("videoId", id),
        Query.equal("userId", user.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );

    let token: string;
    let expiresAt: number;
    let shareId = "";
    let mode: "reused" | "updated" | "created" = "created";

    if (existingShares.documents.length > 0) {
      const existing = existingShares.documents[0];
      const existingExpiry = new Date(existing.expiresAt).getTime();
      if (existingExpiry > Date.now() && typeof existing.token === "string") {
        token = existing.token;
        expiresAt = existingExpiry;
        shareId = existing.$id;
        mode = "reused";
      } else {
        const generated = generateShareToken(id, user.$id);
        token = generated.token;
        expiresAt = generated.expiresAt;

        const updated = await databases.updateDocument(
          databaseId,
          sharesCollectionId,
          existing.$id,
          {
            token,
            expiresAt: new Date(expiresAt).toISOString(),
          },
        );
        shareId = updated.$id;
        mode = "updated";
      }
    } else {
      const generated = generateShareToken(id, user.$id);
      token = generated.token;
      expiresAt = generated.expiresAt;

      const created = await databases.createDocument(
        databaseId,
        sharesCollectionId,
        ID.unique(),
        {
          videoId: id,
          userId: user.$id,
          token,
          expiresAt: new Date(expiresAt).toISOString(),
        },
      );
      shareId = created.$id;
      mode = "created";
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${token}`;

    logApiSuccess(
      ctx,
      `userId=${user.$id} videoId=${id} mode=${mode} shareId=${shareId} sharesCollectionId=${sharesCollectionId}`,
    );

    return NextResponse.json({
      shareUrl,
      expiresAt,
      shareId,
      mode,
      sharesCollectionId,
    });
  } catch (error) {
    return handleApiErrorWithContext(
      error,
      "Failed to generate share link",
      ctx,
    );
  }
}
