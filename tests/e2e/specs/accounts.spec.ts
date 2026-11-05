import { test } from "../fixtures";
import { AccountsPage } from "../pages/accounts.page";
import { AccountSheet } from "../pages/overlays/account-sheet";

test("adds, edits, and archives an account", async ({ app }) => {
  const accounts = new AccountsPage(app);
  const sheet = new AccountSheet(app);

  await accounts.open();
  await accounts.add();
  await sheet.fillName("Vacation");
  await sheet.chooseType("Saving (money you keep)");
  await sheet.chooseColor("violet");
  await sheet.save();

  await accounts.expectToast("Account created. Don't forget to update your allocation split.");
  await accounts.expectAccount("Vacation");

  await accounts.saveTemplate();
  await accounts.expectToast("Template saved");

  await accounts.edit("Vacation");
  await sheet.fillName("Travel", "Edit account");
  await sheet.save("Edit account");

  await accounts.expectToast("Account updated");
  await accounts.expectAccount("Travel");

  await accounts.archive("Travel");
  await accounts.expectToast("Travel archived");
  await accounts.expectNoAccount("Travel");
});

test("requires the allocation template to total 100%", async ({ app }) => {
  const accounts = new AccountsPage(app);

  await accounts.open();
  await accounts.setTemplatePercent("Budget", 60);

  await accounts.expectTemplateWarning("10% over");
  await accounts.expectTemplateSaveEnabled(false);

  await accounts.setTemplatePercent("Budget", 50);
  await accounts.expectTemplateSaveEnabled(true);

  await accounts.saveTemplate();
  await accounts.expectToast("Template saved");
});

test("shows the empty state without accounts", async ({ page, signedIn }) => {
  const accounts = new AccountsPage(signedIn.page);

  await accounts.open();
  await accounts.expectEmpty();
});
