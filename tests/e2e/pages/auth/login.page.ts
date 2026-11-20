import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/login");
    await expect(this.page.getByText("Welcome back")).toBeVisible();
  }

  async fill(email: string, password: string): Promise<void> {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password", { exact: true }).fill(password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Log in" }).click();
  }

  async expectPasswordMasked(): Promise<void> {
    await expect(this.page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await expect(this.page.getByRole("button", { name: "Show password" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  }

  async revealPassword(): Promise<void> {
    await this.page.getByRole("button", { name: "Show password" }).click();
  }

  async expectPasswordRevealed(value: string): Promise<void> {
    const input = this.page.getByLabel("Password", { exact: true });

    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue(value);
    await expect(this.page.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  rememberMe() {
    return this.page.getByRole("checkbox", { name: "Remember me for 7 days" });
  }

  async checkRememberMe(): Promise<void> {
    await this.rememberMe().check();
  }

  async cookie(name: string) {
    const cookies = await this.page.context().cookies();

    return cookies.find((cookie) => cookie.name === name);
  }

  async expectWelcome(): Promise<void> {
    await expect(this.page.getByText("Welcome back")).toBeVisible();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectResendConfirmation(): Promise<void> {
    await expect(
      this.page.getByText("If that email needs verifying, we sent a new code."),
    ).toBeVisible();
  }

  async expectNotVerifiedNotice(): Promise<void> {
    await expect(
      this.page.getByText("Your email isn't verified yet. Check your inbox for the 6-digit code."),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Resend verification email" }),
    ).toBeVisible();
  }

  /** The notice links to the code entry page, which prefills the address the owner typed. */
  async expectEnterCodeLink(email: string): Promise<void> {
    await expect(this.page.getByRole("link", { name: "Enter your code" })).toHaveAttribute(
      "href",
      `/verify-email?email=${encodeURIComponent(email)}`,
    );
  }

  async resendVerification(): Promise<void> {
    await this.page.getByRole("button", { name: "Resend verification email" }).click();
  }
}
