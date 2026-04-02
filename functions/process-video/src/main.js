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
    console.log(`[FFmpeg HLS] Starting HLS conversion: ${inputPath} -> ${hlsDir}`);
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
      .on("end", () => {
        console.log("[FFmpeg HLS] Conversion completed");
        resolve();
      })
      .on("error", (err) => {
        console.error(`[FFmpeg HLS] Error: ${err.message}`);
        reject(err);
      })
      .run();
  });

  const thumbPromise = new Promise((resolve, reject) => {
    console.log(`[FFmpeg Thumbnail] Starting thumbnail generation: ${inputPath} -> ${thumbPath}`);
    ffmpeg(inputPath)
      .seekInput(2)
      .frames(1)
      .outputOptions(["-q:v 2"])
      .output(thumbPath)
      .on("end", () => {
        console.log("[FFmpeg Thumbnail] Thumbnail generated");
        resolve();
      })
      .on("error", (err) => {
        console.error(`[FFmpeg Thumbnail] Error: ${err.message}`);
        reject(err);
      })
      .run();
  });

  await Promise.all([hlsPromise, thumbPromise]);
};

const handler = async ({ req, res, log, error }) => {
  try {
    log("=== FUNCTION START ===");
    log(`Endpoint: ${endpoint}`);
    log(`ProjectId: ${projectId}`);
    log(`ApiKey: ${apiKey ? "SET" : "NOT SET"}`);
    log(`DatabaseId: ${databaseId}`);
    log(`VideosCollectionId: ${videosCollectionId}`);
    log(`BucketId: ${bucketId}`);

    if (!endpoint || !projectId || !apiKey || !databaseId || !videosCollectionId || !bucketId) {
      const missingVars = [];
      if (!endpoint) missingVars.push("endpoint");
      if (!projectId) missingVars.push("projectId");
      if (!apiKey) missingVars.push("apiKey");
      if (!databaseId) missingVars.push("databaseId");
      if (!videosCollectionId) missingVars.push("videosCollectionId");
      if (!bucketId) missingVars.push("bucketId");
      
      const errMsg = `Missing required function environment variables: ${missingVars.join(", ")}`;
      error(errMsg);
      return res.json({ error: errMsg }, 500);
    }

    log("Environment variables verified");

    log(`Request body: ${req.body}`);
    const payload = JSON.parse(req.body || "{}");
    log(`Parsed payload: ${JSON.stringify(payload)}`);
    
    const { videoId, fileId, userId } = payload;
    log(`VideoId: ${videoId}, FileId: ${fileId}, UserId: ${userId}`);

    if (!videoId || !fileId || !userId) {
      const missingFields = [];
      if (!videoId) missingFields.push("videoId");
      if (!fileId) missingFields.push("fileId");
      if (!userId) missingFields.push("userId");
      
      const errMsg = `Missing required payload fields: ${missingFields.join(", ")}`;
      error(errMsg);
      return res.json({ error: errMsg }, 400);
    }

    log("Starting asynchronous video processing...");
    
    // Return immediately without waiting for FFmpeg
    // Process video in background (fire-and-forget)
    processVideoAsync(videoId, fileId, userId, { log, error }).catch((err) => {
      error(`Background processing error: ${err?.message || String(err)}`);
    });

    return res.json({ ok: true, message: "Processing started in background" });

  } catch (err) {
    error(`FATAL ERROR: ${err?.message || String(err)}`);
    error(`Stack: ${err?.stack}`);
    return res.json({ error: err?.message || "Processing failed" }, 500);
  }
};

