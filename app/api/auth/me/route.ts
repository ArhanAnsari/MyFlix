import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/server/api";

export async function GET() {
  try {
    console.log('[ME] Starting /api/auth/me request');
    
    const user = await getCurrentUser();
    console.log('[ME] getCurrentUser result:', user ? { $id: user.$id, name: user.name } : null);

    if (!user) {
      console.log('[ME] No user found, returning 401');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[ME] User authenticated successfully');
    return NextResponse.json({
      user: {
        $id: user.$id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[ME] Error:', error instanceof Error ? error.message : error);
    return handleApiError(error, "Failed to fetch current user");
  }
}
