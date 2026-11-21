import { expect, type Locator } from "@playwright/test";
import { BasePage } from "../base.page";

export class IncomeSheet extends BasePage {
  sheet(mode: "Add income" | "Edit income" = "Add income"): Locator {
    return this.dialog(mode);
  }

  async fillAmount(amount: number, mode: "Add income" | "Edit income" = "Add income") {
    await this.sheet(mode).getByLabel("Amount").fill(String(amount));
  }

  /** Edit mode prefills asynchronously once the income query resolves. */
  async expectAmount(amount: number, mode: "Add income" | "Edit income" = "Add income") {
    await expect(this.sheet(mode).getByLabel("Amount")).toHaveValue(String(amount));
  }

  amountField(mode: "Add income" | "Edit income" = "Add income"): Locator {
    return this.sheet(mode).getByLabel("Amount");
  }

  async fillAmountText(text: string, mode: "Add income" | "Edit income" = "Add income") {
    await this.amountField(mode).fill(text);
  }

  async amountFontSize(mode: "Add income" | "Edit income" = "Add income"): Promise<number> {
    return this.amountField(mode).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  }

  async amountWidthPx(mode: "Add income" | "Edit income" = "Add income"): Promise<number> {
    const box = await this.amountField(mode).boundingBox();
    if (!box) {
      throw new Error("Amount field has no bounding box");
    }
    return box.width;
  }

  /** The amount field sits inside the sheet's 20px content padding. */
  async expectAmountInsideSheet(mode: "Add income" | "Edit income" = "Add income") {
    const sheet = this.sheet(mode);
    const field = this.amountField(mode);
    await expect(field).toBeVisible();
    const sheetBox = await sheet.boundingBox();
    const fieldBox = await field.boundingBox();
    if (!sheetBox || !fieldBox) {
      throw new Error("Sheet or amount field has no bounding box");
    }
    expect(fieldBox.x).toBeGreaterThanOrEqual(sheetBox.x + 20);
    expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(sheetBox.x + sheetBox.width - 20);
  }

  async expectNoHorizontalScroll(): Promise<void> {
    const overflows = await this.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  }

  async fillSource(source: string, mode: "Add income" | "Edit income" = "Add income") {
    await this.sheet(mode).getByLabel("Source").fill(source);
  }

  async setAllocation(
    index: number,
    amount: number,
    mode: "Add income" | "Edit income" = "Add income",
  ) {
    // The amount field is the first spinbutton in the sheet.
    await this.sheet(mode).getByRole("spinbutton").nth(index + 1).fill(String(amount));
  }

  async submit(mode: "Add income" | "Edit income" = "Add income") {
    const label = mode === "Edit income" ? "Save changes" : "Confirm & allocate";
    await this.sheet(mode).getByRole("button", { name: label }).click();
  }

  async delete() {
    const sheet = this.sheet("Edit income");
    await sheet.getByRole("button", { name: "Delete", exact: true }).click();
    await sheet.getByRole("button", { name: "Really delete?" }).click();
  }

  async expectSaveDisabled(mode: "Add income" | "Edit income" = "Add income") {
    const label = mode === "Edit income" ? "Save changes" : "Confirm & allocate";
    await expect(this.sheet(mode).getByRole("button", { name: label })).toBeDisabled();
  }
}
