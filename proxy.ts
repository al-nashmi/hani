import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/login") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Slide the expiry forward on every authenticated request, so the session
  // only times out after real inactivity instead of a fixed length.
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
