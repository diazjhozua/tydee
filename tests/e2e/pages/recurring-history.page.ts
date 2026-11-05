import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class RecurringHistoryPage extends BasePage {
  async expectName(name: string): Promise<void> {
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
  }

  async expectCount(count: number): Promise<void> {
    await expect(
      this.page.getByText(`${count} ${count === 1 ? "expense" : "expenses"}`, { exact: true }),
    ).toBeVisible();
  }

  async expectTotal(formattedAmount: string): Promise<void> {
    await expect(this.page.getByText("Total logged")).toBeVisible();
    await expect(this.page.getByText(formattedAmount, { exact: true }).first()).toBeVisible();
  }

  async expectExpense(note: string): Promise<void> {
    await expect(this.page.getByText(note, { exact: true })).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByText("No expenses logged from this template yet."),
    ).toBeVisible();
  }
}
