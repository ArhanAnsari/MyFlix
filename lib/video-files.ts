export function extractFileIdFromUrl(url: string) {
  return url.split("/files/")[1]?.split("/")[0] ?? "";
}

export function extractSegmentIdsFromManifest(manifestText: string) {
  const segmentIds = new Set<string>();

  for (const line of manifestText.split("\n").map((x) => x.trim())) {
    if (!line || line.startsWith("#")) continue;

    // New proxy format: /api/stream/{videoId}/segment/{segmentId}
    const proxyMatch = line.match(/\/api\/stream\/[^/]+\/segment\/([A-Za-z0-9._-]+)/);
    if (proxyMatch?.[1]) {
      segmentIds.add(proxyMatch[1]);
      continue;
    }

    // Legacy absolute Appwrite URL format containing /files/{fileId}/view
    const filesMatch = line.match(/\/files\/([A-Za-z0-9._-]+)\/view/);
    if (filesMatch?.[1]) {
      segmentIds.add(filesMatch[1]);
    }
  }

  return [...segmentIds];
}
