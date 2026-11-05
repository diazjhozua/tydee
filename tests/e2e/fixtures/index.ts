import { test as base, expect } from "@playwright/test";
import { createApi } from "../api";
import { AdminPage } from "../pages/admin.page";
import { DashboardPage } from "../pages/dashboard.page";
import { Seed } from "../seed/seed";
import { API_URL } from "../support/env";
import { createAdminUser, createVerifiedUser, signInThroughBff } from "./users";
import type { TestFixtures } from "./types";

export const test = base.extend<TestFixtures>({
  verifiedUser: async ({}, use) => {
    await use(await createVerifiedUser());
  },

  userApi: async ({ verifiedUser }, use) => {
    await use(createApi(API_URL, verifiedUser.accessToken));
  },

  adminUser: async ({}, use) => {
    await use(await createAdminUser());
  },

  adminApi: async ({ adminUser }, use) => {
    await use(createApi(API_URL, adminUser.accessToken));
  },

  seed: async ({ userApi }, use) => {
    await use(new Seed(userApi));
  },

  signedIn: async ({ page, verifiedUser }, use) => {
    await signInThroughBff(page, verifiedUser);
    await use({ page, user: verifiedUser });
  },

  adminSignedIn: async ({ page, adminUser }, use) => {
    await signInThroughBff(page, adminUser);
    await use({ page, user: adminUser });
  },

  app: async ({ page, seed, signedIn }, use) => {
    await seed.withAccounts();
    await new DashboardPage(page).open();
    await use(page);
  },

  adminApp: async ({ page, adminSignedIn }, use) => {
    await new AdminPage(page).open();
    await use(page);
  },
});

export { expect };
