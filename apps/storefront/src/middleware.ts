import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Internal and administrative routes that require explicit authentication.
// In demo/prototype mode without verified server-side auth, anonymous access is blocked (404).
const PROTECTED_ROUTES = ["/moderation", "/vendor", "/profile"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected) {
    const authSession = request.cookies.get("life_mp_auth_session")?.value;
    if (!authSession) {
      // Fail-closed: Return 404 Not Found to prevent discovery and access by anonymous visitors
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/moderation/:path*", "/vendor/:path*", "/profile/:path*"],
};
