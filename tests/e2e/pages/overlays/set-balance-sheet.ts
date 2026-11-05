import { BasePage } from "../base.page";

export class SetBalanceSheet extends BasePage {
  async fillAmount(accountName: string, amount: number) {
    await this.dialog(`Set ${accountName} balance`).getByLabel("Amount").fill(String(amount));
  }

  async save(accountName: string) {
    await this.dialog(`Set ${accountName} balance`)
      .getByRole("button", { name: "Save", exact: true })
      .click();
  }
}
