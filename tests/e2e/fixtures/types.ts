import type { Page } from "@playwright/test";
import type { TydeeApi } from "../api";
import type { Seed } from "../seed/seed";
import type { UserSession } from "./users";

export type TestFixtures = {
  verifiedUser: UserSession;
  userApi: TydeeApi;
  adminUser: UserSession;
  adminApi: TydeeApi;
  seed: Seed;
  signedIn: { page: Page; user: UserSession };
  adminSignedIn: { page: Page; user: UserSession };
  app: Page;
  adminApp: Page;
};
