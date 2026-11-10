// Session cookies for the auth BFF. The refresh token never reaches browser
// JS; the companion cookie only records whether "Remember me" was chosen, so
// the refresh route can rotate the token without upgrading a session cookie
// into a persistent one.

export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const REMEMBER_ME_COOKIE = "remember_me";
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 7;

export type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure: boolean;
  maxAge?: number;
};

export type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function hasRememberMe(cookies: CookieReader): boolean {
  return cookies.get(REMEMBER_ME_COOKIE)?.value === "1";
}

export function applySessionCookies(
  response: CookieWriter,
  refreshToken: string,
  rememberMe: boolean,
): void {
  response.set(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    rememberMe ? { ...baseOptions, maxAge: REMEMBER_ME_MAX_AGE } : baseOptions,
  );

  if (rememberMe) {
    response.set(REMEMBER_ME_COOKIE, "1", { ...baseOptions, maxAge: REMEMBER_ME_MAX_AGE });
  } else {
    // Expire a companion left over from an earlier remembered login.
    response.set(REMEMBER_ME_COOKIE, "", { ...baseOptions, maxAge: 0 });
  }
}

export function clearSessionCookies(response: CookieWriter): void {
  response.set(REFRESH_TOKEN_COOKIE, "", { ...baseOptions, maxAge: 0 });
  response.set(REMEMBER_ME_COOKIE, "", { ...baseOptions, maxAge: 0 });
}
