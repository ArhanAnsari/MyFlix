import { cookies } from "next/headers";
import { Models } from "node-appwrite";

import { getSessionAccount } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/constants";

export async function getSessionSecret() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  const sessionSecret = await getSessionSecret();
  if (!sessionSecret) return null;

  try {
    const account = getSessionAccount(sessionSecret);
    return await account.get();
  } catch {
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
