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

test("verifies and locks another user", async ({ adminApp }) => {
  const target = await createVerifiedUser();
  const admin = new AdminPage(adminApp);
  const users = new AdminUsersPage(adminApp);

  await admin.openUsers();
  await users.expectReady();

  await users.toggleVerified(target.email);
  await users.expectToast("User updated");
  await users.expectBadge(target.email, "Unverified");

  await users.toggleLocked(target.email);
  await users.expectToast("User updated");
  await users.expectBadge(target.email, "Locked");
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
