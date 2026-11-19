import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The BFF logout must end the server session before it forgets the browser's token. If the API cannot confirm,
// the cookie stays, so the user can retry rather than leave a live session behind.

const API_URL = "http://tydee-api:5000";
const LOGOUT_URL = `${API_URL}/api/v1/auth/logout`;

function request(cookie?: string) {
  return new NextRequest("https://tydee.diazjhozua.com/api/auth/logout", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });
}

async function loadRoute() {
  const { POST } = await import("./route");
  return POST;
}

describe("BFF logout route", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns 204 and clears both cookies when there is no session, without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    const res = await POST(request());

    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.cookies.get("refresh_token")).toMatchObject({ value: "", maxAge: 0 });
    expect(res.cookies.get("remember_me")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("revokes the session on the API, then returns 204 and clears both cookies", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    const res = await POST(request("refresh_token=old-token; remember_me=1"));

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      LOGOUT_URL,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ refreshToken: "old-token" }) }),
    );
    expect(res.cookies.get("refresh_token")).toMatchObject({ value: "", maxAge: 0 });
    expect(res.cookies.get("remember_me")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("returns 503 and keeps the cookie when the API refuses the revoke", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    const POST = await loadRoute();

    const res = await POST(request("refresh_token=old-token"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ title: "Users.LogoutFailed" });
    expect(res.cookies.get("refresh_token")).toBeUndefined();
    expect(res.cookies.get("remember_me")).toBeUndefined();
  });

  it("returns 503 and keeps the cookie when the API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const POST = await loadRoute();

    const res = await POST(request("refresh_token=old-token"));

    expect(res.status).toBe(503);
    expect(res.cookies.get("refresh_token")).toBeUndefined();
  });
});
