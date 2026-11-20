import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Spending a code needs the registering browser's secret. The BFF takes that secret from the email_verification
// cookie alone, so a page cannot substitute one, and a failed attempt keeps the cookie for a retry.

const API_URL = "http://tydee-api:5000";
const VERIFY_URL = `${API_URL}/api/v1/auth/verify-email`;

function request(options: { cookie?: string; body?: unknown } = {}) {
  return new NextRequest("https://tydee.diazjhozua.com/api/auth/verify-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify(options.body ?? { code: "246810" }),
  });
}

async function loadRoute() {
  const { POST } = await import("./route");
  return POST;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("BFF verify-email route", () => {
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

  it("sends the code with the secret from the cookie, then clears the cookie and returns hasPassword", async () => {
    const fetchMock = vi.fn(async () => json({ hasPassword: true }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    const res = await POST(request({ cookie: "email_verification=browser-secret" }));

    expect(fetchMock).toHaveBeenCalledWith(
      VERIFY_URL,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "246810", verificationSecret: "browser-secret" }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ hasPassword: true });
    expect(res.cookies.get("email_verification")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("sends an empty secret when the browser has no cookie", async () => {
    const fetchMock = vi.fn(async () => json({ hasPassword: true }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    await POST(request());

    expect(fetchMock).toHaveBeenCalledWith(
      VERIFY_URL,
      expect.objectContaining({ body: JSON.stringify({ code: "246810", verificationSecret: "" }) }),
    );
  });

  it("ignores a verification secret sent in the request body", async () => {
    const fetchMock = vi.fn(async () => json({ hasPassword: true }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    await POST(request({ body: { code: "246810", verificationSecret: "forged" } }));

    expect(fetchMock).toHaveBeenCalledWith(
      VERIFY_URL,
      expect.objectContaining({ body: JSON.stringify({ code: "246810", verificationSecret: "" }) }),
    );
  });

  it("passes a Problem through and keeps the cookie, so the user can retry from this browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            title: "Users.InvalidVerificationToken",
            detail: "The verification code is invalid or has expired.",
            status: 404,
          },
          404,
        ),
      ),
    );
    const POST = await loadRoute();

    const res = await POST(request({ cookie: "email_verification=browser-secret" }));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ title: "Users.InvalidVerificationToken" });
    expect(res.cookies.get("email_verification")).toBeUndefined();
  });

  it("returns 503 and keeps the cookie when the API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const POST = await loadRoute();

    const res = await POST(request({ cookie: "email_verification=browser-secret" }));

    expect(res.status).toBe(503);
    expect(res.cookies.get("email_verification")).toBeUndefined();
  });
});
