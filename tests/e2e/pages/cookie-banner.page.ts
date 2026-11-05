import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CookieBannerPage extends BasePage {
  async expectVisible(): Promise<void> {
    await expect(
      this.page.getByText("Tydee uses only a strictly-necessary session cookie"),
    ).toBeVisible();
  }

  async acceptAll(): Promise<void> {
    await this.page.getByRole("button", { name: "Accept all" }).click();
  }

  async expectHidden(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Accept all" })).toHaveCount(0);
  }
}
