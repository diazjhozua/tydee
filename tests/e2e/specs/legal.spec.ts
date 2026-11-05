import { test } from "../fixtures";
import { CookieBannerPage } from "../pages/cookie-banner.page";
import { LegalPage } from "../pages/legal.page";

const pages = [
  { path: "/privacy", title: "Privacy Policy" },
  { path: "/terms", title: "Terms & Conditions" },
  { path: "/cookie-policy", title: "Cookie Policy" },
  { path: "/disclaimer", title: "Disclaimer" },
  { path: "/accessibility", title: "Accessibility" },
  { path: "/contact", title: "Contact" },
];

for (const { path, title } of pages) {
  test(`renders ${title}`, async ({ page }) => {
    const legal = new LegalPage(page);

    await legal.open(path);
    await legal.expectPage(title);
    await legal.expectFooter();
  });
}

test.describe("cookie banner", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("remembers the consent choice", async ({ page }) => {
    const banner = new CookieBannerPage(page);

    await page.goto("/");
    await banner.expectVisible();
    await banner.acceptAll();
    await banner.expectHidden();

    await page.reload();
    await banner.expectHidden();
  });
});
