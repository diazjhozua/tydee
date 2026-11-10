import { describe, expect, it } from "vitest";
import {
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  hasRememberMe,
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
