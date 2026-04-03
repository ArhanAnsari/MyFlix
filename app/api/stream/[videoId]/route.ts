import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  logApiStart,
  logApiSuccess,
  requireEnv,
} from "@/lib/server/api";

const VIDEO_CACHE_TTL_MS = 30_000;
const SHARE_CACHE_TTL_MS = 30_000;

type VideoCacheValue = {
  ownerId: string;
  originalFileId: string;
  expiresAt: number;
};

const videoCache = new Map<string, VideoCacheValue>();
const shareCache = new Map<
  string,
  { authorized: boolean; expiresAt: number }
>();

function getConfig() {
  const sharesCollectionId =
    process.env.APPWRITE_SHARES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION_ID ||
    "shares";

  return {
    endpoint: requireEnv("APPWRITE_ENDPOINT", process.env.APPWRITE_ENDPOINT),
    projectId: requireEnv(
      "APPWRITE_PROJECT_ID",
      process.env.APPWRITE_PROJECT_ID,
    ),
    apiKey: requireEnv("APPWRITE_API_KEY", process.env.APPWRITE_API_KEY),
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

function pickHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  return value ?? undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> },
) {
  const ctx = createApiLogContext("stream/video");

  try {
    const {
      endpoint,
      projectId,
      apiKey,
      databaseId,
      videosCollectionId,
      sharesCollectionId,
      bucketId,
    } = getConfig();
    const { videoId } = await context.params;
    const shareToken = new URL(request.url).searchParams.get("share");
    const rangeHeader = request.headers.get("range");

    logApiStart(
      ctx,
      `videoId=${videoId} hasRange=${Boolean(rangeHeader)} hasShareToken=${Boolean(shareToken)}`,
    );

    const databases = getAdminDatabases();
    const cachedVideo = videoCache.get(videoId);
    const cachedStillValid =
      Boolean(cachedVideo) && (cachedVideo?.expiresAt ?? 0) > Date.now();

    let ownerId = "";
    let originalFileId = "";

    if (cachedStillValid && cachedVideo) {
      ownerId = cachedVideo.ownerId;
      originalFileId = cachedVideo.originalFileId;
    } else {
      const video = await databases.getDocument(
        databaseId,
        videosCollectionId,
        videoId,
      );

      ownerId = String(video.userId ?? "");
      originalFileId = String(video.originalFileId ?? "");
      videoCache.set(videoId, {
        ownerId,
        originalFileId,
        expiresAt: Date.now() + VIDEO_CACHE_TTL_MS,
      });
    }

    if (!originalFileId) {
      return NextResponse.json(
        { error: "Video source not found" },
        { status: 404 },
      );
    }

    // Check access: authenticated user or valid share token
    let authorized = false;
    let authMode: "owner" | "share" | "none" = "none";

    if (shareToken) {
      const shareCacheKey = `${videoId}:${shareToken}`;
      const cachedShare = shareCache.get(shareCacheKey);
      const shareCachedValid =
        Boolean(cachedShare) && (cachedShare?.expiresAt ?? 0) > Date.now();

      if (shareCachedValid && cachedShare) {
        authorized = cachedShare.authorized;
        if (authorized) authMode = "share";
      } else {
        const shares = await databases.listDocuments(
          databaseId,
          sharesCollectionId,
          [Query.equal("videoId", videoId), Query.equal("token", shareToken)],
        );

        if (shares.documents.length > 0) {
          const share = shares.documents[0];
          const shareExpiryTs = new Date(share.expiresAt).getTime();
          authorized = shareExpiryTs > Date.now();
          if (authorized) authMode = "share";
          shareCache.set(shareCacheKey, {
            authorized,
            expiresAt: Math.min(shareExpiryTs, Date.now() + SHARE_CACHE_TTL_MS),
          });
        } else {
          shareCache.set(shareCacheKey, {
            authorized: false,
            expiresAt: Date.now() + SHARE_CACHE_TTL_MS,
          });
        }
      }
    }

    if (!authorized) {
      try {
        const user = await requireUser();
        authorized = ownerId === user.$id;
        if (authorized) authMode = "owner";
      } catch {
        // No owner session; authorization remains false.
      }
    }

    if (!authorized) {
      console.warn(
        `[api][stream/video][${ctx.requestId}] denied videoId=${videoId} hasShareToken=${Boolean(shareToken)}`,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const upstreamUrl = `${endpoint}/storage/buckets/${bucketId}/files/${originalFileId}/download?project=${projectId}`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "X-Appwrite-Key": apiKey,
        "X-Appwrite-Project": projectId,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      const body = await upstreamResponse.text().catch(() => "");
      console.error(
        `[api][stream/video][${ctx.requestId}] upstream-failed videoId=${videoId} status=${upstreamResponse.status} body=${body.slice(0, 300)}`,
      );

      return NextResponse.json(
        {
          error: "Failed to stream video",
          upstreamStatus: upstreamResponse.status,
        },
        { status: upstreamResponse.status },
      );
    }

    const response = new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          pickHeader(upstreamResponse.headers, "content-type") ?? "video/mp4",
        "Accept-Ranges":
          pickHeader(upstreamResponse.headers, "accept-ranges") ?? "bytes",
        "Content-Length":
          pickHeader(upstreamResponse.headers, "content-length") ?? "",
        "Content-Range":
          pickHeader(upstreamResponse.headers, "content-range") ?? "",
        ETag: pickHeader(upstreamResponse.headers, "etag") ?? "",
        "Last-Modified":
          pickHeader(upstreamResponse.headers, "last-modified") ?? "",
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    });

    logApiSuccess(
      ctx,
      `videoId=${videoId} mode=${authMode} status=${upstreamResponse.status}`,
    );

    return response;
  } catch (error) {
    return handleApiErrorWithContext(error, "Failed to stream video", ctx);
  }
}
