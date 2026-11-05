import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class ForgotPasswordPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/forgot-password");
    await expect(this.page.getByText("Forgot your password?")).toBeVisible();
  }

  async submit(email: string): Promise<void> {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByRole("button", { name: "Send reset link" }).click();
  }

  async expectGenericNotice(): Promise<void> {
    await expect(this.page.getByText("Check your inbox", { exact: true })).toBeVisible();
    await expect(
      this.page.getByText("If that email has an account, we sent a reset link. It expires in 1 hour."),
    ).toBeVisible();
  }
}
