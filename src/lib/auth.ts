import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const DEFAULT_SECRET = "change-me-in-production-please";
const DEFAULT_PASSWORD = "admin";

if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_SECRET) throw new Error("ADMIN_SECRET must be set in production — refusing to start with the insecure default signing secret.");
  if (!process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD must be set in production — refusing to start with the insecure default password.");
}

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || DEFAULT_SECRET);
const COOKIE = "admin_token";

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

export const COOKIE_NAME = COOKIE;
