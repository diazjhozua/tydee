import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SetupPage extends BasePage {
  async expectStep1(): Promise<void> {
    await expect(this.page.getByText("Set up your accounts", { exact: true })).toBeVisible();
  }

  async continue(): Promise<void> {
    await this.page.getByRole("button", { name: "Continue" }).click();
  }

  async expectStep2(): Promise<void> {
    await expect(this.page.getByText("Split your income", { exact: true })).toBeVisible();
  }

  async setPercent(index: number, percent: number): Promise<void> {
    await this.page.getByRole("spinbutton").nth(index).fill(String(percent));
  }

  async expectTotal(percent: number): Promise<void> {
    await expect(this.page.getByText(`${percent}%`, { exact: true }).last()).toBeVisible();
  }

  async expectFinishEnabled(enabled: boolean): Promise<void> {
    const button = this.page.getByRole("button", { name: "Finish setup" });

    if (enabled) {
      await expect(button).toBeEnabled();
      return;
    }

    await expect(button).toBeDisabled();
  }

  async finish(): Promise<void> {
    await this.page.getByRole("button", { name: "Finish setup" }).click();
  }

  async expectDashboard(accountNames: string[]): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Accounts" })).toBeVisible();

    for (const name of accountNames) {
      await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  }
}
