import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class RegisterPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/register");
    await expect(this.page.getByText("Create your account")).toBeVisible();
  }

  async fill(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.page.getByLabel("First name").fill(input.firstName);
    await this.page.getByLabel("Last name").fill(input.lastName);
    await this.page.getByLabel("Email").fill(input.email);
    await this.page.getByLabel("Password", { exact: true }).fill(input.password);
    await this.page.getByLabel("Confirm password").fill(input.confirmPassword ?? input.password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Sign up" }).click();
  }

  async expectCheckEmail(email: string): Promise<void> {
    await expect(this.page.getByText("Check your email", { exact: true })).toBeVisible();
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }
}
