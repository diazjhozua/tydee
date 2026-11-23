import { createApi, type TydeeApi } from "../api";
import type { HttpError } from "../api/http";
import { userSpec } from "../builders/user.builder";
import { expect, test } from "../fixtures";
import { ForgotPasswordPage } from "../pages/auth/forgot-password.page";
import { LoginPage } from "../pages/auth/login.page";
import { RegisterPage } from "../pages/auth/register.page";
import { ResetPasswordPage } from "../pages/auth/reset-password.page";
import { VerifyEmailPage } from "../pages/auth/verify-email.page";
import { DashboardPage } from "../pages/dashboard.page";
import { SettingsPage } from "../pages/settings.page";
import { createUnverifiedUser } from "../fixtures/users";
import { TEST_VERIFICATION_CODE, passwordResetTokenStored, seedVerificationCode } from "../support/db";

const WRONG_VERIFICATION_CODE = "000000";

test("redirects a signed-out visitor to login", async ({ page }) => {
  await page.goto("/app");

  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  await new LoginPage(page).expectWelcome();
});

test("rejects a wrong password", async ({ page, verifiedUser }) => {
  const login = new LoginPage(page);

  await login.open();
  await login.fill(verifiedUser.email, "WrongPassword123!");
  await login.submit();

  await login.expectError("Invalid email or password.");
  await expect(page).toHaveURL(/\/login/);
});

/** Resolves to the HTTP status of one login attempt: 200 on success, the error status otherwise. */
async function loginStatus(api: TydeeApi, email: string, password: string): Promise<number> {
  return api.auth.login(email, password).then(
    () => 200,
    (error: HttpError) => error.status,
  );
}

test("refuses an over-length address with a validation error, not a rate limit", async () => {
  const anonymous = createApi();

  // 257 characters: past the column width, so validation refuses it and the per-account budget is skipped.
  expect(await loginStatus(anonymous, `${"a".repeat(245)}@example.com`, "WrongPassword123!")).toBe(400);
});

test("a wrong-password flood blocks the owner only until the window clears", async ({ verifiedUser }) => {
  const anonymous = createApi();

  const flood = await Promise.all(
    Array.from({ length: 11 }, () => loginStatus(anonymous, verifiedUser.email, "WrongPassword123!")),
  );

  // Wrong passwords are refused as wrong passwords, never as success. The per-account
  // budget refuses the excess with 429. The fixture's own login may already use one permit.
  expect(flood.every((status) => status === 401 || status === 429)).toBe(true);
  expect(flood).toContain(429);

  // While the window is open, the owner's correct password is refused too: the budget counts every attempt.
  expect(await loginStatus(anonymous, verifiedUser.email, verifiedUser.password)).toBe(429);

  // Once the window passes, the owner logs in again. Nothing stays locked.
  await expect
    .poll(() => loginStatus(anonymous, verifiedUser.email, verifiedUser.password), {
      timeout: 20_000,
      intervals: [500],
    })
    .toBe(200);
});

test("logout ends every session, including a refresh token that was already rotated", async ({
  verifiedUser,
}) => {
  const anonymous = createApi();
  const rotated = await anonymous.auth.refresh(verifiedUser.refreshToken);

  // Log out with the original token, which the refresh has already rotated away.
  // The newer session must still end.
  await anonymous.auth.logout(verifiedUser.refreshToken);

  await expect(anonymous.auth.refresh(rotated.refreshToken)).rejects.toMatchObject({ status: 401 });
});

test("tells a rate-limited owner to wait rather than showing a generic error", async ({
  page,
  verifiedUser,
}) => {
  const anonymous = createApi();
  await Promise.all(
    Array.from({ length: 11 }, () => loginStatus(anonymous, verifiedUser.email, "WrongPassword123!")),
  );

  const login = new LoginPage(page);

  await login.open();
  await login.fill(verifiedUser.email, verifiedUser.password);
  await login.submit();

  await login.expectError("Too many login attempts. Wait a minute, then try again.");
});

test("reveals the password without losing the typed value", async ({ page }) => {
  const login = new LoginPage(page);

  await login.open();
  await login.fill("nobody@example.com", "Secret123!");
  await login.expectPasswordMasked();

  await login.revealPassword();

  await login.expectPasswordRevealed("Secret123!");
  await expect(page).toHaveURL(/\/login/);
});

test("offers to resend verification for an unverified account", async ({ page }) => {
  const user = await createUnverifiedUser();
  const login = new LoginPage(page);

  await login.open();
  await login.fill(user.email, user.password);
  await login.submit();

  await login.expectNotVerifiedNotice();
  await login.expectEnterCodeLink(user.email);
  await login.resendVerification();
  await login.expectResendConfirmation();
});

