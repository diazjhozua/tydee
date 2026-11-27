import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, BFF_ROUTES, type BffRoute, bffRequest, tokensReply } from "./bffRouteFixtures";

// Each BFF route must forward the visitor's CF-Connecting-IP to the API. Removing the forwarding
// from any route would otherwise pass the suite and fall back to the shared server address.

async function callRoute(route: BffRoute, headers: Record<string, string>) {
  const fetchMock = vi.fn(async () => tokensReply());
  vi.stubGlobal("fetch", fetchMock);

  const { POST } = await import(/* @vite-ignore */ route.modulePath);
  await POST(bffRequest(route, headers));

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${API_URL}${route.apiPath}`);

  return new Headers(init.headers);
}

describe.each(BFF_ROUTES)("BFF $name route", (route) => {
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
