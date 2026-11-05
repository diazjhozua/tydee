import { expect, type Locator, type Page } from "@playwright/test";

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  dialog(name: string | RegExp): Locator {
    return this.page.getByRole("dialog", { name });
  }

  async expectToast(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true }).first()).toBeVisible();
  }

  async expectPath(path: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(path);
  }

  async expectHeading(name: string | RegExp): Promise<void> {
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
  }
}
