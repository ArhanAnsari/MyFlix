import { Client, Databases, IndexType, Permission, Role, Storage } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const databaseId = process.env.APPWRITE_DATABASE_ID;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID;
const historyCollectionId = process.env.APPWRITE_WATCH_HISTORY_COLLECTION_ID;
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID;

if (!endpoint || !projectId || !apiKey || !databaseId || !videosCollectionId || !historyCollectionId || !bucketId) {
  throw new Error("Missing required Appwrite environment variables");
}

async function ensureDatabase(databases) {
  try {
    await databases.get(databaseId);
    console.log(`Database ${databaseId} already exists`);
  } catch {
    await databases.create(databaseId, "myflix");
    console.log(`Created database ${databaseId}`);
  }
}

async function ensureBucket(storage) {
  try {
    await storage.getBucket(bucketId);
    console.log(`Bucket ${bucketId} already exists`);
  } catch {
    await storage.createBucket(
      bucketId,
      "videos_bucket",
      [Permission.read(Role.users()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())],
      false,
      true,
      5368709120,
      ["mp4", "webm", "mov", "mkv", "avi", "flv", "ogv", "3gp", "m4v", "m3u8", "ts", "jpg", "jpeg", "png", "vtt"],
    );
    console.log(`Created bucket ${bucketId}`);
  }
}

async function ensureVideosCollection(databases) {
  try {
    await databases.getCollection(databaseId, videosCollectionId);
    console.log(`Collection ${videosCollectionId} already exists`);
    return;
  } catch {
    await databases.createCollection(databaseId, videosCollectionId, "videos");
  }

  await databases.createStringAttribute(databaseId, videosCollectionId, "userId", 64, true);
  await databases.createStringAttribute(databaseId, videosCollectionId, "title", 255, true);
  await databases.createStringAttribute(databaseId, videosCollectionId, "description", 5000, false, "");
  await databases.createStringAttribute(databaseId, videosCollectionId, "originalFileId", 64, true);
  await databases.createStringAttribute(databaseId, videosCollectionId, "hlsFileId", 64, false, "");
  await databases.createStringAttribute(databaseId, videosCollectionId, "subtitleFileId", 64, false, "");
  await databases.createStringAttribute(databaseId, videosCollectionId, "thumbnailUrl", 1000, false, "");
  await databases.createFloatAttribute(databaseId, videosCollectionId, "duration", true);
  await databases.createFloatAttribute(databaseId, videosCollectionId, "size", true);
  await databases.createDatetimeAttribute(databaseId, videosCollectionId, "createdAt", true);

  await databases.createIndex(
    databaseId,
    videosCollectionId,
    "videos_user_id",
    IndexType.Key,
    ["userId"],
    ["ASC"],
  );

  await databases.createIndex(
    databaseId,
    videosCollectionId,
    "videos_created_at",
    IndexType.Key,
    ["createdAt"],
    ["DESC"],
  );

  await databases.createIndex(
    databaseId,
    videosCollectionId,
    "videos_title_search",
    IndexType.Fulltext,
    ["title"],
  );

  console.log(`Configured collection ${videosCollectionId}`);
}

async function ensureHistoryCollection(databases) {
  try {
    await databases.getCollection(databaseId, historyCollectionId);
    console.log(`Collection ${historyCollectionId} already exists`);
    return;
  } catch {
    await databases.createCollection(databaseId, historyCollectionId, "watch_history");
  }

  await databases.createStringAttribute(databaseId, historyCollectionId, "userId", 64, true);
  await databases.createStringAttribute(databaseId, historyCollectionId, "videoId", 64, true);
  await databases.createFloatAttribute(databaseId, historyCollectionId, "progress", true);
  await databases.createDatetimeAttribute(databaseId, historyCollectionId, "updatedAt", true);

  await databases.createIndex(
    databaseId,
    historyCollectionId,
    "history_user_id",
    IndexType.Key,
    ["userId"],
    ["ASC"],
  );

  await databases.createIndex(
    databaseId,
    historyCollectionId,
    "history_video_id",
    IndexType.Key,
    ["videoId"],
    ["ASC"],
  );

  console.log(`Configured collection ${historyCollectionId}`);
}

async function main() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);
  const storage = new Storage(client);

  await ensureDatabase(databases);
  await ensureBucket(storage);
  await ensureVideosCollection(databases);
  await ensureHistoryCollection(databases);

  console.log("Appwrite setup complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
