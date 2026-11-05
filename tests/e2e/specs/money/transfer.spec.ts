import { test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
import { TransferSheet } from "../../pages/overlays/transfer-sheet";

test("moves money between accounts and removes the transfer", async ({ signedIn, seed }) => {
  await seed.withAccounts();
  await seed.incomeFromTemplate(1000);

  const app = signedIn.page;
  const dashboard = new DashboardPage(app);
  const transfer = new TransferSheet(app);

  await dashboard.open();
  await dashboard.openTransfer();
  await transfer.fillAmount(100);
  await transfer.chooseFrom("Budget");
  await transfer.chooseTo("Savings");
  await transfer.submit();

  await dashboard.expectToast("Moved ₱100.00 from Budget to Savings");
  await dashboard.expectAccountBalance("Budget", "₱400.00");
  await dashboard.expectAccountBalance("Savings", "₱400.00");
  await dashboard.expectActivity("Budget → Savings");

  await dashboard.openActivity("Budget → Savings");
  await transfer.remove();

  await dashboard.expectToast("Transfer removed");
  await dashboard.expectAccountBalance("Budget", "₱500.00");
  await dashboard.expectAccountBalance("Savings", "₱300.00");
});

test("disables the same account as both source and target", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const transfer = new TransferSheet(app);

  await dashboard.openTransfer();
  await transfer.chooseFrom("Budget");
  await transfer.expectTargetDisabled("Budget");
});
