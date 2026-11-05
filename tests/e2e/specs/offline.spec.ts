import { expect, test } from "../fixtures";
import { AppShellPage } from "../pages/app-shell.page";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpenseSheet } from "../pages/overlays/expense-sheet";

test("queues an expense offline and syncs it on reconnect", async ({ app, userApi }) => {
  const dashboard = new DashboardPage(app);
  const shell = new AppShellPage(app);
  const expense = new ExpenseSheet(app);

  await app.context().setOffline(true);
  await app.evaluate(() => window.dispatchEvent(new Event("offline")));
  await shell.expectOfflineBanner();

  await dashboard.openExpense();
  await expense.fillAmount(25);
  await expense.chooseAccount("Budget");
  await expense.chooseCategory("Food");
  await expense.fillNote("Offline coffee");
  await expense.save();

  await dashboard.expectToast("Queued — will sync when you're back online");
  await dashboard.expectActivity("Offline coffee");
  await dashboard.expectSyncing();

  await app.context().setOffline(false);
  await app.evaluate(() => window.dispatchEvent(new Event("online")));

  await expect
    .poll(async () => {
      const expenses = await userApi.expenses.list({ pageSize: 50 });

      return expenses.some((item) => item.note === "Offline coffee" && item.amount === 25);
    })
    .toBe(true);

  await dashboard.expectNoSyncing();
  await dashboard.expectSpent("₱25.00");
});
