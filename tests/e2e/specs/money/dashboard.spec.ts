import { expenseSpec } from "../../builders/expense.builder";
import { test } from "../../fixtures";
import { AppShellPage } from "../../pages/app-shell.page";
import { DashboardPage } from "../../pages/dashboard.page";
import { monthLabel, previousYearMonth } from "../../support/time";

test("shows the empty state for a new user", async ({ app }) => {
  const dashboard = new DashboardPage(app);

  await dashboard.expectSpent("₱0.00");
  await dashboard.expectEmpty();
  await dashboard.expectNoCategoryBreakdown();
});

test("summarizes spending by category and filters activity", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);
  await seed.expense(expenseSpec("Budget", 100, { category: "Food", note: "Groceries" }));
  await seed.expense(expenseSpec("Budget", 50, { category: "Transport", note: "Bus" }));

  const app = signedIn.page;
  const dashboard = new DashboardPage(app);

  await dashboard.open();
  await dashboard.expectSpent("₱150.00");
  await dashboard.expectCategory("Food", 67);
  await dashboard.expectCategory("Transport", 33);
  await dashboard.expectActivity("Groceries");
  await dashboard.expectActivity("Bus");

  await dashboard.filterByCategory("Food");
  await dashboard.expectActivity("Groceries");
  await dashboard.expectNoActivity("Bus");

  await dashboard.filterByCategory("Food");
  await dashboard.expectActivity("Bus");
});

test("navigates to the previous month", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const previous = previousYearMonth();

  await dashboard.previousMonth();
  await dashboard.expectMonth(monthLabel(previous.year, previous.month));
  await dashboard.expectNoActivityThisMonth();
});

test("hides and restores balances", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const shell = new AppShellPage(app);

  await shell.toggleBalances();
  await dashboard.expectBalancesHidden();

  await shell.toggleBalances();
  await dashboard.expectNoHiddenBalances();
});
