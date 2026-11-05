import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class VerifyEmailPage extends BasePage {
  async open(token?: string): Promise<void> {
    await this.goto(token ? `/verify-email?token=${token}` : "/verify-email");
  }

  async expectVerified(): Promise<void> {
    await expect(this.page.getByText("Email verified!", { exact: true })).toBeVisible();
  }

  async expectInvalid(): Promise<void> {
    await expect(this.page.getByText("Verification failed", { exact: true })).toBeVisible();
  }

  async expectMissingToken(): Promise<void> {
    await expect(this.page.getByText("Missing token", { exact: true })).toBeVisible();
  }
}