// Async processing function that runs in background
const processVideoAsync = async (videoId, fileId, userId, { log, error }) => {
  try {
    log(`=== BACKGROUND PROCESSING START (VideoId: ${videoId}) ===`);

    log("Creating Appwrite client...");
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const storage = new Storage(client);
    const databases = new Databases(client);
    log("Client created successfully");

    log("Creating work directory...");
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "myflix-"));
    log(`Work directory created: ${workDir}`);
    
    const inputPath = path.join(workDir, "input.mp4");
    const hlsDir = path.join(workDir, "hls");
    const thumbPath = path.join(workDir, "thumbnail.jpg");

    log("Creating HLS directory...");
    await fs.mkdir(hlsDir, { recursive: true });
    log(`HLS directory created: ${hlsDir}`);

    log(`Downloading original file (fileId: ${fileId}) from bucket (${bucketId})...`);
    const original = await storage.getFileDownload(bucketId, fileId);
    log(`File downloaded, size: ${Buffer.from(original).length} bytes`);
    
    log("Writing input file...");
    await fs.writeFile(inputPath, Buffer.from(original));
    log(`Input file written: ${inputPath}`);

    log("Running FFmpeg conversion...");
    await runFfmpeg(inputPath, hlsDir, thumbPath);
    log("FFmpeg conversion completed");

    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
    log(`Permissions configured for userId: ${userId}`);

    log("Reading HLS directory...");
    const files = await fs.readdir(hlsDir);
    log(`Files in HLS directory: ${files.join(", ")}`);
    
    const segmentIdByName = new Map();

    log("Uploading MPEG-TS segments...");
    for (const filename of files.filter((file) => file.endsWith(".ts"))) {
      log(`  Uploading segment: ${filename}`);
      const filePath = path.join(hlsDir, filename);
      const fileStream = createReadStream(filePath);
      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        fileStream,
        permissions,
      );
      log(`  Segment uploaded: ${filename} -> ${uploaded.$id}`);
      segmentIdByName.set(filename, uploaded.$id);
    }
    log(`${segmentIdByName.size} segments uploaded`);

    log("Rewriting HLS manifest...");
    const playlistPath = path.join(hlsDir, "master.m3u8");
    const playlistRaw = await fs.readFile(playlistPath, "utf8");
    log(`Original manifest length: ${playlistRaw.length} bytes`);
    
    const playlistRewritten = playlistRaw
      .split("\n")
      .map((line) => {
        if (!line.endsWith(".ts")) return line;
        const segmentId = segmentIdByName.get(line);
        if (!segmentId) return line;
        return `/api/stream/${videoId}/segment/${segmentId}`;
      })
      .join("\n");
    
    log(`Rewritten manifest length: ${playlistRewritten.length} bytes`);

    log("Writing rewritten manifest to disk...");
    await fs.writeFile(playlistPath, playlistRewritten, "utf8");
    log("Manifest written");

    log("Uploading HLS manifest...");
    const manifestStream = createReadStream(playlistPath);
    const manifestFile = await storage.createFile(
      bucketId,
      ID.unique(),
      manifestStream,
      permissions,
    );
    log(`Manifest uploaded: ${manifestFile.$id}`);

    log("Uploading thumbnail...");
    const thumbnailStream = createReadStream(thumbPath);
    const thumbnailFile = await storage.createFile(
      bucketId,
      ID.unique(),
      thumbnailStream,
      permissions,
    );
    log(`Thumbnail uploaded: ${thumbnailFile.$id}`);

    const thumbnailUrl = `${endpoint}/storage/buckets/${bucketId}/files/${thumbnailFile.$id}/view?project=${projectId}`;
    log(`Thumbnail URL: ${thumbnailUrl}`);

    log(`Updating database document (${videoId})...`);
    await databases.updateDocument(databaseId, videosCollectionId, videoId, {
      hlsFileId: manifestFile.$id,
      thumbnailUrl,
      processingStatus: "completed",
    });
    log("Document updated successfully");

    log(`Processed video ${videoId} successfully`);
    
    // Cleanup
    log("Cleaning up work directory...");
    await fs.rm(workDir, { recursive: true, force: true });
    log("Cleanup complete");
    
  } catch (err) {
    error(`BACKGROUND PROCESSING ERROR: ${err?.message || String(err)}`);
    error(`Stack: ${err?.stack}`);
    
    try {
      log("Marking video as failed...");
      const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
      const databases = new Databases(client);
      await databases.updateDocument(databaseId, videosCollectionId, videoId, {
        processingStatus: "failed",
      });
      log(`Video ${videoId} marked as failed`);
    } catch (cleanupErr) {
      error(`Failed to mark as failed: ${cleanupErr?.message}`);
    }
  }
};

export default handler;
