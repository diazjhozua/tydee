import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LegalPage extends BasePage {
  async open(path: string): Promise<void> {
    await this.goto(path);
  }

  async expectPage(title: string): Promise<void> {
    await expect(this.page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(this.page.getByText(/^Last updated /)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Back to app" })).toBeVisible();
  }

  async expectFooter(): Promise<void> {
    await expect(
      this.page.getByText("Tydee is operated by Jhozua Diaz · diaz.jhozua@gmail.com"),
    ).toBeVisible();
  }
}
