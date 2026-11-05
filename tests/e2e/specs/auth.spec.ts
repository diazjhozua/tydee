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
