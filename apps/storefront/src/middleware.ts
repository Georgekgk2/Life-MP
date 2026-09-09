import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Internal administrative and draft vendor/profile routes.
// In the current public demonstration deployment, these surfaces are fully closed
// to all public traffic (fail-closed unconditional 404 regardless of cookies or headers).
const DISABLED_PUBLIC_ROUTES = ["/moderation", "/vendor", "/profile"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDisabled = DISABLED_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isDisabled) {
    // Fail-closed: unconditional 404 to prevent discovery, access,
    // or forged-cookie bypassing of internal surfaces.
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/moderation/:path*", "/vendor/:path*", "/profile/:path*"],
};
