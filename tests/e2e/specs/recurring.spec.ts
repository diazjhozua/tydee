import { test } from "../fixtures";
import { AppShellPage } from "../pages/app-shell.page";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpenseSheet } from "../pages/overlays/expense-sheet";
import { RecurringSheet } from "../pages/overlays/recurring-sheet";
import { RecurringHistoryPage } from "../pages/recurring-history.page";
import { RecurringPage } from "../pages/recurring.page";

test("creates, uses, and archives a saved expense", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);

  const app = signedIn.page;
  const recurring = new RecurringPage(app);
  const sheet = new RecurringSheet(app);

  await new DashboardPage(app).open();

  await recurring.open();
  await recurring.expectEmpty();

  await recurring.add();
  await sheet.fillAmount(200);
  await sheet.fillName("Rent");
  await sheet.chooseAccount("Budget");
  await sheet.chooseCategory("Bills");
  await sheet.save();

  await recurring.expectToast("Saved expense created");
  await recurring.expectTemplate("Rent", "Budget");

  const dashboard = new DashboardPage(app);
  const expense = new ExpenseSheet(app);

  // Client-side navigation keeps the freshly refetched recurring list in the
  // query cache instead of restoring a persisted copy on a full reload.
  await new AppShellPage(app).nav("Home");
  await dashboard.expectReady();
  await dashboard.openExpense();
  await expense.applyTemplate("Rent");
  await expense.save();

  await dashboard.expectToast("Budget: ₱300.00 left");
  await dashboard.expectActivity("Rent");

  await recurring.open();
  await recurring.openHistory("Rent");

  const history = new RecurringHistoryPage(app);

  await history.expectName("Rent");
  await history.expectCount(1);
  await history.expectTotal("₱200.00");

  await recurring.open();
  await recurring.openTemplate("Rent");
  await sheet.archive();

  await recurring.expectToast("Saved expense archived");
  await recurring.expectEmpty();
});

test("shows the empty state for a new user", async ({ app }) => {
  const recurring = new RecurringPage(app);

  await recurring.open();
  await recurring.expectEmpty();
});
