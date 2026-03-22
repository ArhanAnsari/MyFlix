export type VideoDocument = {
  $id: string;
  userId: string;
  title: string;
  description: string;
  originalFileId: string;
  hlsFileId: string;
  subtitleFileId: string;
  thumbnailUrl: string;
  duration: number;
  size: number;
  createdAt: string;
};

export type WatchHistoryDocument = {
  $id: string;
  userId: string;
  videoId: string;
  progress: number;
  updatedAt: string;
};

export type CurrentUser = {
  $id: string;
  name: string;
  email: string;
};
