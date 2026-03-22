import { cookies } from "next/headers";
import { ID } from "node-appwrite";
import { NextResponse } from "next/server";

import { getPublicAccount } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const account = getPublicAccount();

    await account.create(ID.unique(), body.email, body.password, body.name);
    const session = await account.createEmailPasswordSession(body.email, body.password);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
