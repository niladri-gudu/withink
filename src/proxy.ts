import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTES } from "@/constants/routes";

// Define protected and guest route prefixes
const PROTECTED_ROUTES = [
  "/dashboard",
  "/entries",
  "/flashbacks",
  "/insights",
  "/media",
  "/settings",
  "/feedback",
];

const GUEST_ROUTES = [
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.REGISTER,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
  ROUTES.AUTH.VERIFIED,
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
    pathname.startsWith(route)
  );

  // Check if user is trying to access a guest/auth route
  const isGuestRoute = GUEST_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !hasSession) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL(ROUTES.AUTH.LOGIN, request.url);
    // Keep track of the original page they wanted to visit
    loginUrl.searchParams.set("callbackURL", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestRoute && hasSession) {
    // Redirect authenticated users to dashboard
    return NextResponse.redirect(new URL(ROUTES.APP.DASHBOARD, request.url));
  }

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
