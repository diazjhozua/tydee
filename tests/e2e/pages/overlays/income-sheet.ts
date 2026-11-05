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
