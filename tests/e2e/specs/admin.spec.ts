import { expect, test } from "../fixtures";
import { AdminPage } from "../pages/admin.page";
import { AdminSuggestionsPage } from "../pages/admin-suggestions.page";
import { AdminUsersPage } from "../pages/admin-users.page";
import { createVerifiedUser } from "../fixtures/users";

test("shows admin stats and the admin user", async ({ adminApp, adminUser }) => {
  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.expectTiles();
  await admin.openUsers();
  await users.expectReady();
  await users.expectBadge(adminUser.email, "Admin");
  await users.expectBadge(adminUser.email, "Verified");
});

test("verifies, locks, and unlocks another user", async ({ adminApp }) => {
  const target = await createVerifiedUser();
  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.openUsers();
  await users.expectReady();

  await users.toggleVerified(target.email);
  await users.expectToast("User updated");
  await users.expectBadge(target.email, "Unverified");

  await users.lock(target.email);
  await users.expectToast("User updated");
  await users.expectBadge(target.email, "Locked");

  await users.unlock(target.email);
  await users.expectToast("User updated");
  await users.expectNoBadge(target.email, "Locked");
});

test("cancelling the lock dialog leaves the user unlocked", async ({ adminApp }) => {
  const target = await createVerifiedUser();
  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.openUsers();
  await users.expectReady();

  await users.openLockDialog(target.email);
  await users.cancelLock();

  await users.expectNoBadge(target.email, "Locked");
});

test("an admin cannot lock their own account", async ({ adminApp, adminUser }) => {
  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.openUsers();
  await users.expectReady();

  await users.expectLockDisabled(adminUser.email);
});

test("a locked user loses their session and cannot log in again", async ({
  adminApp,
  verifiedUser,
  userApi,
}) => {
  await userApi.me.get();

  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.openUsers();
  await users.expectReady();
  await users.lock(verifiedUser.email);
  await users.expectBadge(verifiedUser.email, "Locked");

  // The lock revokes the refresh token, so refresh is covered by the unit tests.
  // The e2e run checks the access token is rejected on the next request, and
  // that login no longer works.
  await expect(userApi.me.get()).rejects.toMatchObject({ status: 401 });
  await expect(userApi.auth.login(verifiedUser.email, verifiedUser.password)).rejects.toMatchObject({
    status: 401,
  });
});

test("triages a suggestion", async ({ adminApp, adminApi }) => {
  const message = `Add weekly summaries ${Date.now()}`;

  await adminApi.suggestions.create({ message, category: "Feature", rating: 4 });

  const admin = new AdminPage(adminApp);
  const suggestions = new AdminSuggestionsPage(adminApp);

  await admin.openSuggestions();
  await suggestions.expectReady();
  await suggestions.expectSuggestion(message);

  await suggestions.setStatus(message, "Done");
  await suggestions.setNote(message, "Planned for the next release.");
  await suggestions.save(message);

  await suggestions.expectToast("Suggestion updated");
  await suggestions.expectBadge(message, "Done");
});

test("redirects a non-admin away from the admin area", async ({ app }) => {
  await app.goto("/admin");

  await expect(app).toHaveURL(/\/app$/);
});
