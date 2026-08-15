import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";

// Define protected route prefixes
const PROTECTED_ROUTES = [
  "/",
  "/entries",
  "/flashbacks",
  "/insights",
  "/media",
  "/settings",
  "/feedback",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistically check session by verifying cookie presence
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;
  const hasSession = !!sessionToken;

  // Check if user is trying to access a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );

  if (isProtectedRoute && !hasSession) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL(ROUTES.AUTH.LOGIN, request.url);
    // Keep track of the original page they wanted to visit
    loginUrl.searchParams.set("callbackURL", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // NOTE: guest routes (login/register/etc.) are intentionally NOT redirected
  // away based on cookie *presence*. A cookie can outlive a session (HttpOnly
  // cookies are only cleared by the server's Set-Cookie; one can linger or be
  // stale), and bouncing /login → / while the page's real session check says
  // "no session" (redirect back to /login) produces an infinite reload loop.
  // Each page already enforces authentication via getRequestSession().

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
