import { expect, test } from "../fixtures";
import { refreshThroughBff, signInThroughBff } from "../fixtures/users";
import { SettingsPage } from "../pages/settings.page";
import { BASE_URL } from "../support/env";
import { holdNextRefresh } from "../support/held-refresh";

test("a logout in one tab waits for a refresh held in another, and the session ends", async ({
  browser,
  signedIn,
}) => {
  const { page, user } = signedIn;
  const context = page.context();

  // Tab B loads first and keeps its logout button. Its own refresh completes normally.
  const settings = new SettingsPage(page);
  await settings.open();

  // Tab A refreshes the same cookie. The BFF rotates the token, and the response is held before the browser sees it.
  const refreshTab = await context.newPage();
  const hold = await holdNextRefresh(refreshTab);
  await refreshTab.goto("/app", { waitUntil: "commit" });
  await hold.rotationHeld;

  // The held response must really be a rotation that sets the cookie. Otherwise the checks below pass without
  // testing anything.
  expect(hold.rotation.status).toBe(200);
  expect(hold.rotation.cookies.map((cookie) => cookie.name)).toContain("refresh_token");

  // The logout is sent twice: at once, and again behind the held refresh. Record each answer.
  const logoutAnswers: number[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/auth/logout")) {
      logoutAnswers.push(response.status());
    }
  });

  // Log out in tab B while tab A's refresh is still held. The UI moves on at once or after its cap. The server
  // request is sent now and orders itself after the held refresh.
  await settings.logout();
  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });

  // Tab A's response now arrives and sets the rotated cookie. Both logout requests must answer before the cookie
  // is checked. The immediate one can clear the cookie first, so a cookie check alone could pass too early.
  hold.release();
  await hold.applied;
  await expect.poll(() => logoutAnswers.length, { timeout: 10_000 }).toBe(2);
  await expect
    .poll(async () => (await context.cookies()).map((cookie) => cookie.name), { timeout: 10_000 })
    .not.toContain("refresh_token");
  await refreshTab.close();

  // The server revoked the session the held refresh created too. Presenting its token is reuse.
  await context.addCookies(hold.rotation.cookies);
  expect(await refreshThroughBff(context)).toEqual({ status: 401, title: "Users.TokenReuseDetected" });

  // A login after the logout must still work. It is a new session, so the logout does not affect it.
  const other = await browser.newContext({ baseURL: BASE_URL });
  try {
    await signInThroughBff(await other.newPage(), user);
    expect((await refreshThroughBff(other)).status).toBe(200);
  } finally {
    await other.close();
  }
});
