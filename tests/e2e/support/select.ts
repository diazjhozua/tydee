import { expect, type Locator, type Page } from "@playwright/test";

/** Base UI selects are not native <select> elements. */
export async function chooseOption(
  page: Page,
  trigger: Locator,
  option: string,
): Promise<void> {
  await trigger.click();
  await expect(page.getByRole("option", { name: option, exact: true })).toBeVisible();
  await page.getByRole("option", { name: option, exact: true }).click();
}
