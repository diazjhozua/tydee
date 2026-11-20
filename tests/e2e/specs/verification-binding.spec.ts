import { userSpec } from "../builders/user.builder";
import { expect, test } from "../fixtures";
import { LoginPage } from "../pages/auth/login.page";
import { RegisterPage } from "../pages/auth/register.page";
import { VerifyEmailPage } from "../pages/auth/verify-email.page";
import { TEST_VERIFICATION_CODE, seedVerificationCode, verificationBoundTo } from "../support/db";
import { BASE_URL, consentStorageState } from "../support/env";

// Issue #72. A registration hands its browser a verification secret, and only that browser can spend the code. A
// resend from another browser binds the account to that browser's secret and drops the registration password. So
// a stranger who registers an owner's address cannot keep their password once the owner verifies elsewhere.

const ATTACKER_PASSWORD = "Attacker123!";

test("the owner's code from another browser drops the attacker's registration password", async ({ browser }) => {
  const owner = userSpec();
  const attackerRegistration = userSpec({
    email: owner.email,
    password: ATTACKER_PASSWORD,
    confirmPassword: ATTACKER_PASSWORD,
  });

  // Two browser contexts, so each holds its own cookies. The attacker's registration cookie never reaches the owner.
  const attackerBrowser = await browser.newContext({ baseURL: BASE_URL, storageState: consentStorageState });
  const ownerBrowser = await browser.newContext({ baseURL: BASE_URL, storageState: consentStorageState });

  try {
    const attackerPage = await attackerBrowser.newPage();
    const registration = new RegisterPage(attackerPage);

    await registration.open();
    await registration.fill(attackerRegistration);
    await registration.submit();
    await registration.expectVerifyPage();

    // The owner asks for a code from their own browser, which gets a secret of its own.
    const ownerPage = await ownerBrowser.newPage();
    const ownerVerify = new VerifyEmailPage(ownerPage);

    await ownerVerify.open(owner.email);
    await ownerVerify.resend();
    await ownerVerify.expectResendConfirmation();

    const ownerSecret = await ownerVerify.verificationSecret();
    if (!ownerSecret) {
      throw new Error("The resend did not give the owner's browser a verification cookie.");
    }

    // A resend only queues a row. The worker binds the account to the owner's browser on its next tick.
    await expect
      .poll(() => verificationBoundTo(owner.email, ownerSecret), { timeout: 30_000, intervals: [500] })
      .toBe(true);

    // The owner enters the code from the email. The fake sender discards it, so the test seeds a known one.
    await seedVerificationCode(owner.email, TEST_VERIFICATION_CODE);
    await ownerVerify.enterCode(TEST_VERIFICATION_CODE);
    await ownerVerify.submit();
    await ownerVerify.expectVerifiedWithoutPassword();

    // The attacker's registration password no longer opens the account.
    const attackerLogin = new LoginPage(attackerPage);

    await attackerLogin.open();
    await attackerLogin.fill(owner.email, ATTACKER_PASSWORD);
    await attackerLogin.submit();
    await attackerLogin.expectError("Invalid email or password.");
  } finally {
    await attackerBrowser.close();
    await ownerBrowser.close();
  }
});
