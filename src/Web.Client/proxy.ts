import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/disclaimer",
  "/accessibility",
  "/contact",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Coarse check only: the cookie's actual validity is enforced by the API.
  const hasSession = request.cookies.has("refresh_token");

  // The landing page owns "/". Logged-in users skip straight to the app.
  if (pathname === "/") {
    if (!hasSession) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
