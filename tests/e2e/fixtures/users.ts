import type { BrowserContext, Page } from "@playwright/test";
import { createApi, type TydeeApi } from "../api";
import type { AuthResponse } from "../api/types";
import { userSpec, type UserSpec } from "../builders/user.builder";
import { TEST_VERIFICATION_CODE, promoteToAdmin, seedVerificationCode } from "../support/db";
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
 * Admin promotion is a database flag, and the role claim is only added when a
 * token is issued, so the user must log in again after the update.
 */
export async function createAdminUser(
  spec: UserSpec = userSpec("e2e-admin"),
  options: { defaultPage?: DefaultPagePreference } = { defaultPage: "Home" },
): Promise<UserSession> {
  const api = createApi(API_URL);

  await registerAndVerify(api, spec);

  await promoteToAdmin(spec.email);

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
