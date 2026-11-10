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
  await login.resendVerification();
  await login.expectResendConfirmation();
});

test("rejects a duplicate email at registration", async ({ page, verifiedUser }) => {
  const register = new RegisterPage(page);

  await register.open();
  await register.fill({ ...userSpec(), email: verifiedUser.email });
  await register.submit();

  await register.expectError("The provided email is already in use.");
});

test("answers identically for an unknown forgot-password email", async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);

  await forgot.open();
  await forgot.submit("nobody@example.com");
  await forgot.expectGenericNotice();
});

test("shows an invalid verification token error", async ({ page }) => {
  const verify = new VerifyEmailPage(page);

  await verify.open("not-a-real-token");
  await verify.expectInvalid();
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
