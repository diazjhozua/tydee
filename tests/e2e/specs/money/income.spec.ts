import { expect, test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
import { IncomeSheet } from "../../pages/overlays/income-sheet";
import { currentYearMonth } from "../../support/time";

test("creates an income and splits it by the template", async ({
  app,
  userApi,
}) => {
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.openIncome();
  await income.fillAmount(1000);
  await income.fillSource("Salary");
  await income.submit();

  await dashboard.expectToast("Income allocated");
  await dashboard.expectAccountBalance("Budget", "₱500.00");
  await dashboard.expectAccountBalance("Savings", "₱300.00");
  await dashboard.expectAccountBalance("Emergency Fund", "₱200.00");
  await dashboard.expectActivity("Salary");

  const { year, month } = currentYearMonth();
  const data = await userApi.dashboard.get(year, month);

  expect(data.recentActivity[0].description).toBe("Salary");
  expect(
    [...data.recentActivity[0].allocations].sort((a, b) =>
      a.accountName.localeCompare(b.accountName),
    ),
  ).toEqual([
    { accountName: "Budget", amount: 500 },
    { accountName: "Emergency Fund", amount: 200 },
    { accountName: "Savings", amount: 300 },
  ]);
});

test("edits and deletes an income", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);

  const app = signedIn.page;
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.open();
  await dashboard.openActivity("Salary");
  await income.expectAmount(1000, "Edit income");

  await income.fillAmount(1200, "Edit income");
  await income.setAllocation(0, 600, "Edit income");
  await income.setAllocation(1, 360, "Edit income");
  await income.setAllocation(2, 240, "Edit income");
  await income.submit("Edit income");

  await dashboard.expectToast("Income updated");
  await dashboard.expectAccountBalance("Budget", "₱600.00");
  await dashboard.expectAccountBalance("Savings", "₱360.00");
  await dashboard.expectAccountBalance("Emergency Fund", "₱240.00");

  await dashboard.openActivity("Salary");
  await income.delete();

  await dashboard.expectToast("Income deleted");
  await dashboard.expectEmpty();
  await dashboard.expectAccountBalance("Budget", "₱0.00");
});
