import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A resend hands the browser a fresh verification secret. The BFF rebinds the email_verification cookie to it and
// keeps the secret out of the page. The browser's current secret is presented only when the cookie holds one.

const API_URL = "http://tydee-api:5000";
const RESEND_URL = `${API_URL}/api/v1/auth/resend-verification`;
const email = "ada@example.com";

function request(cookie?: string) {
  return new NextRequest("https://tydee.diazjhozua.com/api/auth/resend-verification", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ email }),
  });
}

async function loadRoute() {
  const { POST } = await import("./route");
  return POST;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("BFF resend-verification route", () => {
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

  it("presents the browser's current secret and rebinds the cookie to the fresh one", async () => {
    const fetchMock = vi.fn(async () =>
      json({ message: "If that email needs verifying, we sent a new code.", verificationSecret: "fresh-secret" }, 200),
    );
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    const res = await POST(request("email_verification=old-secret"));

    expect(fetchMock).toHaveBeenCalledWith(
      RESEND_URL,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email, presentedVerificationSecret: "old-secret" }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "If that email needs verifying, we sent a new code.",
    });
    expect(res.cookies.get("email_verification")).toMatchObject({
      value: "fresh-secret",
      path: "/api/auth",
      httpOnly: true,
      maxAge: 900,
    });
  });

  it("omits the presented secret when the browser has no cookie", async () => {
    const fetchMock = vi.fn(async () => json({ message: "ok", verificationSecret: "fresh-secret" }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    await POST(request());

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent).toEqual({ email });
    expect(sent).not.toHaveProperty("presentedVerificationSecret");
  });

  it("passes a failure through and leaves the cookie as it was", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ title: "Validation", detail: "Enter a valid email." }, 400)),
    );
    const POST = await loadRoute();

    const res = await POST(request("email_verification=old-secret"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ title: "Validation" });
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

    const res = await POST(request("email_verification=old-secret"));

    expect(res.status).toBe(503);
    expect(res.cookies.get("email_verification")).toBeUndefined();
  });
});
