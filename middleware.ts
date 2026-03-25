import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, USER_ID_COOKIE } from "@/lib/constants";

const protectedPrefixes = ["/dashboard", "/upload", "/video", "/settings"];

export function middleware(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  console.log('[MIDDLEWARE] Path:', request.nextUrl.pathname, 'isProtected:', isProtected);

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const userIdValue = request.cookies.get(USER_ID_COOKIE)?.value;
  const hasValidSession = Boolean(sessionValue && userIdValue);
  console.log('[MIDDLEWARE] Session check:', { 
    sessionCookie: SESSION_COOKIE,
    userIdCookie: USER_ID_COOKIE,
    hasSession: !!sessionValue,
    hasUserId: !!userIdValue,
    hasValidSession
  });

  if (!hasValidSession) {
    console.log('[MIDDLEWARE] Invalid session, redirecting to /login');
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  console.log('[MIDDLEWARE] Session valid, allowing access');
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/video/:path*", "/settings/:path*"],
};
