import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class ResetPasswordPage extends BasePage {
  async open(token?: string): Promise<void> {
    await this.goto(token ? `/reset-password?token=${token}` : "/reset-password");
  }

  async expectMissingToken(): Promise<void> {
    await expect(this.page.getByText("Missing token", { exact: true })).toBeVisible();
  }

  async fill(password: string): Promise<void> {
    await this.page.getByLabel("New password").fill(password);
    await this.page.getByLabel("Confirm password").fill(password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Reset password" }).click();
  }

  async expectInvalidToken(): Promise<void> {
    await expect(
      this.page.getByText("The reset link is invalid or has expired."),
    ).toBeVisible();
  }
}
