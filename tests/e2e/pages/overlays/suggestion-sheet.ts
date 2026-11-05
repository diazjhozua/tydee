import { chooseOption } from "../../support/select";
import { BasePage } from "../base.page";

export class SuggestionSheet extends BasePage {
  async fillMessage(message: string) {
    await this.dialog("Send feedback").getByLabel("Your suggestion").fill(message);
  }

  async chooseCategory(category: "Feature" | "Bug" | "Design" | "Other") {
    await chooseOption(
      this.page,
      this.dialog("Send feedback").getByRole("combobox"),
      category,
    );
  }

  async setRating(rating: number) {
    await this.dialog("Send feedback")
      .getByRole("button", { name: String(rating), exact: true })
      .click();
  }

  async submit() {
    await this.dialog("Send feedback").getByRole("button", { name: "Send", exact: true }).click();
  }
}
