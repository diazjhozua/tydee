import { type Locator } from "@playwright/test";
import { chooseOption } from "../../support/select";
import { BasePage } from "../base.page";

export class AccountSheet extends BasePage {
  sheet(mode: "Add account" | "Edit account"): Locator {
    return this.dialog(mode);
  }

  async fillName(name: string, mode: "Add account" | "Edit account" = "Add account") {
    await this.sheet(mode).getByLabel("Name").fill(name);
  }

  async chooseType(
    type: "Spending (day-to-day budget)" | "Saving (money you keep)",
    mode: "Add account" | "Edit account" = "Add account",
  ) {
    await chooseOption(this.page, this.sheet(mode).getByRole("combobox"), type);
  }

  async chooseColor(color: string, mode: "Add account" | "Edit account" = "Add account") {
    await this.sheet(mode).getByRole("button", { name: color, exact: true }).click();
  }

  async save(mode: "Add account" | "Edit account" = "Add account") {
    await this.sheet(mode).getByRole("button", { name: "Save", exact: true }).click();
  }
}
