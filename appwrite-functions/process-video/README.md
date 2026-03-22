# MyFlix Video Processing Function

This Appwrite Function processes an uploaded source video using FFmpeg.

## What it does

1. Downloads original source file from Appwrite Storage.
2. Compresses and converts video to HLS playlist + chunks.
3. Captures a thumbnail at 2 seconds.
4. Uploads HLS chunks, playlist, and thumbnail back to Storage.
5. Rewrites playlist chunk URLs to internal MyFlix stream proxy endpoints.
6. Updates the corresponding `videos` document with:
   - `hlsFileId`
   - `thumbnailUrl`

## Required environment variables

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_VIDEOS_COLLECTION_ID`
- `APPWRITE_STORAGE_BUCKET_ID`

## Function payload

```json
{
  "videoId": "<videos-document-id>",
  "fileId": "<original-file-id>",
  "userId": "<owner-user-id>"
}
```

## Runtime and dependencies

- Node.js 20+
- `ffmpeg-static`
- `fluent-ffmpeg`
- `node-appwrite`
