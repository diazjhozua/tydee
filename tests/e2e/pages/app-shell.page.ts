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

  // Playwright matches only visible links, so this checks the sidebar on desktop
  // and the bottom navigation on phones. The desktop sidebar also lists Settings in
  // the same nav, so only the named destinations are compared.
  async expectPrimaryOrder(labels: string[]): Promise<void> {
    const destinations = this.page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link")
      .filter({ hasText: new RegExp(`^(${labels.join("|")})$`) });
    await expect(destinations).toHaveText(labels);
  }

  async expectOfflineBanner(): Promise<void> {
    await expect(
      this.page.getByText("You're offline — new entries will sync automatically"),
    ).toBeVisible();
  }
}
