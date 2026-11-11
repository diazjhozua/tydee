import { expect, test } from "../fixtures";
import { expenseSpec } from "../builders/expense.builder";
import { LoginPage } from "../pages/auth/login.page";
import { LogExpensePage } from "../pages/log-expense.page";
import { ExpenseSheet } from "../pages/overlays/expense-sheet";
import { DefaultPagePrompt } from "../pages/overlays/default-page-prompt";
import { SettingsPage } from "../pages/settings.page";
import { todayIso } from "../support/time";

test("asks for a default page once and opens it on app start", async ({
  page,
  unconfiguredSignedIn,
  unconfiguredSeed,
}) => {
  await unconfiguredSeed.withAccounts();
  await page.goto("/app");

  const prompt = new DefaultPagePrompt(page);

  await prompt.expectVisible();
  await prompt.expectNoCloseButton();
  await prompt.choose("Log expense");

  await expect(page).toHaveURL(/\/log-expense$/);

  await page.goto("/");

  await expect(page).toHaveURL(/\/log-expense$/);
});

test("settings changes the start page and the root redirect follows", async ({ app }) => {
  const settings = new SettingsPage(app);

  await settings.open();
  await settings.selectDefaultPage("Log expense");
  await settings.expectToast("Tydee opens on Log expense");

  await app.goto("/");

  await expect(app).toHaveURL(/\/log-expense$/);
});

test("an explicit next path wins over the preference", async ({
  page,
  verifiedUser,
  userApi,
}) => {
  await userApi.me.updateDefaultPage("LogExpense");

  const login = new LoginPage(page);

  await login.goto("/login?next=%2Faccounts");
  await login.fill(verifiedUser.email, verifiedUser.password);
  await login.submit();

  await expect(page).toHaveURL(/\/accounts$/);
});

test("logs expenses inline and confirms them in today's list", async ({ app }) => {
  const log = new LogExpensePage(app);
  const sheet = new ExpenseSheet(app);

  await log.open();
  await log.fillAmount(125);
  await log.chooseAccount("Budget");
  await log.fillNote("Lunch");
  await log.save();

  await log.expectAmountCleared();
  await log.expectToday("Lunch");

  await log.openToday("Lunch");
  await sheet.fillNote("Lunch with team", "Edit expense");
  await sheet.save("Edit expense");

  await log.expectToday("Lunch with team");
});

test("shows only today's expenses", async ({ app, seed }) => {
  await seed.expense(
    expenseSpec("Budget", 10, { note: "Yesterday", date: "2020-01-01" }),
  );
  await seed.expense(
    expenseSpec("Budget", 20, { note: "Today", date: todayIso() }),
  );

  const log = new LogExpensePage(app);

  await log.open();
  await log.expectToday("Today");
  await log.expectNotToday("Yesterday");
});
