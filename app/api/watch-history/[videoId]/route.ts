import { Permission, Query, Role } from "node-appwrite";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAdminDatabases } from "@/lib/appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const historyCollectionId = process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID!;

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const user = await requireUser();
    const { videoId } = await context.params;
    const databases = getAdminDatabases();

    const docs = await databases.listDocuments(databaseId, historyCollectionId, [
      Query.equal("userId", user.$id),
      Query.equal("videoId", videoId),
      Query.limit(1),
    ]);

    return NextResponse.json({
      progress: docs.documents[0]?.progress ?? 0,
      updatedAt: docs.documents[0]?.updatedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch history";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const user = await requireUser();
    const { videoId } = await context.params;
    const body = (await request.json()) as { progress?: number };

    if (typeof body.progress !== "number") {
      return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
    }

    const databases = getAdminDatabases();
    const documentId = `${user.$id}_${videoId}`;

    try {
      await databases.updateDocument(databaseId, historyCollectionId, documentId, {
        progress: body.progress,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      await databases.createDocument(
        databaseId,
        historyCollectionId,
        documentId,
        {
          userId: user.$id,
          videoId,
          progress: body.progress,
          updatedAt: new Date().toISOString(),
        },
        [Permission.read(Role.user(user.$id)), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update history";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
