# MyFlix Appwrite Setup Guide (A to Z)

This guide configures Appwrite for the current MyFlix codebase, including auth, storage, database collections, FFmpeg function flow, subtitle support (`.vtt`), and secure stream proxy playback.

## 1. Prerequisites

- Appwrite Cloud or self-hosted Appwrite instance
- Node.js 20+
- MyFlix codebase with `.env.local` configured from `.env.example`

## 2. Create Appwrite Project

1. Open Appwrite Console.
2. Create project: `myflix`.
3. Copy:
   - `Project ID`
   - `Endpoint`

Set these in `.env.local`:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
```

## 3. Configure Authentication

1. In Appwrite Console -> Auth -> Settings.
2. Enable `Email/Password` provider.
3. Add platform for your web app origin (local + production domains).

MyFlix auth routes use these files:

- `app/api/auth/signup/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`

Session persistence is done through cookie `myflix_session`.

## 4. Create API Key

1. Appwrite Console -> Overview/Project Settings -> API Keys.
2. Create server key for backend routes and setup script.
3. Grant scopes for:
   - Users
   - Databases
   - Storage
   - Functions

Set in `.env.local`:

```bash
APPWRITE_API_KEY=your_server_api_key
```

## 5. Define IDs and Env Vars

Recommended values:

```bash
APPWRITE_DATABASE_ID=myflix_db
APPWRITE_VIDEOS_COLLECTION_ID=videos
APPWRITE_WATCH_HISTORY_COLLECTION_ID=watch_history
APPWRITE_STORAGE_BUCKET_ID=videos_bucket_id
APPWRITE_VIDEO_FUNCTION_ID=process_video_function_id
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=videos_bucket_id
```

Keep `APPWRITE_STORAGE_BUCKET_ID` and `NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID` aligned.

## 6. Run Automated Setup Script

The script creates database, storage bucket, and collections.

```bash
npm run appwrite:setup
```

Script file:

- `scripts/appwrite-setup.mjs`

## 7. Storage Bucket Configuration

Bucket created by script:

- Name: `videos_bucket`
- Max file size: `5GB`
- Allowed extensions:
  - `mp4`, `webm`, `mov`
  - `m3u8`, `ts`
  - `jpg`, `jpeg`, `png`
  - `vtt`

Permissions model in app:

- Files uploaded with owner-only file permissions (`read/update/delete` for `Role.user(userId)`).

## 8. Database Schema

Database: `myflix_db` (or your chosen ID).

### 8.1 `videos` collection

Required attributes:

- `userId` (string, 64)
- `title` (string, 255)
- `description` (string, 5000, optional, default `""`)
- `originalFileId` (string, 64)
- `hlsFileId` (string, 64, optional, default `""`)
- `subtitleFileId` (string, 64, optional, default `""`)
- `thumbnailUrl` (string, 1000, optional, default `""`)
- `duration` (float)
- `size` (float)
- `createdAt` (datetime)

Indexes:

- `videos_user_id` -> key index on `userId`
- `videos_created_at` -> key index on `createdAt` (DESC)
- `videos_title_search` -> fulltext index on `title`

### 8.2 `watch_history` collection

Required attributes:

- `userId` (string, 64)
- `videoId` (string, 64)
- `progress` (float)
- `updatedAt` (datetime)

Indexes:

- `history_user_id` -> key index on `userId`
- `history_video_id` -> key index on `videoId`

## 9. Deploy FFmpeg Appwrite Function

Function directory:

- `appwrite-functions/process-video`

### 9.1 Create function in Appwrite

1. Functions -> Create function
2. Runtime: Node.js 20+
3. Function ID: your value for `APPWRITE_VIDEO_FUNCTION_ID`
4. Deploy source from `appwrite-functions/process-video`

### 9.2 Function environment variables

Set in function env:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key
APPWRITE_DATABASE_ID=myflix_db
APPWRITE_VIDEOS_COLLECTION_ID=videos
APPWRITE_STORAGE_BUCKET_ID=videos_bucket_id
```

### 9.3 Function behavior

After upload metadata is created, backend triggers function with payload:

```json
{
  "videoId": "<videos doc id>",
  "fileId": "<original source file id>",
  "userId": "<owner user id>"
}
```

Function steps:

1. Download original video from Storage.
2. Compress and convert to HLS (`master.m3u8` + `segment_*.ts`).
3. Generate thumbnail frame at 2 seconds.
4. Upload HLS chunks, playlist, and thumbnail.
5. Rewrite playlist segment URLs to internal stream proxy routes:
   - `/api/stream/{videoId}/segment/{segmentId}`
6. Update `videos` doc with:
   - `hlsFileId`
   - `thumbnailUrl`

## 10. Secure Stream Proxy (No Raw Segment URLs)

Implemented endpoints:

- `GET /api/stream/[videoId]/manifest`
- `GET /api/stream/[videoId]/segment/[segmentId]`

Security checks performed server-side:

1. Validate logged-in user session.
2. Load target video document.
3. Enforce owner check: `video.userId === currentUser.$id`.
4. For segment route, verify `segmentId` exists in stored manifest.

This ensures HLS chunks are only served to the owner and raw storage paths are hidden from frontend code.

## 11. Subtitle Upload and Playback (`.vtt`)

Implemented in upload flow:

- Optional subtitle file selector in `components/upload/upload-dropzone.tsx`
- Validates extension/type for `.vtt`
- Uploads subtitle file to same bucket with owner-only permissions
- Stores `subtitleFileId` in `videos` document

Subtitle streaming endpoint:

- `GET /api/subtitles/[videoId]`

Playback integration:

- `components/video/video-player.tsx` adds `<track kind="subtitles">`
- `app/video/[id]/page.tsx` passes subtitle proxy URL when available

## 12. App Routes to Verify

1. Signup/Login works.
2. Upload accepts `mp4/webm/mov` up to 5GB.
3. Optional subtitle `.vtt` uploads successfully.
4. New upload appears in dashboard.
5. After function completes, video plays from `/api/stream/...` endpoints.
6. Resume progress updates every 5 seconds.
7. Subtitle track is selectable in native controls.
8. Delete video removes related files (source, manifest, segments, thumbnail, subtitle).

## 13. Required Code Files (Reference)

Core Appwrite integration:

- `lib/appwrite.ts`
- `lib/auth.ts`
- `scripts/appwrite-setup.mjs`

Video and stream APIs:

- `app/api/videos/route.ts`
- `app/api/videos/[id]/route.ts`
- `app/api/watch-history/[videoId]/route.ts`
- `app/api/stream/[videoId]/manifest/route.ts`
- `app/api/stream/[videoId]/segment/[segmentId]/route.ts`
- `app/api/subtitles/[videoId]/route.ts`

Function:

- `appwrite-functions/process-video/index.js`

## 14. Production Hardening Checklist

- Use least-privilege API key scopes.
- Restrict function and app origins.
- Use HTTPS-only domains.
- Monitor function execution limits/timeouts for large files.
- Add alerting for failed function executions.
- Periodically verify orphaned file cleanup.

## 15. Troubleshooting

- Upload succeeds but no playback:
  - Check function logs and verify `APPWRITE_VIDEO_FUNCTION_ID`.
- Playback 403 on segment:
  - Confirm user owns video and manifest has segment IDs.
- Subtitle missing:
  - Ensure `.vtt` uploaded and `subtitleFileId` is set in video document.
- Setup script errors:
  - Re-check env vars and API key scopes.
