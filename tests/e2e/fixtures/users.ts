import type { BrowserContext, Page } from "@playwright/test";
import { createApi, type TydeeApi } from "../api";
import type { AuthResponse } from "../api/types";
import { userSpec, type UserSpec } from "../builders/user.builder";
import { TEST_VERIFICATION_CODE, seedVerificationCode, userCountByEmail } from "../support/db";
import { API_URL } from "../support/env";

export type UserSession = UserSpec & AuthResponse;

export type DefaultPagePreference = "Home" | "LogExpense" | null;

/**
 * Registers through the API and verifies with a seeded code. The API has no browser, so the registration's
 * verification secret is passed back explicitly, as the BFF's cookie would pass it in a real browser.
 */
async function registerAndVerify(api: TydeeApi, spec: UserSpec): Promise<void> {
  const { verificationSecret } = await api.auth.register(spec);

  await seedVerificationCode(spec.email, TEST_VERIFICATION_CODE);
  await api.auth.verifyEmail({ code: TEST_VERIFICATION_CODE, verificationSecret });
}

export async function createUnverifiedUser(spec: UserSpec = userSpec()): Promise<UserSpec> {
  const api = createApi(API_URL);

  await api.auth.register(spec);

  return spec;
}

export async function createVerifiedUser(
  spec: UserSpec = userSpec(),
  options: { defaultPage?: DefaultPagePreference } = { defaultPage: "Home" },
): Promise<UserSession> {
  const api = createApi(API_URL);

  await registerAndVerify(api, spec);

  const auth = await api.auth.login(spec.email, spec.password);

  if (options.defaultPage) {
    await createApi(API_URL, auth.accessToken).me.updateDefaultPage(options.defaultPage);
  }

  return { ...spec, ...auth };
}

/**
 * Admin comes from Admin:Emails at login, so each admin test signs in as a fresh address from this pool. The list
 * must match src/Web.Api/appsettings.Testing.json. Every test gets its own account, so no two tests share a session,
 * its data, or a per-account login budget.
 */
const ADMIN_EMAILS = Array.from(
  { length: 16 },
  (_, index) => `e2e-admin-${String(index + 1).padStart(2, "0")}@tydee.test`,
);

/** The first pool address with no account yet. The database is fresh per run, so an address is never reused. */
async function freeAdminEmail(): Promise<string> {
  for (const email of ADMIN_EMAILS) {
    if ((await userCountByEmail(email)) === 0) {
      return email;
    }
  }

  throw new Error(
    `All ${ADMIN_EMAILS.length} e2e admin addresses are in use. Add more to Admin:Emails in src/Web.Api/appsettings.Testing.json and to ADMIN_EMAILS.`,
  );
}

export async function createAdminUser(
  options: { defaultPage?: DefaultPagePreference } = { defaultPage: "Home" },
): Promise<UserSession> {
  const api = createApi(API_URL);
  const spec = userSpec({ email: await freeAdminEmail() });

  await registerAndVerify(api, spec);

  const auth = await api.auth.login(spec.email, spec.password);

  if (options.defaultPage) {
    await createApi(API_URL, auth.accessToken).me.updateDefaultPage(options.defaultPage);
  }

  return { ...spec, ...auth };
}

/** Logs in through the Next BFF so the browser context receives the refresh cookie. */
export async function signInThroughBff(page: Page, user: Pick<UserSpec, "email" | "password">) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });

  if (!response.ok()) {
    throw new Error(`BFF login failed for ${user.email}: ${response.status()}`);
  }
}

/**
 * Refreshes through the Next BFF with the refresh cookie the context holds. Returns the HTTP status and, when the
 * server refused, the Error.Code it sent (for example Users.TokenReuseDetected).
 */
export async function refreshThroughBff(
  context: BrowserContext,
): Promise<{ status: number; title?: string }> {
  const response = await context.request.post("/api/auth/refresh");
  const body = (await response.json().catch(() => null)) as { title?: string } | null;

  return { status: response.status(), title: body?.title };
}
