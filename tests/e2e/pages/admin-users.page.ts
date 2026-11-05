import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminUsersPage extends BasePage {
  async expectReady(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Users" })).toBeVisible();
  }

  row(email: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(email, { exact: true }) });
  }

  async toggleVerified(email: string): Promise<void> {
    await this.row(email)
      .getByRole("button", { name: /^(Verify|Unverify)$/ })
      .click();
  }

  async toggleLocked(email: string): Promise<void> {
    await this.row(email)
      .getByRole("button", { name: /^(Lock|Unlock)$/ })
      .click();
  }

  async expectBadge(email: string, badge: string): Promise<void> {
    await expect(this.row(email).getByText(badge, { exact: true })).toBeVisible();
  }
}
