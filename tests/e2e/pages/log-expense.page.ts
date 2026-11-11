import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LogExpensePage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/log-expense");
    await this.expectHeading("Log expense");
  }

  async fillAmount(amount: number): Promise<void> {
    await this.page.getByLabel("Amount").fill(String(amount));
  }

  async chooseAccount(name: string): Promise<void> {
    await this.page.getByRole("button", { name, exact: true }).first().click();
  }

  async fillNote(note: string): Promise<void> {
    await this.page.getByLabel("Note (optional)").fill(note);
  }

  async save(): Promise<void> {
    await this.page.getByRole("button", { name: "Log expense", exact: true }).click();
  }

  async expectAmountCleared(): Promise<void> {
    await expect(this.page.getByLabel("Amount")).toHaveValue("");
  }

  async expectToday(description: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: new RegExp(description) }),
    ).toBeVisible();
  }

  async expectNotToday(description: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: new RegExp(description) }),
    ).toHaveCount(0);
  }

  async openToday(description: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(description) }).click();
  }
}
