import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class TransferSheet extends BasePage {
  async fillAmount(amount: number) {
    await this.dialog("Move money").getByLabel("Amount").fill(String(amount));
  }

  /** The same account name appears in the From and To chip rows. */
  async chooseFrom(name: string) {
    await this.dialog("Move money").getByRole("button", { name, exact: true }).nth(0).click();
  }

  async chooseTo(name: string) {
    await this.dialog("Move money").getByRole("button", { name, exact: true }).nth(1).click();
  }

  async submit() {
    await this.dialog("Move money").getByRole("button", { name: "Move money" }).click();
  }

  async expectDisabled() {
    await expect(this.dialog("Move money").getByRole("button", { name: "Move money" })).toBeDisabled();
  }

  async expectTargetDisabled(name: string) {
    await expect(
      this.dialog("Move money").getByRole("button", { name, exact: true }).nth(1),
    ).toBeDisabled();
  }

  async remove(): Promise<void> {
    await expect(this.dialog("Remove this transfer?")).toBeVisible();
    await this.page.getByRole("button", { name: "Remove", exact: true }).click();
  }
}
