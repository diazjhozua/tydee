import { userSpec } from "../builders/user.builder";
import { test } from "../fixtures";
import { LoginPage } from "../pages/auth/login.page";
import { RegisterPage } from "../pages/auth/register.page";
import { VerifyEmailPage } from "../pages/auth/verify-email.page";
import { DefaultPagePrompt } from "../pages/overlays/default-page-prompt";
import { SetupPage } from "../pages/setup.page";
import { verificationToken } from "../support/db";

test("registers, verifies, logs in, and completes setup", async ({ page }) => {
  const user = userSpec();
  const register = new RegisterPage(page);

  await register.open();
  await register.fill(user);
  await register.submit();
  await register.expectCheckEmail(user.email);

  const token = await verificationToken(user.email);
  const verify = new VerifyEmailPage(page);

  await verify.open(token);
  await verify.expectVerified();

  const login = new LoginPage(page);

  await login.open();
  await login.fill(user.email, user.password);
  await login.submit();

  const setup = new SetupPage(page);

  await setup.expectStep1();
  await setup.continue();
  await setup.expectStep2();
  await setup.expectFinishEnabled(true);
  await setup.finish();

  const prompt = new DefaultPagePrompt(page);

  await prompt.expectVisible();
  await prompt.choose("Home");
  await setup.expectDashboard(["Budget", "Savings", "Emergency Fund"]);
});
