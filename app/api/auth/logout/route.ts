import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionSecret } from "@/lib/auth";
import { getSessionAccount } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST() {
  const sessionSecret = await getSessionSecret();

  try {
    if (sessionSecret) {
      const account = getSessionAccount(sessionSecret);
      await account.deleteSession("current");
    }
  } catch {
    // Ignore session deletion errors and clear cookie regardless.
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
