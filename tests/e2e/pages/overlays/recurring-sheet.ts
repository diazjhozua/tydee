import { type Locator } from "@playwright/test";
import { BasePage } from "../base.page";

export class RecurringSheet extends BasePage {
  sheet(mode: "New saved expense" | "Edit saved expense"): Locator {
    return this.dialog(mode);
  }

  async fillAmount(amount: number, mode: "New saved expense" | "Edit saved expense" = "New saved expense") {
    await this.sheet(mode).getByLabel("Amount").fill(String(amount));
  }

  async fillName(name: string, mode: "New saved expense" | "Edit saved expense" = "New saved expense") {
    await this.sheet(mode).getByLabel("Name").fill(name);
  }

  async chooseAccount(name: string, mode: "New saved expense" | "Edit saved expense" = "New saved expense") {
    await this.sheet(mode).getByRole("button", { name, exact: true }).click();
  }

  async chooseCategory(category: string, mode: "New saved expense" | "Edit saved expense" = "New saved expense") {
    await this.sheet(mode).getByRole("button", { name: category, exact: true }).click();
  }

  async save(mode: "New saved expense" | "Edit saved expense" = "New saved expense") {
    await this.sheet(mode).getByRole("button", { name: "Save", exact: true }).click();
  }

  async archive() {
    await this.sheet("Edit saved expense").getByRole("button", { name: "Archive", exact: true }).click();
    await this.dialog("Archive this saved expense?")
      .getByRole("button", { name: "Archive", exact: true })
      .click();
  }
}
