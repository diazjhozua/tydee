import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, BFF_ROUTES, type BffRoute, bffRequest, tokensReply } from "./bffRouteFixtures";

// Every BFF route that takes a POST must refuse cross-site requests before doing any work, and every route that
// parses a JSON body must refuse a non-JSON body before parsing it. Removing the guard from any one route would
// otherwise pass the other suites, so each route is checked here.

async function callRoute(route: BffRoute, headers: Record<string, string>) {
  const fetchMock = vi.fn(async () => tokensReply());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", API_URL);

  const { POST } = await import(/* @vite-ignore */ route.modulePath);
  const res: Response = await POST(bffRequest(route, headers));

  return { res, fetchMock };
}

describe.each(BFF_ROUTES)("BFF $name route guard", (route) => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("refuses a cross-site request with 403 before calling the API", async () => {
    const { res, fetchMock } = await callRoute(route, { "sec-fetch-site": "cross-site" });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a same-origin request reach the handler", async () => {
    const { res, fetchMock } = await callRoute(route, { "sec-fetch-site": "same-origin" });

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(415);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  if (route.takesBody) {
    it("refuses a text/plain body with 415 before parsing it or calling the API", async () => {
      const { res, fetchMock } = await callRoute(route, { "content-type": "text/plain" });

      expect(res.status).toBe(415);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a form-encoded body with 415 before calling the API", async () => {
      const { res, fetchMock } = await callRoute(route, {
        "content-type": "application/x-www-form-urlencoded",
      });

      expect(res.status).toBe(415);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }
});
