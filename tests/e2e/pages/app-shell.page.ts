import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AppShellPage extends BasePage {
  async toggleBalances(): Promise<void> {
    await this.page.getByRole("button", { name: /^(Hide|Show) balances$/ }).click();
  }

  // The header icon is a button on phones; the sidebar entry is a link on
  // desktop. Playwright skips hidden elements, so only the visible one matches.
  async openSettings(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Settings" })
      .or(this.page.getByRole("link", { name: "Settings", exact: true }))
      .click();
  }

  async nav(label: "Home" | "Log" | "Accounts" | "Saved"): Promise<void> {
    await this.page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label }).click();
  }

  async expectOfflineBanner(): Promise<void> {
    await expect(
      this.page.getByText("You're offline — new entries will sync automatically"),
    ).toBeVisible();
  }
}
