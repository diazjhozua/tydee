import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/app");
    await this.expectReady();
  }

  async expectReady(): Promise<void> {
    await expect(this.page.getByText("Spent this month", { exact: true })).toBeVisible();
  }

  accountCard(name: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async expectAccountBalance(name: string, formattedAmount: string): Promise<void> {
    await expect(
      this.accountCard(name).getByText(formattedAmount, { exact: true }),
    ).toBeVisible();
  }

  async expectSpent(formattedAmount: string): Promise<void> {
    await expect(
      this.page.locator("div.hero-gradient").getByText(formattedAmount, { exact: true }),
    ).toBeVisible();
  }

  async expectActivity(description: string): Promise<void> {
    await expect(this.page.getByText(description, { exact: true }).first()).toBeVisible();
  }

  async openActivity(description: string): Promise<void> {
    await this.page.locator("button").filter({ hasText: description }).first().click();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText("Nothing here yet", { exact: true })).toBeVisible();
  }

  async expectNoActivity(description: string): Promise<void> {
    await expect(this.page.getByText(description, { exact: true })).toHaveCount(0);
  }

  async expectAccountVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async expectBalanceSetActivity(): Promise<void> {
    await expect(this.page.getByText(/Balance set/).first()).toBeVisible();
  }

  async expectNoActivityThisMonth(): Promise<void> {
    await expect(this.page.getByText("No activity in this month")).toBeVisible();
  }

  async expectSyncing(): Promise<void> {
    await expect(this.page.getByText("Syncing…", { exact: true })).toBeVisible();
  }

  async expectNoSyncing(): Promise<void> {
    await expect(this.page.getByText("Syncing…", { exact: true })).toHaveCount(0);
  }

  async expectNoHiddenBalances(): Promise<void> {
    await expect(this.page.getByText("••••")).toHaveCount(0);
  }

  async confirmRemove(kind: "adjustment" | "transfer"): Promise<void> {
    const title = kind === "adjustment" ? "Remove this adjustment?" : "Remove this transfer?";

    await expect(this.page.getByRole("dialog", { name: title })).toBeVisible();
    await this.page.getByRole("button", { name: "Remove", exact: true }).click();
  }

  async openExpense(): Promise<void> {
    await this.page.getByRole("button", { name: "Add expense" }).click();
  }

  async openIncome(): Promise<void> {
    await this.page.getByRole("button", { name: "Income", exact: true }).click();
  }

  async openTransfer(): Promise<void> {
    await this.page.getByRole("button", { name: "Transfer", exact: true }).click();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.whereItWentSection()
      .locator("button")
      .filter({ hasText: category })
      .first()
      .click();
  }

  async expectCategory(category: string, percent: number): Promise<void> {
    const section = this.whereItWentSection();
    await expect(section.getByText(category, { exact: true })).toBeVisible();
    await expect(section.getByText(`${percent}%`, { exact: true })).toBeVisible();
  }

  async expectNoCategoryBreakdown(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Where it went" })).toHaveCount(0);
  }

  async previousMonth(): Promise<void> {
    await this.page.getByRole("button", { name: "Previous month" }).click();
  }

  async expectMonth(label: string): Promise<void> {
    await expect(this.page.getByText(label, { exact: true })).toBeVisible();
  }

  async expectBalancesHidden(): Promise<void> {
    await expect(this.page.getByText("••••").first()).toBeVisible();
  }

  viewButton(section: "Where it went" | "Accounts" | "Recent", view: "list" | "grid"): Locator {
    return this.page.getByRole("button", { name: `${section}: ${view} view`, exact: true });
  }

  async setView(section: "Where it went" | "Accounts" | "Recent", view: "list" | "grid"): Promise<void> {
    await this.viewButton(section, view).click();
  }

  async expectView(section: "Where it went" | "Accounts" | "Recent", view: "list" | "grid"): Promise<void> {
    await expect(this.viewButton(section, view)).toHaveAttribute("aria-pressed", "true");
  }

  async expectActivityGrid(): Promise<void> {
    await expect(this.page.locator('ul[data-view="grid"]')).toBeVisible();
  }

  async expectGridView(section: "Where it went" | "Accounts"): Promise<void> {
    const scope = section === "Accounts" ? this.accountsSection() : this.whereItWentSection();
    await expect(scope.locator('[data-view="grid"]')).toBeVisible();
  }

  private whereItWentSection(): Locator {
    return this.page
      .locator("section")
      .filter({ has: this.page.getByRole("heading", { name: "Where it went" }) });
  }

  private accountsSection(): Locator {
    return this.page
      .locator("section")
      .filter({ has: this.page.getByRole("heading", { name: "Accounts" }) });
  }
}
