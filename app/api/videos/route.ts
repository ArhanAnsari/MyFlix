import { ID, Permission, Query, Role } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases, getAdminFunctions } from "@/lib/appwrite";
import { PAGE_SIZE } from "@/lib/constants";
import { handleApiError, parsePositiveInt, requireEnv } from "@/lib/server/api";

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
    functionId: process.env.APPWRITE_VIDEO_FUNCTION_ID,
  };
}

export async function GET(request: Request) {
  try {
    const { databaseId, videosCollectionId } = getConfig();
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

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
    const result = await databases.listDocuments(
      databaseId,
      videosCollectionId,
      queries,
    );

    return NextResponse.json({
      videos: result.documents,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch videos");
  }
}

export async function POST(request: Request) {
  try {
    const { databaseId, videosCollectionId, functionId } = getConfig();
    const user = await requireUser();
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
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ],
    );

    if (functionId) {
      const functions = getAdminFunctions();
      await functions.createExecution(
        functionId,
        JSON.stringify({
          videoId: document.$id,
          fileId: body.originalFileId,
          userId: user.$id,
        }),
        false,
      );
    }

    return NextResponse.json({ video: document }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create video record");
  }
}
