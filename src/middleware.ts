import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

const PROTECTED_API_PREFIXES = ["/api/projects", "/api/experience", "/api/skills", "/api/awards", "/api/education", "/api/upload"];

function isProtectedApiRequest(pathname: string, method: string): boolean {
  if (method === "GET") return false;
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = token ? await verifyAdminToken(token) : false;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!authed) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  if (isProtectedApiRequest(pathname, req.method)) {
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/projects/:path*", "/api/experience/:path*", "/api/skills/:path*", "/api/awards/:path*", "/api/education/:path*", "/api/upload"],
};
