// Session cookies for the auth BFF. The refresh token never reaches browser
// JS; the companion cookie only records whether "Remember me" was chosen, so
// the refresh route can rotate the token without upgrading a session cookie
// into a persistent one.
//
// The email_verification cookie holds the registering browser's verification
// secret. Only the browser that holds it can spend the emailed code. It is
// scoped to /api/auth and lasts as long as a code does (15 minutes).

export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const REMEMBER_ME_COOKIE = "remember_me";
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 7;
export const EMAIL_VERIFICATION_COOKIE = "email_verification";
export const EMAIL_VERIFICATION_MAX_AGE = 60 * 15;

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

const verificationOptions: CookieOptions = {
  ...baseOptions,
  path: "/api/auth",
  maxAge: EMAIL_VERIFICATION_MAX_AGE,
};

/** Binds this browser to the code it was just sent: only this browser can spend it. */
export function applyVerificationCookie(response: CookieWriter, verificationSecret: string): void {
  response.set(EMAIL_VERIFICATION_COOKIE, verificationSecret, verificationOptions);
}

/** Drops the binding once the code is spent, so the secret no longer lingers in the browser. */
export function clearVerificationCookie(response: CookieWriter): void {
  response.set(EMAIL_VERIFICATION_COOKIE, "", { ...verificationOptions, maxAge: 0 });
}

/** The browser's verification secret, or undefined when the cookie is absent. */
export function readVerificationSecret(cookies: CookieReader): string | undefined {
  return cookies.get(EMAIL_VERIFICATION_COOKIE)?.value;
}
