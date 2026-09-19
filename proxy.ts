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
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return redirectResponse;
  }

  // Slide the expiry forward on every authenticated request, so the session
  // only times out after real inactivity instead of a fixed length.
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  // Never let a CDN, proxy, or the browser's own HTTP cache store an authenticated
  // response — this app renders customer/financial data behind this check.
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
