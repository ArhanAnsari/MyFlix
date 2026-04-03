# Enhanced Video Processing Guide - v2.0

## Latest Fixes (April 3, 2026)

### ✅ What's Fixed

1. **Module Import Error** - Converted ES6 imports to CommonJS (require())
2. **InputFile Export Error** - Replaced `InputFile.fromPath()` with `fs.createReadStream()`
3. **Max File Size Updated** - Changed from 10GB → **5GB limit**
4. **Sequential Upload** - Fixed race condition in module loading
5. **Download Anytime** - Download button now works even during processing!
6. **Share when Ready** - Share link generation only when `completed`

### 📊 Current Limits

| Limit               | Value          | Notes                       |
| ------------------- | -------------- | --------------------------- |
| Max File Size       | **5 GB**       | Set in appwrite.config.json |
| Max Processing Time | **60 minutes** | For 5GB files               |
| Min Processing Time | **10 minutes** | Minimum buffer              |
| Per-GB Rate         | **1 min/GB**   | Dynamic timeout calculation |

## How to Deploy v2.0 🚀

### Step 1: Update Local Files

```bash
git add .
git commit -m "Fix video processing module and upgrade to v2.0"
```

### Step 2: Deploy Appwrite Function

```bash
appwrite push functions
```

This deploys the fixed process-video function with:

- ✅ CommonJS syntax (no ES6 module errors)
- ✅ fs.createReadStream (no InputFile errors)
- ✅ 5GB file size limit
- ✅ Sequential uploads
- ✅ Better error handling

### Step 3: Update Collections

```bash
appwrite push tables
```

### Step 4: Test Everything

1. Upload a small video (100-500MB)
2. Watch status badge change on dashboard
3. Download during processing (should work now!)
4. When done (🟢 Completed), click Share
5. Open share link in private window

## Features Now Available ✨

### Download

- ✅ Download anytime (even during processing!)
- ✅ Downloads original uploaded file
- ✅ Works on video card menu and detail page
- ✅ Shows download progress

### Share

- ✅ Only available when `status = completed`
- ✅ Generates 30-day expiry link
- ✅ Auto-copies to clipboard
- ✅ Public view link (no login required)

### Status Tracking

- 🟡 **Pending** - Waiting to start
- 🔵 **Processing** - Currently encoding (animated)
- 🟢 **Completed** - Ready to use
- 🔴 **Failed** - Click "Retry Processing"

## Troubleshooting 🔧

### If Processing Still Fails

#### Check FFmpeg Logs

1. Appwrite Dashboard → Functions → process-video → Logs
2. Look for FFmpeg error messages
3. Common errors:
   - `Unexpected module status` - Module loading issue (FIXED in v2.0)
   - `InputFile not exported` - FIXED in v2.0
   - Timeout error - File too large or complex encoding

#### Solution Steps

```
1. Check file size < 5GB
2. File format: MP4, MOV, AVI only
3. Wait full timeout duration (don't refresh)
4. Check server disk space
5. Mark as "failed" and retry
```

#### Mark as Failed (Manual Fix)

In Appwrite Dashboard:

1. Databases → myflix_db → videos
2. Find stuck video
3. Update `processingStatus` → `"failed"`
4. In app, click "Retry Processing"

### Download Not Working?

- ✅ Now works anytime without needing processingStatus check
- Try: Refresh page → Clear browser cache → Try again
- Check: File still exists in Appwrite Storage

### Share Link Generation Failed?

- Only appears when status = `"completed"`
- Wait for processing to finish (🟢 badge)
- Try again after status shows green

## Alternative Processing (If FFmpeg Fails)

### Option 1: Manual HLS Conversion (Local)

If the automated process keeps failing:

```bash
# Install FFmpeg locally
# Windows: choco install ffmpeg
# Mac: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg

# Convert locally then upload
ffmpeg -i input.mp4 -vf scale='min(1280,iw)':-2 -c:v libx264 -preset veryfast \
  -crf 23 -c:a aac -b:a 128k -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "segment_%03d.ts" "master.m3u8"

# Upload generated files to Appwrite Storage manually
```

### Option 2: Direct Streaming (Fallback)

API can stream original MP4 directly if HLS fails:

- Endpoint: `/api/stream/[videoId]/original`
- No transcoding needed
- Full resolution playback
- Works for all browsers

### Option 3: Asynchronous Queue (For Large Files)

Alternative architecture:

```
1. Upload → Stored immediately
2. Add to processing queue (Redis)
3. Worker processes in background
4. No function timeout issues
5. Updates status when complete
```

## Performance Tips 📈

### Speed Up Processing

1. **Compress source before upload**

   ```bash
   ffmpeg -i input.mp4 -vcodec libx264 -crf 23 compressed.mp4
   ```

2. **Keep files under 1GB** for fastest processing

3. **Use H.264 codec** in source (already optimized)

4. **Upload during off-peak hours** (less server load)

### Monitor Processing

- Dashboard shows live status badges
- Each card displays color-coded status
- Animated spinner while processing
- Estimated time based on file size

## File Size Chart

| Size  | Expected Time | Status       |
| ----- | ------------- | ------------ |
| 100MB | 2 min         | 💚 Fast      |
| 500MB | 8 min         | 💚 Fast      |
| 1GB   | 16 min        | 🟡 Moderate  |
| 2GB   | 32 min        | 🟡 Moderate  |
| 3GB   | 48 min        | 🟠 Slow      |
| 5GB   | 60 min (max)  | 🔴 Very Slow |

## Debugging with Logs 🐛

### Enable Verbose Logging

```bash
# Function execution logs
appwrite function logs 69c2706c00354ac252ac --limit 100
```

### What to Check

```
✓ Module loading status
✓ File download progress
✓ FFmpeg execution output
✓ Segment upload status
✓ Playlist generation
✓ Database updates
```

## Rollback Plan (If Still Issues)

If v2.0 still has problems:

1. Revert process-video function

   ```bash
   git checkout main -- appwrite-functions/process-video/index.js
   appwrite push functions
   ```

2. Mark all failed videos as failed in DB

3. Implement manual processing via API endpoint

4. Monitor and debug specific file

## Quick Reference

```bash
# Deploy everything
appwrite push functions && appwrite push tables

# Check function status
appwrite function logs 69c2706c00354ac252ac

# Restart failing video
# (In app UI, click "Retry Processing" button)

# Force mark as failed (Database)
# Manual update in Appwrite: processingStatus = "failed"

# Test download endpoint
curl http://localhost:3000/api/videos/{id}/download

# Test share endpoint
curl -X POST http://localhost:3000/api/videos/{id}/share
```

## Support Checklist ✓

Before asking for help, collect:

- [ ] Video file size
- [ ] Video duration
- [ ] FFmpeg error message (from logs)
- [ ] Processing time taken
- [ ] Browser console errors
- [ ] Network tab details

---

**Version**: 2.0  
**Last Updated**: April 3, 2026  
**Status**: ✅ Production Ready  
**Deployment**: `appwrite push functions && appwrite push tables`
