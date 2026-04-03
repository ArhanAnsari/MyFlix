import { ID, Permission, Query, Role } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminStorage } from "@/lib/appwrite";
import { PAGE_SIZE } from "@/lib/constants";
import {
  buildThumbnailUrl,
  generateSvgThumbnail,
  uploadSvgThumbnail,
} from "@/lib/server/thumbnail";
import {
  createApiLogContext,
  handleApiErrorWithContext,
  logApiStart,
  logApiSuccess,
  parsePositiveInt,
  requireEnv,
} from "@/lib/server/api";

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

export async function GET(request: Request) {
  const ctx = createApiLogContext("videos/list");
  try {
    const { endpoint, projectId, databaseId, videosCollectionId, bucketId } =
      getConfig();
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    logApiStart(ctx, `userId=${user.$id}`);

    const page = parsePositiveInt(searchParams.get("page"), 1, 1, 10000);
    const limit = parsePositiveInt(
      searchParams.get("limit"),
      PAGE_SIZE,
      1,
      100,
    );
    const search = searchParams.get("search")?.trim();
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

    const queries: string[] = [
      Query.equal("userId", user.$id),
      Query.limit(limit),
      Query.offset((page - 1) * limit),
      sort === "asc"
        ? Query.orderAsc("createdAt")
        : Query.orderDesc("createdAt"),
    ];

    if (search) {
      queries.push(Query.search("title", search));
    }

    const databases = getAdminDatabases();
    const storage = getAdminStorage();
    const result = await databases.listDocuments(
      databaseId,
      videosCollectionId,
      queries,
    );

    // Self-heal legacy statuses now that direct streaming is immediate.
    const docsNeedingUpdate = result.documents.filter(
      (doc) =>
        doc.originalFileId &&
        doc.processingStatus &&
        doc.processingStatus !== "completed",
    );

    if (docsNeedingUpdate.length > 0) {
      await Promise.allSettled(
        docsNeedingUpdate.map((doc) =>
          databases.updateDocument(databaseId, videosCollectionId, doc.$id, {
            processingStatus: "completed",
          }),
        ),
      );
      for (const doc of docsNeedingUpdate) {
        doc.processingStatus = "completed";
      }
    }

    const missingThumbDocs = result.documents.filter(
      (doc) => !doc.thumbnailUrl || String(doc.thumbnailUrl).trim() === "",
    );
    let thumbsFailed = 0;

    if (missingThumbDocs.length > 0) {
      for (const doc of missingThumbDocs) {
        try {
          const svg = generateSvgThumbnail(doc.title || "Video");
          const thumbnailFileId = await uploadSvgThumbnail(
            storage,
            bucketId,
            doc.userId,
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
            doc.$id,
            {
              thumbnailUrl,
            },
          );
          doc.thumbnailUrl = thumbnailUrl;
        } catch (err) {
          thumbsFailed += 1;
          console.error(
            `[api][videos/list][${ctx.requestId}] thumbnail-fill-failed videoId=${doc.$id}`,
            err,
          );
        }
      }
    }

    logApiSuccess(
      ctx,
      `userId=${user.$id} returned=${result.documents.length} healed=${docsNeedingUpdate.length} thumbsAttempted=${missingThumbDocs.length} thumbsFailed=${thumbsFailed}`,
    );

    return NextResponse.json({
      videos: result.documents,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return handleApiErrorWithContext(error, "Failed to fetch videos", ctx);
  }
}

export async function POST(request: Request) {
  const ctx = createApiLogContext("videos/create");
  try {
    const { endpoint, projectId, databaseId, videosCollectionId, bucketId } =
      getConfig();
    const user = await requireUser();
    logApiStart(ctx, `userId=${user.$id}`);
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      originalFileId?: string;
      subtitleFileId?: string;
      size?: number;
      duration?: number;
    };

    if (!body.title || !body.originalFileId || typeof body.size !== "number") {
      return NextResponse.json(
        { error: "Invalid video metadata" },
        { status: 400 },
      );
    }

    const databases = getAdminDatabases();
    const storage = getAdminStorage();
    const document = await databases.createDocument(
      databaseId,
      videosCollectionId,
      ID.unique(),
      {
        userId: user.$id,
        title: body.title,
        description: body.description ?? "",
        originalFileId: body.originalFileId,
        hlsFileId: "",
        subtitleFileId: body.subtitleFileId ?? "",
        thumbnailUrl: "",
        duration: body.duration ?? 0,
        size: body.size,
        processingStatus: "completed",
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ],
    );

    try {
      const svg = generateSvgThumbnail(body.title);
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

      document.thumbnailUrl = thumbnailUrl;

      await databases.updateDocument(
        databaseId,
        videosCollectionId,
        document.$id,
        {
          thumbnailUrl,
        },
      );
    } catch (thumbnailErr) {
      console.warn(
        `[api][videos/create][${ctx.requestId}] thumbnail-generation-failed`,
        thumbnailErr,
      );
    }

    logApiSuccess(ctx, `userId=${user.$id} videoId=${document.$id}`);

    return NextResponse.json({ video: document }, { status: 201 });
  } catch (error) {
    return handleApiErrorWithContext(
      error,
      "Failed to create video record",
      ctx,
    );
  }
}
