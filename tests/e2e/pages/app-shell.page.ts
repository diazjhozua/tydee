import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AppShellPage extends BasePage {
  async toggleBalances(): Promise<void> {
    await this.page.getByRole("button", { name: /^(Hide|Show) balances$/ }).click();
  }

  async openSettings(): Promise<void> {
    await this.page.getByRole("button", { name: "Settings" }).click();
  }

  async nav(label: "Home" | "Accounts" | "Saved"): Promise<void> {
    await this.page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label }).click();
  }

  async expectOfflineBanner(): Promise<void> {
    await expect(
      this.page.getByText("You're offline — new entries will sync automatically"),
    ).toBeVisible();
  }
}
