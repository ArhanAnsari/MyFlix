import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

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

const createTimeoutPromise = (ms) => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`FFmpeg operation timed out after ${ms}ms`)), ms)
  );
};

const runFfmpeg = async (inputPath, hlsDir, thumbPath, fileSize) => {
  // Calculate timeout based on file size (roughly 1 min per GB, min 10 min, max 60 min for 5GB)
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  const timeoutMs = Math.max(600000, Math.min(3600000, fileSizeGB * 60000));
  
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

  try {
    await Promise.race([
      Promise.all([hlsPromise, thumbPromise]),
      createTimeoutPromise(timeoutMs)
    ]);
  } catch (err) {
    throw new Error(`FFmpeg processing failed: ${err.message || String(err)}`);
  }
};

const uploadFile = async (storage, bucketId, filePath, filename, userId, permissions) => {
  return new Promise((resolve, reject) => {
    const fileStream = fsSync.createReadStream(filePath);
    
    storage.createFile(
      bucketId,
      ID.unique(),
      fileStream,
      permissions
    )
      .then(resolve)
      .catch(reject);
  });
};

const handler = async ({ req, res, log, error }) => {
  let workDir;
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

    // Update status to "processing"
    await databases.updateDocument(databaseId, videosCollectionId, videoId, {
      processingStatus: "processing",
    });

    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB limit
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "myflix-"));
    const inputPath = path.join(workDir, "input.mp4");
    const hlsDir = path.join(workDir, "hls");
    const thumbPath = path.join(workDir, "thumbnail.jpg");

    await fs.mkdir(hlsDir, { recursive: true });

    log(`Downloading video ${videoId} from storage file ${fileId}`);
    const original = await storage.getFileDownload(bucketId, fileId);
    const buffer = Buffer.from(original);

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 5GB limit (size: ${(buffer.length / (1024 * 1024 * 1024)).toFixed(2)}GB)`);
    }

    await fs.writeFile(inputPath, buffer);
    log(`Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)}MB, starting ffmpeg processing`);

    await runFfmpeg(inputPath, hlsDir, thumbPath, buffer.length);

    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    const files = await fs.readdir(hlsDir);
    const segmentIdByName = new Map();

    // Upload segments sequentially to avoid race conditions
    for (const filename of files.filter((file) => file.endsWith(".ts"))) {
      try {
        const uploaded = await uploadFile(
          storage,
          bucketId,
          path.join(hlsDir, filename),
          filename,
          userId,
          permissions
        );
        segmentIdByName.set(filename, uploaded.$id);
        log(`Uploaded segment ${filename}`);
      } catch (err) {
        log(`Warning: Failed to upload segment ${filename}: ${err.message}`);
      }
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

    // Upload manifest
    const manifestFile = await uploadFile(
      storage,
      bucketId,
      playlistPath,
      "master.m3u8",
      userId,
      permissions
    );

    // Upload thumbnail
    const thumbnailFile = await uploadFile(
      storage,
      bucketId,
      thumbPath,
      "thumbnail.jpg",
      userId,
      permissions
    );

    const thumbnailUrl = `${endpoint}/storage/buckets/${bucketId}/files/${thumbnailFile.$id}/view?project=${projectId}`;

    await databases.updateDocument(databaseId, videosCollectionId, videoId, {
      hlsFileId: manifestFile.$id,
      thumbnailUrl,
      processingStatus: "completed",
    });

    log(`Successfully processed video ${videoId}`);
    return res.json({ ok: true });
  } catch (err) {
    const errorMsg = err?.message || String(err);
    error(`Video processing failed for ${videoId}: ${errorMsg}`);
    
    try {
      // Mark video as failed
      const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
      const databases = new Databases(client);
      await databases.updateDocument(
        databaseId,
        videosCollectionId,
        videoId,
        { processingStatus: "failed" }
      );
    } catch (updateErr) {
      error(`Failed to update video status to failed: ${updateErr?.message || String(updateErr)}`);
    }
    
    // Clean up temporary directory
    if (workDir) {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        error(`Failed to cleanup directory: ${cleanupErr?.message || String(cleanupErr)}`);
      }
    }
    
    return res.json({ error: errorMsg }, 500);
  } finally {
    // Ensure cleanup happens
    if (workDir) {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error(`Final cleanup failed: ${cleanupErr?.message}`);
      }
    }
  }
};

export default handler;
