import { ID, Permission, Role, Storage } from "node-appwrite";

export function generateSvgThumbnail(title: string) {
  const safeTitle = title.replace(/[<>&"']/g, "").slice(0, 80);
  const subtitle = "MyFlix";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="60" y="60" width="1160" height="600" rx="28" fill="#111827" opacity="0.35"/>
  <circle cx="640" cy="360" r="74" fill="#f97316" opacity="0.9"/>
  <polygon points="620,325 620,395 680,360" fill="#ffffff"/>
  <text x="80" y="610" fill="#e5e7eb" font-size="42" font-family="Arial, sans-serif">${safeTitle || "Video"}</text>
  <text x="80" y="654" fill="#94a3b8" font-size="28" font-family="Arial, sans-serif">${subtitle}</text>
</svg>`;
}

export async function uploadSvgThumbnail(
  storage: Storage,
  bucketId: string,
  userId: string,
  svgContent: string,
) {
  const file = new File([svgContent], `thumbnail-${Date.now()}.svg`, {
    type: "image/svg+xml",
  });

  const created = await storage.createFile(bucketId, ID.unique(), file, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]);

  return created.$id;
}

export function buildThumbnailUrl(
  endpoint: string,
  bucketId: string,
  fileId: string,
  projectId: string,
) {
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}
