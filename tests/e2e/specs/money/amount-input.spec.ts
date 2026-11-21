import { expect, test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
import { LogExpensePage } from "../../pages/log-expense.page";
import { IncomeSheet } from "../../pages/overlays/income-sheet";

// The amount field widens to the sheet first, then shrinks its font, so a long amount
// stays on screen. The mobile project runs this at 375px; chromium runs it at desktop width.

test("keeps a short amount at the original size", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.openIncome();
  await income.fillAmount(12);

  await expect.poll(() => income.amountFontSize()).toBe(48);
  await income.expectAmountInsideSheet();
});

test("widens a ten-digit amount before it shrinks the font", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.openIncome();
  await income.fillAmount(9999999.99);

  await expect.poll(() => income.amountFontSize()).toBe(48);
  await expect.poll(() => income.amountWidthPx()).toBeGreaterThan(160);
  await income.expectAmountInsideSheet();
});

test("shrinks the font for a forty-digit amount so it stays inside the sheet", async ({
  app,
}) => {
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.openIncome();
  await income.fillAmountText("1".repeat(40));

  await expect.poll(() => income.amountFontSize()).toBeLessThan(48);
  await income.expectAmountInsideSheet();
  await income.expectNoHorizontalScroll();
});

test("returns to the original size when the amount is cleared", async ({ app }) => {
  const dashboard = new DashboardPage(app);
  const income = new IncomeSheet(app);

  await dashboard.openIncome();
  await income.fillAmountText("1".repeat(40));
  await expect.poll(() => income.amountFontSize()).toBeLessThan(48);

  await income.fillAmountText("");

  await expect.poll(() => income.amountFontSize()).toBe(48);
});

test("keeps a forty-digit amount on screen on the log expense page", async ({ app }) => {
  const expense = new LogExpensePage(app);

  await expense.open();
  await expense.fillAmountText("1".repeat(40));

  await expect.poll(() => expense.amountFontSize()).toBeLessThan(48);
  await expense.expectAmountOnScreen();
});
