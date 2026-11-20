import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class VerifyEmailPage extends BasePage {
  async open(email?: string): Promise<void> {
    await this.goto(email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email");
  }

  async expectCodeEntry(): Promise<void> {
    await expect(this.page.getByLabel("Verification code")).toBeVisible();
  }

  async enterCode(code: string): Promise<void> {
    await this.page.getByLabel("Verification code").fill(code);
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Verify email" }).click();
  }

  async expectVerified(): Promise<void> {
    await expect(this.page.getByText("Email verified", { exact: true })).toBeVisible();
  }

  /** A verified account with no registration password: the owner must choose one through Forgot password. */
  async expectVerifiedWithoutPassword(): Promise<void> {
    await expect(this.page.getByText("Email verified", { exact: true })).toBeVisible();
    await expect(
      this.page.getByText(
        "The password you chose at sign-up was discarded because this code was requested from another browser. Use Forgot password to choose one.",
      ),
    ).toBeVisible();
    await expect(this.page.getByRole("link", { name: "Forgot password" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  }

  async expectInvalid(): Promise<void> {
    await expect(
      this.page.getByText("The verification code is invalid or has expired.", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        "Check the code and try again. It works only in the browser you signed up from. A code requested from another browser drops your sign-up password. After five wrong codes, use Forgot password.",
        { exact: true },
      ),
    ).toBeVisible();
  }

  async resend(): Promise<void> {
    await this.page.getByRole("button", { name: "Resend code" }).click();
  }

  async expectResendConfirmation(): Promise<void> {
    await expect(
      this.page.getByText("If that email needs verifying, we sent a new code.", { exact: true }),
    ).toBeVisible();
  }

  /**
   * The browser's verification secret, read from its context. The cookie is httpOnly, so the page cannot read it.
   * The BFF writes the cookie through Next's serializer, which URL-encodes the value (base64 `+`, `/`, `=`), so the
   * raw value is decoded here. The server hashes the decoded secret.
   */
  async verificationSecret(): Promise<string | undefined> {
    const cookies = await this.page.context().cookies();
    const raw = cookies.find((cookie) => cookie.name === "email_verification")?.value;

    return raw === undefined ? undefined : decodeURIComponent(raw);
  }
}
