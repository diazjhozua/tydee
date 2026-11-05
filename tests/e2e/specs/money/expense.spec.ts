import { test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
import { ExpenseSheet } from "../../pages/overlays/expense-sheet";

test("logs, edits, and deletes an expense", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);

  const app = signedIn.page;
  const dashboard = new DashboardPage(app);
  const expense = new ExpenseSheet(app);

  await dashboard.open();
  await dashboard.openExpense();
  await expense.fillAmount(100);
  await expense.chooseAccount("Budget");
  await expense.chooseCategory("Food");
  await expense.fillNote("Lunch");
  await expense.save();

  await dashboard.expectToast("Budget: ₱400.00 left");
  await dashboard.expectSpent("₱100.00");
  await dashboard.expectCategory("Food", 100);
  await dashboard.expectActivity("Lunch");
  await dashboard.expectAccountBalance("Budget", "₱400.00");

  await dashboard.openActivity("Lunch");
  await expense.fillAmount(150, "Edit expense");
  await expense.save("Edit expense");

  await dashboard.expectToast("Expense updated");
  await dashboard.expectAccountBalance("Budget", "₱350.00");

  await dashboard.openActivity("Lunch");
  await expense.delete();

  await dashboard.expectToast("Expense deleted");
  await dashboard.expectAccountBalance("Budget", "₱500.00");
});

test("keeps save disabled without an amount", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const expense = new ExpenseSheet(app);

  await dashboard.openExpense();
  await expense.expectSaveDisabled();
});
