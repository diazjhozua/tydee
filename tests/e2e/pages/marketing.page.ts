import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class MarketingPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/");
  }

  async expectHero(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: /split your income/i })).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Get started free" }).first(),
    ).toBeVisible();
  }

  async expectSections(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Everything a simple budget needs" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Get set up in minutes" }),
    ).toBeVisible();
  }

  async expectLoggedOutLinks(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Log in" }).first()).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Get started", exact: true })).toBeVisible();
  }
}
