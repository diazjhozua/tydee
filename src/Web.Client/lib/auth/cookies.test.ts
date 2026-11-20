import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_VERIFICATION_COOKIE,
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  applySessionCookies,
  applyVerificationCookie,
  clearSessionCookies,
  clearVerificationCookie,
  hasRememberMe,
  readVerificationSecret,
  type CookieOptions,
} from "@/lib/auth/cookies";

type WrittenCookie = { value: string; options: CookieOptions };

function createWriter() {
  const cookies = new Map<string, WrittenCookie>();

  return {
    cookies,
    set(name: string, value: string, options: CookieOptions) {
      cookies.set(name, { value, options });
    },
  };
}

describe("applySessionCookies", () => {
  it("sets a session cookie and expires the companion when not remembered", () => {
    const writer = createWriter();

    applySessionCookies(writer, "refresh-value", false);

    const refresh = writer.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refresh?.value).toBe("refresh-value");
    expect(refresh?.options.maxAge).toBeUndefined();
    expect(refresh?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    expect(writer.cookies.get(REMEMBER_ME_COOKIE)).toMatchObject({
      value: "",
      options: { maxAge: 0 },
    });
  });

  it("sets a persistent refresh token and companion when remembered", () => {
    const writer = createWriter();

    applySessionCookies(writer, "refresh-value", true);

    expect(writer.cookies.get(REFRESH_TOKEN_COOKIE)).toMatchObject({
      value: "refresh-value",
      options: { maxAge: REMEMBER_ME_MAX_AGE, httpOnly: true },
    });
    expect(writer.cookies.get(REMEMBER_ME_COOKIE)).toMatchObject({
      value: "1",
      options: { maxAge: REMEMBER_ME_MAX_AGE, httpOnly: true },
    });
  });
});

describe("clearSessionCookies", () => {
  it("expires both cookies", () => {
    const writer = createWriter();

    clearSessionCookies(writer);

    expect(writer.cookies.get(REFRESH_TOKEN_COOKIE)?.options.maxAge).toBe(0);
    expect(writer.cookies.get(REMEMBER_ME_COOKIE)?.options.maxAge).toBe(0);
  });
});

describe("hasRememberMe", () => {
  it("only accepts the companion value written by applySessionCookies", () => {
    expect(hasRememberMe({ get: () => ({ value: "1" }) })).toBe(true);
    expect(hasRememberMe({ get: () => ({ value: "0" }) })).toBe(false);
    expect(hasRememberMe({ get: () => ({ value: "true" }) })).toBe(false);
    expect(hasRememberMe({ get: () => undefined })).toBe(false);
  });
});

describe("applyVerificationCookie", () => {
  it("binds the browser to its secret for the 15-minute code lifetime, scoped to the auth routes", () => {
    const writer = createWriter();

    applyVerificationCookie(writer, "browser-secret");

    expect(writer.cookies.get(EMAIL_VERIFICATION_COOKIE)).toMatchObject({
      value: "browser-secret",
      options: { maxAge: 900, path: "/api/auth", httpOnly: true, sameSite: "lax" },
    });
  });

  it("does not touch the refresh cookies", () => {
    const writer = createWriter();

    applyVerificationCookie(writer, "browser-secret");

    expect(writer.cookies.has(REFRESH_TOKEN_COOKIE)).toBe(false);
    expect(writer.cookies.has(REMEMBER_ME_COOKIE)).toBe(false);
  });

  it("is secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    try {
      // The base options are read when the module loads, so load it again under production.
      vi.resetModules();
      const production = await import("@/lib/auth/cookies");
      const writer = createWriter();

      production.applyVerificationCookie(writer, "browser-secret");

      expect(writer.cookies.get(EMAIL_VERIFICATION_COOKIE)?.options.secure).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("is not secure outside production", () => {
    const writer = createWriter();

    applyVerificationCookie(writer, "browser-secret");

    expect(writer.cookies.get(EMAIL_VERIFICATION_COOKIE)?.options.secure).toBe(false);
  });
});

describe("clearVerificationCookie", () => {
  it("expires the binding with the same scope it was set with", () => {
    const writer = createWriter();

    clearVerificationCookie(writer);

    expect(writer.cookies.get(EMAIL_VERIFICATION_COOKIE)).toMatchObject({
      value: "",
      options: { maxAge: 0, path: "/api/auth", httpOnly: true },
    });
  });
});

describe("readVerificationSecret", () => {
  it("returns the secret the browser sent, and undefined when the cookie is absent", () => {
    expect(readVerificationSecret({ get: () => ({ value: "browser-secret" }) })).toBe("browser-secret");
    expect(readVerificationSecret({ get: () => undefined })).toBeUndefined();
  });
});
