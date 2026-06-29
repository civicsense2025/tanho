import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, getAdminPassword, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== getAdminPassword()) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
