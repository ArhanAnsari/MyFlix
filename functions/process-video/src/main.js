import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createReadStream } from "node:fs";
import {
  Client,
  Databases,
  Storage,
  ID,
  Permission,
  Role,
} from "node-appwrite";

ffmpeg.setFfmpegPath(ffmpegPath);

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const videosCollectionId = process.env.APPWRITE_VIDEOS_COLLECTION_ID;
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID;

const runFfmpeg = async (inputPath, hlsDir, thumbPath) => {
  const hlsPromise = new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf scale='min(1280,iw)':-2",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-hls_time 6",
        "-hls_playlist_type vod",
        `-hls_segment_filename ${path.join(hlsDir, "segment_%03d.ts")}`,
      ])
      .output(path.join(hlsDir, "master.m3u8"))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const thumbPromise = new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(2)
      .frames(1)
      .outputOptions(["-q:v 2"])
      .output(thumbPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  await Promise.all([hlsPromise, thumbPromise]);
};

const handler = async ({ req, res, log, error }) => {
  try {
    if (!endpoint || !projectId || !apiKey || !databaseId || !videosCollectionId || !bucketId) {
      return res.json({ error: "Missing required function environment variables" }, 500);
    }

    const payload = JSON.parse(req.body || "{}");
    const { videoId, fileId, userId } = payload;

    if (!videoId || !fileId || !userId) {
      return res.json({ error: "Missing payload" }, 400);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const storage = new Storage(client);
    const databases = new Databases(client);

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "myflix-"));
    const inputPath = path.join(workDir, "input.mp4");
    const hlsDir = path.join(workDir, "hls");
    const thumbPath = path.join(workDir, "thumbnail.jpg");

    await fs.mkdir(hlsDir, { recursive: true });

    const original = await storage.getFileDownload(bucketId, fileId);
    await fs.writeFile(inputPath, Buffer.from(original));

    await runFfmpeg(inputPath, hlsDir, thumbPath);

    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    const files = await fs.readdir(hlsDir);
    const segmentIdByName = new Map();

    for (const filename of files.filter((file) => file.endsWith(".ts"))) {
      const filePath = path.join(hlsDir, filename);
      const fileStream = createReadStream(filePath);
      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        fileStream,
        permissions,
      );
      segmentIdByName.set(filename, uploaded.$id);
    }

    const playlistPath = path.join(hlsDir, "master.m3u8");
    const playlistRaw = await fs.readFile(playlistPath, "utf8");
    const playlistRewritten = playlistRaw
      .split("\n")
      .map((line) => {
        if (!line.endsWith(".ts")) return line;
        const segmentId = segmentIdByName.get(line);
        if (!segmentId) return line;
        return `/api/stream/${videoId}/segment/${segmentId}`;
      })
      .join("\n");

    await fs.writeFile(playlistPath, playlistRewritten, "utf8");

    const manifestStream = createReadStream(playlistPath);
    const manifestFile = await storage.createFile(
      bucketId,
      ID.unique(),
      manifestStream,
      permissions,
    );

    const thumbnailStream = createReadStream(thumbPath);
    const thumbnailFile = await storage.createFile(
      bucketId,
      ID.unique(),
      thumbnailStream,
      permissions,
    );

    const thumbnailUrl = `${endpoint}/storage/buckets/${bucketId}/files/${thumbnailFile.$id}/view?project=${projectId}`;

    await databases.updateDocument(databaseId, videosCollectionId, videoId, {
      hlsFileId: manifestFile.$id,
      thumbnailUrl,
      processingStatus: "completed",
    });

    log(`Processed video ${videoId}`);
    return res.json({ ok: true });
  } catch (err) {
    error(err?.message || String(err));
    try {
      const { videoId } = JSON.parse(req.body || "{}");
      if (videoId) {
        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const databases = new Databases(client);
        await databases.updateDocument(databaseId, videosCollectionId, videoId, {
          processingStatus: "failed",
        });
      }
    } catch {}
    return res.json({ error: err?.message || "Processing failed" }, 500);
  }
};

export default handler;
