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

  async fillAmountText(text: string): Promise<void> {
    await this.page.getByLabel("Amount").fill(text);
  }

  async amountFontSize(): Promise<number> {
    return this.page
      .getByLabel("Amount")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  }

  /** The amount field stays inside the phone or desktop viewport with no horizontal scroll. */
  async expectAmountOnScreen(): Promise<void> {
    const field = this.page.getByLabel("Amount");
    await expect(field).toBeVisible();
    const box = await field.boundingBox();
    if (!box) {
      throw new Error("Amount field has no bounding box");
    }
    const viewport = this.page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport?.width ?? 0);
    const overflows = await this.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
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
