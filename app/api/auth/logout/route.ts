import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminUsers } from "@/lib/appwrite";
import { SESSION_COOKIE, USER_ID_COOKIE } from "@/lib/constants";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_ID_COOKIE)?.value;
    
    if (userId) {
      console.log('[LOGOUT] Attempting to delete sessions for user:', userId);
      try {
        const users = getAdminUsers();
        // Delete all sessions for this user
        await users.deleteSessions(userId);
        console.log('[LOGOUT] User sessions deleted via admin API');
      } catch (error) {
        console.error('[LOGOUT] Error deleting sessions via admin API:', error instanceof Error ? error.message : error);
        // Continue with cookie deletion even if this fails
      }
    } else {
      console.log('[LOGOUT] No user ID found in cookie');
    }
  } catch (error) {
    console.error('[LOGOUT] Error in session deletion:', error instanceof Error ? error.message : error);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(USER_ID_COOKIE);
  console.log('[LOGOUT] Cookies deleted');

  return NextResponse.json({ ok: true });
}
