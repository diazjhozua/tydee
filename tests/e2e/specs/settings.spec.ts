import { expect, test } from "../fixtures";
import { DashboardPage } from "../pages/dashboard.page";
import { LegalPage } from "../pages/legal.page";
import { SuggestionSheet } from "../pages/overlays/suggestion-sheet";
import { SettingsPage } from "../pages/settings.page";

test("changes currency, hides balances, and hides admin for a non-admin", async ({
  app,
  verifiedUser,
}) => {
  const settings = new SettingsPage(app);
  const dashboard = new DashboardPage(app);

  await settings.open();
  await settings.expectUser(`${verifiedUser.firstName} ${verifiedUser.lastName}`, verifiedUser.email);
  await settings.expectNoAdminLink();

  await settings.selectCurrency("USD");
  await settings.expectToast("Currency set to USD");

  await dashboard.open();
  await dashboard.expectSpent("$0.00");

  await settings.open();
  await settings.toggleHideBalances();
  await settings.expectBalanceButton("Hidden");

  await dashboard.open();
  await dashboard.expectBalancesHidden();
});

test("opens the legal pages from settings", async ({ app }) => {
  const settings = new SettingsPage(app);
  const legal = new LegalPage(app);

  await settings.open();
  await settings.expectLegalLinks();
  await settings.openLegal("Privacy Policy");

  await expect(app).toHaveURL(/\/privacy/);
  await legal.expectPage("Privacy Policy");
});

test("sends feedback and logs out", async ({ app }) => {
  const settings = new SettingsPage(app);
  const suggestion = new SuggestionSheet(app);

  await settings.open();
  await settings.openFeedback();
  await suggestion.fillMessage("Please add a monthly report.");
  await suggestion.chooseCategory("Feature");
  await suggestion.setRating(4);
  await suggestion.submit();

  await settings.expectToast("Thanks! Your suggestion was sent.");

  await settings.logout();
  await expect(app).toHaveURL(/\/login/);
});
