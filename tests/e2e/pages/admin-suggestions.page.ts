import { expect, type Locator } from "@playwright/test";
import { chooseOption } from "../support/select";
import { BasePage } from "./base.page";

export class AdminSuggestionsPage extends BasePage {
  async expectReady(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Suggestions" })).toBeVisible();
  }

  card(message: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(message, { exact: true }) });
  }

  async expectSuggestion(message: string): Promise<void> {
    await expect(this.card(message)).toBeVisible();
  }

  async setStatus(message: string, status: "Open" | "Done" | "Dismissed"): Promise<void> {
    await chooseOption(
      this.page,
      this.card(message).getByRole("combobox"),
      status,
    );
  }

  async setNote(message: string, note: string): Promise<void> {
    await this.card(message).getByRole("textbox").fill(note);
  }

  async save(message: string): Promise<void> {
    await this.card(message).getByRole("button", { name: "Save" }).click();
  }

  async expectBadge(message: string, status: string): Promise<void> {
    await expect(this.card(message).getByText(status, { exact: true }).first()).toBeVisible();
  }
}
