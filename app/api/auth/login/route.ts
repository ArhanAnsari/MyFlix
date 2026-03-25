import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicAccount, getAdminUsers } from "@/lib/appwrite";
import { SESSION_COOKIE, USER_ID_COOKIE } from "@/lib/constants";
import { handleApiError } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    console.log('[LOGIN] Request body:', { email: body.email, passwordLength: body.password?.length });

    if (!body.email || !body.password) {
      console.log('[LOGIN] Missing email or password');
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const account = getPublicAccount();
    console.log('[LOGIN] Created public account');
    
    const session = await account.createEmailPasswordSession(body.email, body.password);
    console.log('[LOGIN] Session created:', { 
      $id: session.$id, 
      userId: session.userId,
      provider: session.provider,
    });

    // Get user to verify authentication
    const users = getAdminUsers();
    const user = await users.get(session.userId);
    console.log('[LOGIN] User verified:', { $id: user.$id, name: user.name, email: user.email });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set(USER_ID_COOKIE, session.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    console.log('[LOGIN] Cookies set - SESSION:', session.$id.length, 'chars, USER_ID:', session.userId.length, 'chars');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LOGIN] Error:', error instanceof Error ? error.message : error);
    return handleApiError(error, "Invalid credentials");
  }
}