test("answers a duplicate email at registration with the same confirmation", async ({ page, verifiedUser }) => {
  const register = new RegisterPage(page);

  await register.open();
  await register.fill({ ...userSpec(), email: verifiedUser.email });
  await register.submit();

  await register.expectVerifyPage();
});

test("answers identically for an unknown forgot-password email", async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);

  await forgot.open();
  await forgot.submit("nobody@example.com");
  await forgot.expectGenericNotice();
});

test("queues a reset link for a known forgot-password email", async ({ page, verifiedUser }) => {
  const forgot = new ForgotPasswordPage(page);

  await forgot.open();
  await forgot.submit(verifiedUser.email);
  await forgot.expectGenericNotice();

  // The worker sends the link within a few seconds. The fake sender discards it, so the stored hash is the proof.
  await expect.poll(() => passwordResetTokenStored(verifiedUser.email), { timeout: 30_000 }).toBe(true);
});

test("rejects a wrong verification code, then accepts the right one from the same browser", async ({ page }) => {
  const user = userSpec();
  const register = new RegisterPage(page);

  await register.open();
  await register.fill(user);
  await register.submit();
  await register.expectVerifyPage();

  await seedVerificationCode(user.email, TEST_VERIFICATION_CODE);

  const verify = new VerifyEmailPage(page);

  await verify.enterCode(WRONG_VERIFICATION_CODE);
  await verify.submit();
  await verify.expectInvalid();

  // A wrong guess spends one attempt, not the code, and the browser keeps its binding.
  await verify.enterCode(TEST_VERIFICATION_CODE);
  await verify.submit();
  await verify.expectVerified();
});

test("shows the missing-token state for password reset", async ({ page }) => {
  const reset = new ResetPasswordPage(page);

  await reset.open();
  await reset.expectMissingToken();
});

const DAY_SECONDS = 24 * 60 * 60;

function expectRememberedForAWeek(cookie: { expires: number } | undefined, now: number) {
  expect(cookie?.expires).toBeGreaterThan(now + 6 * DAY_SECONDS);
  expect(cookie?.expires).toBeLessThan(now + 8 * DAY_SECONDS);
}

test("keeps the session only until the browser closes by default", async ({
  page,
  seed,
  verifiedUser,
}) => {
  await seed.withAccounts();

  const login = new LoginPage(page);

  await login.open();
  await expect(login.rememberMe()).not.toBeChecked();
  await login.fill(verifiedUser.email, verifiedUser.password);
  await login.submit();

  await new DashboardPage(page).expectReady();

  expect((await login.cookie("refresh_token"))?.expires).toBe(-1);
  expect(await login.cookie("remember_me")).toBeUndefined();

  // A refresh must not upgrade the session cookie into a persistent one.
  const tokenBeforeReload = (await login.cookie("refresh_token"))?.value;

  await page.reload();
  await new DashboardPage(page).expectReady();

  expect((await login.cookie("refresh_token"))?.value).not.toBe(tokenBeforeReload);
  expect((await login.cookie("refresh_token"))?.expires).toBe(-1);
  expect(await login.cookie("remember_me")).toBeUndefined();
});

test("remembers the session for 7 days when checked", async ({ page, seed, verifiedUser }) => {
  await seed.withAccounts();

  const login = new LoginPage(page);

  await login.open();
  await login.checkRememberMe();
  await login.fill(verifiedUser.email, verifiedUser.password);
  await login.submit();

  await new DashboardPage(page).expectReady();

  const now = Date.now() / 1000;
  expectRememberedForAWeek(await login.cookie("refresh_token"), now);
  expectRememberedForAWeek(await login.cookie("remember_me"), now);

  // Rotation through the BFF keeps both cookies persistent.
  const tokenBeforeReload = (await login.cookie("refresh_token"))?.value;

  await page.reload();
  await new DashboardPage(page).expectReady();

  expect((await login.cookie("refresh_token"))?.value).not.toBe(tokenBeforeReload);
  expectRememberedForAWeek(await login.cookie("refresh_token"), now);
  expectRememberedForAWeek(await login.cookie("remember_me"), now);

  const settings = new SettingsPage(page);

  await settings.open();
  await settings.logout();
  await expect(page).toHaveURL(/\/login/);

  expect(await login.cookie("refresh_token")).toBeUndefined();
  expect(await login.cookie("remember_me")).toBeUndefined();
});

test("logs in and logs out", async ({ page, seed, verifiedUser }) => {
  await seed.withAccounts();

  const login = new LoginPage(page);

  await login.open();
  await login.fill(verifiedUser.email, verifiedUser.password);
  await login.submit();

  await new DashboardPage(page).expectReady();

  const settings = new SettingsPage(page);

  await settings.open();
  await settings.expectUser(`${verifiedUser.firstName} ${verifiedUser.lastName}`, verifiedUser.email);
  await settings.logout();

  await expect(page).toHaveURL(/\/login/);
});
