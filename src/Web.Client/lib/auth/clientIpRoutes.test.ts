import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Each BFF route must forward the visitor's CF-Connecting-IP to the API. Removing the forwarding
// from any route would otherwise pass the suite and fall back to the shared server address.

const API_URL = "http://tydee-api:5000";

type RouteCase = {
  name: string;
  modulePath: string;
  apiPath: string;
  cookie?: string;
  body?: unknown;
  reply: () => Response;
};

const tokens = () =>
  new Response(
    JSON.stringify({
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAt: "2030-01-01T00:00:00Z",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

const emptyJson = () =>
  new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });

const cases: RouteCase[] = [
  {
    name: "login",
    modulePath: "@/app/api/auth/login/route",
    apiPath: "/api/v1/auth/login",
    body: { email: "owner@example.com", password: "secret-password" },
    reply: tokens,
  },
  {
    name: "refresh",
    modulePath: "@/app/api/auth/refresh/route",
    apiPath: "/api/v1/auth/refresh-token",
    cookie: "refresh_token=old-token",
    reply: tokens,
  },
  {
    name: "logout",
    modulePath: "@/app/api/auth/logout/route",
    apiPath: "/api/v1/auth/logout",
    cookie: "refresh_token=old-token",
    reply: () => new Response(null, { status: 204 }),
  },
  {
    name: "register",
    modulePath: "@/app/api/auth/register/route",
    apiPath: "/api/v1/auth/register",
    body: { email: "owner@example.com", password: "secret-password" },
    reply: emptyJson,
  },
  {
    name: "verify-email",
    modulePath: "@/app/api/auth/verify-email/route",
    apiPath: "/api/v1/auth/verify-email",
    body: { token: "verification-token" },
    reply: emptyJson,
  },
];

function requestFor(route: RouteCase, headers: Record<string, string>): NextRequest {
  const requestHeaders: Record<string, string> = { ...headers };

  if (route.cookie) {
    requestHeaders.cookie = route.cookie;
  }

  if (route.body !== undefined) {
    requestHeaders["content-type"] = "application/json";
  }

  return new NextRequest(`https://tydee.diazjhozua.com/api/auth/${route.name}`, {
    method: "POST",
    headers: requestHeaders,
    body: route.body === undefined ? undefined : JSON.stringify(route.body),
  });
}

async function callRoute(route: RouteCase, headers: Record<string, string>) {
  const fetchMock = vi.fn(async () => route.reply());
  vi.stubGlobal("fetch", fetchMock);

  const { POST } = await import(/* @vite-ignore */ route.modulePath);
  await POST(requestFor(route, headers));

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${API_URL}${route.apiPath}`);

  return new Headers(init.headers);
}

describe.each(cases)("BFF $name route", (route) => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("forwards the visitor's CF-Connecting-IP to the API", async () => {
    vi.stubEnv("API_URL", API_URL);

    const headers = await callRoute(route, { "cf-connecting-ip": "203.0.113.7" });

    expect(headers.get("CF-Connecting-IP")).toBe("203.0.113.7");
  });

  it("sends no client address when Cloudflare sent none", async () => {
    vi.stubEnv("API_URL", API_URL);

    const headers = await callRoute(route, {});

    expect(headers.get("CF-Connecting-IP")).toBeNull();
  });

  it("drops a client address that is not a single IP", async () => {
    vi.stubEnv("API_URL", API_URL);

    const headers = await callRoute(route, { "cf-connecting-ip": "203.0.113.7:443" });

    expect(headers.get("CF-Connecting-IP")).toBeNull();
  });
});
