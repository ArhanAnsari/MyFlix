import { cookies } from "next/headers";
import { Models } from "node-appwrite";

import { getAdminUsers } from "@/lib/appwrite";
import { SESSION_COOKIE, USER_ID_COOKIE } from "@/lib/constants";

export async function getSessionSecret() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  const userIdValue = cookieStore.get(USER_ID_COOKIE)?.value;
  console.log('[AUTH] getSessionSecret:', { 
    hasSession: !!sessionValue,
    hasUserId: !!userIdValue,
    sessionLength: sessionValue?.length,
    userIdLength: userIdValue?.length
  });
  return sessionValue;
}

export async function getUserIdFromCookie() {
  const cookieStore = await cookies();
  const userIdValue = cookieStore.get(USER_ID_COOKIE)?.value;
  console.log('[AUTH] getUserIdFromCookie:', { 
    hasUserId: !!userIdValue,
    userIdLength: userIdValue?.length
  });
  return userIdValue;
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  const sessionSecret = await getSessionSecret();
  const userId = await getUserIdFromCookie();
  console.log('[AUTH] getCurrentUser: Both values obtained, userId:', userId);
  
  if (!sessionSecret || !userId) {
    console.log('[AUTH] getCurrentUser: Missing session or userId');
    return null;
  }

  try {
    const users = getAdminUsers();
    console.log('[AUTH] getCurrentUser: Getting admin users service');
    
    const user = await users.get(userId);
    console.log('[AUTH] getCurrentUser: User retrieved via admin API:', { $id: user.$id, name: user.name, email: user.email });
    
    return user;
  } catch (error) {
    console.error('[AUTH] getCurrentUser: Error retrieving user:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
