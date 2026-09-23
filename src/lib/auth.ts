import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

export const SESSION_COOKIE = "hani_session";
// Sliding expiry: proxy.ts reissues the cookie on every authenticated request,
// so this is effectively "log out after 30 minutes of inactivity", not a fixed session length.
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 دقيقة من عدم النشاط

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const issuedAt = Date.now();
  const payload = `${expires}:${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const [expiresStr, issuedAtStr] = payload.split(":");
  const expires = Number(expiresStr);
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  if (!Number.isFinite(issuedAt)) return false;

  // A signature check alone can't catch a cookie that logout already told the
  // browser to delete but that reappeared anyway (observed on the installed iOS
  // PWA after a full close/reopen) — so also reject anything issued before the
  // last logout, which invalidateAllSessions() records server-side.
  const rows = (await sql`SELECT invalidated_before FROM session_state WHERE id = 1`) as {
    invalidated_before: string | Date;
  }[];
  const invalidatedBefore = rows[0] ? new Date(rows[0].invalidated_before).getTime() : 0;
  if (issuedAt < invalidatedBefore) return false;

  return true;
}

export async function invalidateAllSessions(): Promise<void> {
  await sql`UPDATE session_state SET invalidated_before = now() WHERE id = 1`;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
