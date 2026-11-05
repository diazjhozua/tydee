import { expect, test } from "@playwright/test";

test("shows the marketing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /split your income/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get started free" }).first(),
  ).toBeVisible();
});
