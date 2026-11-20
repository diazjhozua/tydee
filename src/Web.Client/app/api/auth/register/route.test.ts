import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Registration answers with a verification secret. The BFF must keep that secret away from the page: it goes into
// the email_verification cookie, which only this browser sends back when it spends the code.

const API_URL = "http://tydee-api:5000";
const REGISTER_URL = `${API_URL}/api/v1/auth/register`;

const registration = {
  email: "ada@example.com",
  password: "secret-password",
  confirmPassword: "secret-password",
  firstName: "Ada",
  lastName: "Lovelace",
};

function request(body: unknown = registration) {
  return new NextRequest("https://tydee.diazjhozua.com/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  const { POST } = await import("./route");
  return POST;
}

describe("BFF register route", () => {
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

  it("strips the verification secret from the page and binds this browser with the email_verification cookie", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: "Registration successful. Enter the 6-digit code we emailed you.",
            verificationSecret: "browser-secret",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    const res = await POST(request());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "Registration successful. Enter the 6-digit code we emailed you.",
    });
    expect(res.cookies.get("email_verification")).toMatchObject({
      value: "browser-secret",
      path: "/api/auth",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 900,
    });
  });

  it("forwards the registration to the API unchanged", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: "ok", verificationSecret: "s" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const POST = await loadRoute();

    await POST(request());

    expect(fetchMock).toHaveBeenCalledWith(
      REGISTER_URL,
      expect.objectContaining({ method: "POST", body: JSON.stringify(registration) }),
    );
  });

  it("passes a failure through and sets no verification cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ title: "Validation", detail: "Passwords do not match." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const POST = await loadRoute();

    const res = await POST(request());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ title: "Validation" });
    expect(res.cookies.get("email_verification")).toBeUndefined();
  });

  it("returns 503 and sets no cookie when the API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const POST = await loadRoute();

    const res = await POST(request());

    expect(res.status).toBe(503);
    expect(res.cookies.get("email_verification")).toBeUndefined();
  });
});
