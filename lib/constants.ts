export const SESSION_COOKIE = "myflix_session";
export const USER_ID_COOKIE = "myflix_user_id";

export const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska", // MKV
  "video/x-msvideo", // AVI
  "video/x-flv", // FLV
  "video/ogg", // OGV
  "video/3gpp", // 3GP
  "video/x-m4v", // M4V
];

export const PAGE_SIZE = 12;
export const WATCH_HISTORY_INTERVAL_MS = 5000;
