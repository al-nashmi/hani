import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSessionToken, debugLog, sessionCookieOptions, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  try {
    return await handle(request);
  } catch (err) {
    // TEMPORARY diagnostic: surface a proxy-level crash visibly instead of letting
    // Next.js/Vercel handle it however they do by default, which might be masking
    // the real cause of the stale-session bug. Remove once resolved.
    return NextResponse.json(
      { PROXY_CRASHED: true, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function handle(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/login") ||
    pathname === "/api/opportunities/scan" ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  // TEMPORARY blunt diagnostic: unconditionally force every non-public request to
  // /login, bypassing all session logic and DB calls entirely. If this is deployed
  // and a visit to "/" still shows the dashboard instead of landing here, that is
  // conclusive proof the request never reaches this function at all (e.g. served
  // from a cache in front of it) rather than any bug in the session-check logic.
  // Remove once resolved.
  if (true as boolean) {
    const forcedLoginUrl = new URL("/login", request.url);
    forcedLoginUrl.searchParams.set("forced", "1");
    return NextResponse.redirect(forcedLoginUrl);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return redirectResponse;
  }

  const response = NextResponse.next();
  // Never let a CDN, proxy, or the browser's own HTTP cache store an authenticated
  // response — this app renders customer/financial data behind this check.
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");

  // Server Actions (POST requests carrying this header) manage the session cookie
  // themselves — logoutAction deletes it. Reissuing it here too would race with that
  // deletion on the same response and silently keep the old session alive, which is
  // exactly what made logout appear broken. Only slide the expiry on real navigations.
  if (request.headers.get("next-action")) {
    return response;
  }

  // Slide the expiry forward on every other authenticated request, so the session
  // only times out after real inactivity instead of a fixed length.
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
