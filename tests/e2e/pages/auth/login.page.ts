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

  async expectWelcome(): Promise<void> {
    await expect(this.page.getByText("Welcome back")).toBeVisible();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectResendConfirmation(): Promise<void> {
    await expect(
      this.page.getByText("If that email needs verifying, we sent a new link."),
    ).toBeVisible();
  }

  async expectNotVerifiedNotice(): Promise<void> {
    await expect(
      this.page.getByText("Your email isn't verified yet. Check your inbox for the verification link."),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Resend verification email" }),
    ).toBeVisible();
  }

  async resendVerification(): Promise<void> {
    await this.page.getByRole("button", { name: "Resend verification email" }).click();
  }
}
