import { expect } from "@playwright/test";
import { chooseOption } from "../support/select";
import { BasePage } from "./base.page";

export class SettingsPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/settings");
    await expect(this.page.getByText("Preferences", { exact: true })).toBeVisible();
  }

  async expectUser(fullName: string, email: string): Promise<void> {
    await expect(this.page.getByText(fullName, { exact: true })).toBeVisible();
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
  }

  async selectCurrency(code: string): Promise<void> {
    const row = this.page
      .locator("div.flex.items-center.justify-between")
      .filter({ hasText: "Currency" })
      .last();

    await chooseOption(this.page, row.getByRole("combobox"), code);
  }

  async selectDefaultPage(label: "Home" | "Log expense"): Promise<void> {
    const row = this.page
      .locator("div.flex.items-center.justify-between")
      .filter({ hasText: "Default page" })
      .last();

    await chooseOption(this.page, row.getByRole("combobox"), label);
  }

  async toggleHideBalances(): Promise<void> {
    await this.page.getByRole("button", { name: /^(Visible|Hidden)$/ }).click();
  }

  async expectBalanceButton(label: "Visible" | "Hidden"): Promise<void> {
    await expect(this.page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.getByRole("button", { name: "Log out" }).click();
  }

  async openFeedback(): Promise<void> {
    await this.page.getByRole("button", { name: "Send feedback" }).click();
  }

  async openAdmin(): Promise<void> {
    await this.page.getByRole("button", { name: "Admin" }).click();
  }

  async expectNoAdminLink(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Admin" })).toHaveCount(0);
  }

  async openLegal(label: string): Promise<void> {
    await this.page.getByRole("button", { name: label }).click();
  }

  async expectLegalLinks(): Promise<void> {
    for (const label of [
      "Privacy Policy",
      "Terms & Conditions",
      "Cookie Policy",
      "Disclaimer",
      "Accessibility",
      "Contact",
    ]) {
      await expect(this.page.getByRole("button", { name: label })).toBeVisible();
    }
  }
}
