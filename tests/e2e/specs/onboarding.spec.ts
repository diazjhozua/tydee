import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

type E2eState = {
  port: number;
  database: string;
  user: string;
};

const state = JSON.parse(
  readFileSync(fileURLToPath(new URL("../.e2e-state.json", import.meta.url)), "utf8"),
) as E2eState;

async function verificationToken(email: string): Promise<string> {
  const client = new Client({
    host: "127.0.0.1",
    port: state.port,
    database: state.database,
    user: state.user,
  });

  await client.connect();

  try {
    const result = await client.query<{ email_verification_token: string }>(
      "select email_verification_token from users where email = $1",
      [email],
    );

    expect(result.rowCount).toBe(1);
    expect(result.rows[0].email_verification_token).toBeTruthy();

    return result.rows[0].email_verification_token;
  } finally {
    await client.end();
  }
}

test("registers, verifies, logs in, and completes setup", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "Password123!";

  await page.goto("/register");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();

  const token = await verificationToken(email);
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByText("Email verified!", { exact: true })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Set up your accounts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Split your income", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByText("Budget", { exact: true })).toBeVisible();
  await expect(page.getByText("Savings", { exact: true })).toBeVisible();
});
