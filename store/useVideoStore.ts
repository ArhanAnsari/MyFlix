"use client";

import { create } from "zustand";

import type { CurrentUser } from "@/lib/types";

type VideoStoreState = {
  user: CurrentUser | null;
  authLoading: boolean;
  setUser: (user: CurrentUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
};

export const useVideoStore = create<VideoStoreState>((set) => ({
  user: null,
  authLoading: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
}));
