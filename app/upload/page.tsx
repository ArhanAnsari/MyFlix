"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { useVideoStore } from "@/store/useVideoStore";

const bucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;

export default function UploadPage() {
  const router = useRouter();
  const { user, authLoading } = useVideoStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        {user ? <UploadDropzone bucketId={bucketId} userId={user.$id} /> : null}
      </section>
    </AppShell>
  );
}
