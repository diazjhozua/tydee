import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/admin");
    await expect(this.page.getByRole("heading", { name: "Admin" })).toBeVisible();
  }

  async expectTiles(): Promise<void> {
    for (const label of ["Users", "Verified", "Accounts", "Expenses", "Open suggestions"]) {
      await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  }

  async openUsers(): Promise<void> {
    await this.page.getByRole("button", { name: "Users" }).click();
  }

  async openSuggestions(): Promise<void> {
    await this.page.getByRole("button", { name: "Suggestions" }).click();
  }
}
