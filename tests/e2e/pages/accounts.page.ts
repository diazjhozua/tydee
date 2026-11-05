import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class AccountsPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/accounts");
    await expect(this.page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  }

  async expectAccount(name: string): Promise<void> {
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async expectNoAccount(name: string): Promise<void> {
    await expect(this.page.getByText(name, { exact: true })).toHaveCount(0);
  }

  async add(): Promise<void> {
    await this.page.getByRole("button", { name: "Add", exact: true }).click();
  }

  row(name: string): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.getByRole("button", { name: "Account actions" }) })
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .last();
  }

  async openActions(name: string): Promise<void> {
    await this.row(name).getByRole("button", { name: "Account actions" }).click();
  }

  async edit(name: string): Promise<void> {
    await this.openActions(name);
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
  }

  async setBalance(name: string): Promise<void> {
    await this.openActions(name);
    await this.page.getByRole("menuitem", { name: "Set balance" }).click();
  }

  async archive(name: string): Promise<void> {
    await this.openActions(name);
    await this.page.getByRole("menuitem", { name: "Archive" }).click();
  }

  async setTemplatePercent(name: string, percent: number): Promise<void> {
    await this.templateRow(name).getByRole("spinbutton").fill(String(percent));
  }

  async saveTemplate(): Promise<void> {
    await this.page.getByRole("button", { name: "Save template" }).click();
  }

  async expectTemplateSaveEnabled(enabled: boolean): Promise<void> {
    const button = this.page.getByRole("button", { name: "Save template" });

    if (enabled) {
      await expect(button).toBeEnabled();
      return;
    }

    await expect(button).toBeDisabled();
  }

  async expectTemplateTotal(percent: number): Promise<void> {
    await expect(this.page.getByText(`${percent}%`, { exact: true }).first()).toBeVisible();
  }

  async expectTemplateWarning(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText("No accounts yet.", { exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Set up accounts" })).toBeVisible();
  }

  private templateRow(name: string): Locator {
    return this.page
      .locator("div.flex.items-center.gap-3")
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .filter({ has: this.page.getByRole("spinbutton") });
  }
}
