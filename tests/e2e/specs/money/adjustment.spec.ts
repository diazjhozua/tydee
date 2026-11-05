import { test } from "../../fixtures";
import { AccountsPage } from "../../pages/accounts.page";
import { DashboardPage } from "../../pages/dashboard.page";
import { SetBalanceSheet } from "../../pages/overlays/set-balance-sheet";

test("sets a balance and removes the adjustment", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);

  const app = signedIn.page;
  const accounts = new AccountsPage(app);
  const dashboard = new DashboardPage(app);
  const setBalance = new SetBalanceSheet(app);

  await accounts.open();
  await accounts.setBalance("Budget");
  await setBalance.fillAmount("Budget", 650);
  await setBalance.save("Budget");

  await dashboard.expectToast("Budget balance updated");

  await dashboard.open();
  await dashboard.expectAccountBalance("Budget", "₱650.00");
  await dashboard.expectBalanceSetActivity();

  await dashboard.openActivity("Budget");
  await dashboard.confirmRemove("adjustment");

  await dashboard.expectToast("Adjustment removed");
  await dashboard.expectAccountBalance("Budget", "₱500.00");
});
