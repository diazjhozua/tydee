import { NextRequest } from "next/server";

// The BFF routes that take a POST, shared by the route suites so a new route is added in one place. Tests stub the
// API at API_URL and call each route's POST handler directly.

export const API_URL = "http://tydee-api:5000";

export type BffRoute = {
  name: string;
  modulePath: string;
  apiPath: string;
  takesBody: boolean;
  cookie?: string;
};

export const BFF_ROUTES: readonly BffRoute[] = [
  { name: "login", modulePath: "@/app/api/auth/login/route", apiPath: "/api/v1/auth/login", takesBody: true },
  { name: "register", modulePath: "@/app/api/auth/register/route", apiPath: "/api/v1/auth/register", takesBody: true },
  {
    name: "verify-email",
    modulePath: "@/app/api/auth/verify-email/route",
    apiPath: "/api/v1/auth/verify-email",
    takesBody: true,
  },
  {
    name: "resend-verification",
    modulePath: "@/app/api/auth/resend-verification/route",
    apiPath: "/api/v1/auth/resend-verification",
    takesBody: true,
  },
  {
    name: "refresh",
    modulePath: "@/app/api/auth/refresh/route",
    apiPath: "/api/v1/auth/refresh-token",
    takesBody: false,
    cookie: "refresh_token=old-token",
  },
  {
    name: "logout",
    modulePath: "@/app/api/auth/logout/route",
    apiPath: "/api/v1/auth/logout",
    takesBody: false,
    cookie: "refresh_token=old-token",
  },
];

const JSON_BODY = JSON.stringify({ email: "owner@example.com", password: "secret-password", code: "246810" });

// Body routes send application/json by default, as the client does. A test overrides a header to simulate another
// request shape.
export function bffRequest(route: BffRoute, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://tydee.diazjhozua.com/api/auth/${route.name}`, {
    method: "POST",
    headers: {
      ...(route.takesBody ? { "content-type": "application/json" } : {}),
      ...(route.cookie ? { cookie: route.cookie } : {}),
      ...headers,
    },
    body: route.takesBody ? JSON_BODY : undefined,
  });
}

export function tokensReply(): Response {
  return new Response(
    JSON.stringify({
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAt: "2030-01-01T00:00:00Z",
      hasPassword: true,
      message: "ok",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
