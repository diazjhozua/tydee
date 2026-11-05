import { expect, type Locator } from "@playwright/test";
import { BasePage } from "../base.page";

export class ExpenseSheet extends BasePage {
  sheet(mode: "Add expense" | "Edit expense"): Locator {
    return this.dialog(mode);
  }

  async fillAmount(amount: number, mode: "Add expense" | "Edit expense" = "Add expense") {
    await this.sheet(mode).getByLabel("Amount").fill(String(amount));
  }

  async chooseAccount(name: string, mode: "Add expense" | "Edit expense" = "Add expense") {
    await this.sheet(mode).getByRole("button", { name, exact: true }).click();
  }

  async chooseCategory(category: string, mode: "Add expense" | "Edit expense" = "Add expense") {
    await this.sheet(mode).getByRole("button", { name: category, exact: true }).click();
  }

  async fillNote(note: string, mode: "Add expense" | "Edit expense" = "Add expense") {
    await this.sheet(mode).getByLabel("Note (optional)").fill(note);
  }

  async save(mode: "Add expense" | "Edit expense" = "Add expense") {
    await this.sheet(mode).getByRole("button", { name: "Save", exact: true }).click();
  }

  async delete() {
    await this.sheet("Edit expense").getByRole("button", { name: "Delete", exact: true }).click();
  }

  async applyTemplate(name: string) {
    await this.sheet("Add expense").getByRole("button", { name: new RegExp(`^${name}`) }).click();
  }

  async expectSaveDisabled(mode: "Add expense" | "Edit expense" = "Add expense") {
    await expect(this.sheet(mode).getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  }
}
