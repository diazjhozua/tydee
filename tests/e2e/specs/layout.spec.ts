import { createApi } from "../api";
import { expect, test } from "../fixtures";
import { createVerifiedUser, signInThroughBff } from "../fixtures/users";
import { AppShellPage } from "../pages/app-shell.page";
import { DashboardPage } from "../pages/dashboard.page";
import { Seed } from "../seed/seed";
import { API_URL } from "../support/env";

// Runs in both projects. The chromium project is desktop width and the mobile
// project is 375px. Each test branches on the project it runs in.

test("shows the sidebar on desktop and the bottom navigation on phones", async ({
  app,
  page,
}, testInfo) => {
  const sidebar = page.locator("aside");
  const primary = page.getByRole("navigation", { name: "Primary" });

  if (testInfo.project.name === "mobile") {
    await expect(sidebar).toBeHidden();
    await expect(primary.getByRole("link", { name: "Log" })).toBeVisible();
  } else {
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Saved" })).toBeVisible();
  }
});

test("remembers the recent activity grid on desktop", async ({ app, page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "the activity grid is desktop only");

  const dashboard = new DashboardPage(page);
  await dashboard.setView("Recent", "grid");
  await dashboard.expectView("Recent", "grid");

  await page.reload();

  await dashboard.expectView("Recent", "grid");
});

test("hides the activity grid toggle on phones", async ({ app, page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone only");

  const dashboard = new DashboardPage(page);
  await expect(dashboard.viewButton("Recent", "grid")).toBeHidden();
});

test("lists Log expense first when it is the default page", async ({ page }) => {
  // Set the preference before the first navigation so the persisted `me` query
  // cannot hold the default Home order (see tests/e2e/CLAUDE.md).
  const user = await createVerifiedUser(undefined, { defaultPage: "LogExpense" });
  await new Seed(createApi(API_URL, user.accessToken)).withAccounts();
  await signInThroughBff(page, user);

  await page.goto("/app");

  await new AppShellPage(page).expectPrimaryOrder(["Log", "Home", "Accounts", "Saved"]);
});
