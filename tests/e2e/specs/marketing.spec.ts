import { test } from "../fixtures";
import { MarketingPage } from "../pages/marketing.page";

test("shows the marketing page", async ({ page }) => {
  const marketing = new MarketingPage(page);

  await marketing.open();
  await marketing.expectHero();
  await marketing.expectSections();
  await marketing.expectLoggedOutLinks();
});
