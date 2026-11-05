import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class RecurringPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/recurring");
    await expect(this.page.getByRole("heading", { name: "Saved expenses" })).toBeVisible();
  }

  async add(): Promise<void> {
    await this.page.getByRole("button", { name: "Add", exact: true }).click();
  }

  card(name: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async openTemplate(name: string): Promise<void> {
    await this.card(name).getByText(name, { exact: true }).click();
  }

  async openHistory(name: string): Promise<void> {
    await this.card(name).getByRole("button", { name: "History" }).click();
  }

  async expectTemplate(name: string, accountName: string): Promise<void> {
    await expect(this.card(name).getByText(accountName, { exact: true })).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByText("No saved expenses yet. Add one to log recurring bills faster."),
    ).toBeVisible();
  }
}
