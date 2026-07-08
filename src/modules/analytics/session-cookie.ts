import "server-only";
import { randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/** Anonymous, opaque, per-browser id. NOT a fingerprint, NOT tied to identity. */
export const ANON_COOKIE = "lamina_anon";
const ANON_DAYS = 180;

/** A fresh random anon id (base64url, 128-bit). */
function newAnonId(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Read the anon session id from the request, or mint a new one. When minted,
 * writes an httpOnly, SameSite=Lax cookie onto `res`. Returns the id either
 * way. Purely random — no IP, no UA, no fingerprint (privacy by design).
 */
export function ensureAnonId(req: NextRequest, res: NextResponse): string {
  const existing = req.cookies.get(ANON_COOKIE)?.value;
  if (existing && existing.length <= 64) return existing;

  const id = newAnonId();
  res.cookies.set(ANON_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANON_DAYS * 24 * 60 * 60,
  });
  return id;
}
