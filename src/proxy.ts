import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/modules/auth/session";

/**
 * Cheap cookie-presence gate for /admin. NOT the security boundary — real
 * session verification happens in the admin layout and inside every server
 * action (see modules/auth/guards.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!request.cookies.get(ADMIN_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
