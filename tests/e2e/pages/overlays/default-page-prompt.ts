import { expect, type Locator } from "@playwright/test";
import { BasePage } from "../base.page";

export class DefaultPagePrompt extends BasePage {
  promptDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Where should Tydee open?" });
  }

  async expectVisible(): Promise<void> {
    await expect(this.promptDialog()).toBeVisible();
  }

  async expectNoCloseButton(): Promise<void> {
    await expect(this.promptDialog().getByRole("button", { name: "Close" })).toHaveCount(0);
  }

  async choose(label: "Home" | "Log expense"): Promise<void> {
    await this.promptDialog().getByRole("button", { name: new RegExp(label) }).click();
  }
}
