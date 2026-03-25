# MyFlix - Personal Video Cloud

MyFlix is a private SaaS video cloud built with Next.js + Appwrite. Users can upload personal videos, process them into HLS with FFmpeg, stream securely, and resume playback from watch history.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Zustand
- Appwrite (Auth, Databases, Storage, Functions)
- FFmpeg in Appwrite Function
- hls.js for streaming playback

## Features

- Email/password authentication with persistent sessions
- Private upload flow with file validation (mp4/webm/mov, max 5GB)
- Video metadata collection and processing trigger
- HLS playback with auto-resume from watch history
- Optional subtitle upload and playback (.vtt)
- Stream proxy layer for manifest and HLS segments
- Dashboard search, sort, and pagination
- Settings page with usage metrics and account data deletion
- Per-user data isolation with Appwrite permissions

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=
APPWRITE_SELF_SIGNED=

APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_VIDEOS_COLLECTION_ID=
APPWRITE_WATCH_HISTORY_COLLECTION_ID=
APPWRITE_STORAGE_BUCKET_ID=
APPWRITE_VIDEO_FUNCTION_ID=
```

## Appwrite Setup

For full A-to-Z setup (auth, collections, indexes, function deployment, subtitle support, and stream proxy), see `APPWRITE_SETUP_GUIDE.md`.

1. Create an Appwrite project.
2. Enable Email/Password authentication.
3. Create an API key with permissions for users, databases, storage, functions.
4. Run setup script:

```bash
npm run appwrite:setup
```

This script creates:

- Database
- `videos` collection
- `watch_history` collection
- Storage bucket (`videos_bucket`-style config)

## Appwrite Function Setup (FFmpeg)

Function source is in `appwrite-functions/process-video`.

1. Create Appwrite function (Node runtime).
2. Deploy files from that folder.
3. Set function env vars listed in `appwrite-functions/process-video/README.md`.
4. Save function ID to `APPWRITE_VIDEO_FUNCTION_ID`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security Notes

- Every video document and storage object is created with owner-only permissions.
- API routes require session validation before serving data.
- Protected pages are guarded by middleware and backend authorization checks.

## Project Structure

- `app/(auth)` login and signup pages
- `app/dashboard` video library
- `app/upload` upload flow
- `app/video/[id]` streaming page
- `app/settings` account and storage settings
- `app/api/*` secure backend routes
- `components/video`, `components/upload`, `components/ui`
- `lib/appwrite.ts`, `lib/utils.ts`
- `store/useVideoStore.ts`
- `scripts/appwrite-setup.mjs`
- `appwrite-functions/process-video`
