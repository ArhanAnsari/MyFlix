import { cookies } from "next/headers";
import { ID } from "node-appwrite";
import { NextResponse } from "next/server";

import { getPublicAccount, getAdminUsers } from "@/lib/appwrite";
import { SESSION_COOKIE, USER_ID_COOKIE } from "@/lib/constants";
import { handleApiError } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    console.log('[SIGNUP] Request body:', { name: body.name, email: body.email, passwordLength: body.password?.length });

    if (!body.name || !body.email || !body.password) {
      console.log('[SIGNUP] Missing required fields');
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const account = getPublicAccount();
    console.log('[SIGNUP] Created public account');

    await account.create(ID.unique(), body.email, body.password, body.name);
    console.log('[SIGNUP] User created successfully');
    
    const session = await account.createEmailPasswordSession(body.email, body.password);
    console.log('[SIGNUP] Session created:', { 
      $id: session.$id, 
      userId: session.userId,
      provider: session.provider,
    });

    // Get user to verify creation
    const users = getAdminUsers();
    const user = await users.get(session.userId);
    console.log('[SIGNUP] User verified:', { $id: user.$id, name: user.name, email: user.email });

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
    console.log('[SIGNUP] Cookies set - SESSION:', session.$id.length, 'chars, USER_ID:', session.userId.length, 'chars');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SIGNUP] Error:', error instanceof Error ? error.message : error);
    return handleApiError(error, "Unable to create account");
  }
}
