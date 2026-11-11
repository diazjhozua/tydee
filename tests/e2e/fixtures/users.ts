import type { Page } from "@playwright/test";
import { createApi } from "../api";
import type { AuthResponse } from "../api/types";
import { userSpec, type UserSpec } from "../builders/user.builder";
import { promoteToAdmin, verificationToken } from "../support/db";
import { API_URL } from "../support/env";

export type UserSession = UserSpec & AuthResponse;

export type DefaultPagePreference = "Home" | "LogExpense" | null;

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

  await api.auth.register(spec);

  const token = await verificationToken(spec.email);
  await api.auth.verifyEmail(token);

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

  await api.auth.register(spec);

  const token = await verificationToken(spec.email);
  await api.auth.verifyEmail(token);

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
