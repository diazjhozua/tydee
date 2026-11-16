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

  /** The confirmation dialog for a lock, titled "Lock <name>?". */
  private lockDialog(): Locator {
    return this.page.getByRole("dialog", { name: /^Lock / });
  }

  /**
   * Row buttons carry the user's name in their accessible name, for example
   * "Lock Maria Santos". Matching on the verb keeps the locator independent of
   * the name, and the row scope keeps it to one user.
   */
  private lockButton(email: string): Locator {
    return this.row(email).getByRole("button", { name: /^Lock\b/ });
  }

  async toggleVerified(email: string): Promise<void> {
    await this.row(email)
      .getByRole("button", { name: /^(Verify|Unverify)\b/ })
      .click();
  }

  async openLockDialog(email: string): Promise<void> {
    await this.lockButton(email).click();
    await expect(this.lockDialog()).toBeVisible();
  }

  async cancelLock(): Promise<void> {
    await this.lockDialog().getByRole("button", { name: "Cancel" }).click();
    await expect(this.lockDialog()).toBeHidden();
  }

  /** Opens the confirmation and confirms it. */
  async lock(email: string): Promise<void> {
    await this.openLockDialog(email);
    await this.lockDialog().getByRole("button", { name: "Lock account" }).click();
  }

  /** Unlock is one click, with no confirmation. */
  async unlock(email: string): Promise<void> {
    await this.row(email).getByRole("button", { name: /^Unlock\b/ }).click();
  }

  async expectLockDisabled(email: string): Promise<void> {
    await expect(this.lockButton(email)).toBeDisabled();
  }

  async expectBadge(email: string, badge: string): Promise<void> {
    await expect(this.row(email).getByText(badge, { exact: true })).toBeVisible();
  }

  async expectNoBadge(email: string, badge: string): Promise<void> {
    await expect(this.row(email).getByText(badge, { exact: true })).toHaveCount(0);
  }
}
