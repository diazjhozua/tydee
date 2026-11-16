import { createApi } from "../api";
import { HttpError } from "../api/http";
import { expect, test } from "../fixtures";
import { createVerifiedUser } from "../fixtures/users";
import { seedPasswordResetToken } from "../support/db";
import { API_URL } from "../support/env";

// The per-user row lock (SELECT ... FOR UPDATE) only exists against PostgreSQL, and the unit tests run on InMemory,
// where it is a no-op. These checks therefore run here against the disposable database. Each iteration uses a fresh
// user, so iterations do not share sessions.
//
// Each race has two parts. The race itself runs many times, and its outcome depends on timing, so it asserts only
// what must hold in either order. A sequential twin runs one order on purpose and always checks the revoke path, so
// that path is covered on every run.

const ITERATIONS = 8;
const PARALLEL = 10;
const REUSE = "Users.TokenReuseDetected";
const INVALID_CREDENTIALS = "Users.InvalidCredentials";
const NEW_PASSWORD = "Password456!";

type Attempt<T> = { ok: true; value: T } | { ok: false; status: number; title?: string };

/** Turns an HTTP rejection into a value so parallel calls can all be compared. Network failures still throw. */
async function attempt<T>(call: Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await call };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, status: error.status, title: error.body?.title };
    }
    throw error;
  }
}

function label<T>(result: Attempt<T>): string {
  return result.ok ? "200 ok" : `${result.status} ${result.title ?? ""}`.trim();
}

test("only one of many parallel refreshes with the same token succeeds", async () => {
  const api = createApi(API_URL);

  for (let i = 0; i < ITERATIONS; i++) {
    const session = await createVerifiedUser();

    const results = await Promise.all(
      Array.from({ length: PARALLEL }, () => attempt(api.auth.refresh(session.refreshToken))),
    );

    expect(results.map(label).sort()).toEqual(
      ["200 ok", ...Array.from({ length: PARALLEL - 1 }, () => `401 ${REUSE}`)].sort(),
    );

    // The reuse detection revoked every session, including the successor the winner was issued.
    const [successor] = results.flatMap((result) => (result.ok ? [result.value] : []));
    expect(label(await attempt(api.auth.refresh(successor.refreshToken)))).toBe(`401 ${REUSE}`);
  }
});

test("a session created before an admin lock does not survive it", async ({ adminApi }) => {
  const api = createApi(API_URL);
  const user = await createVerifiedUser();
  const { id } = await createApi(API_URL, user.accessToken).me.get();

  const login = await api.auth.login(user.email, user.password);
  await adminApi.admin.updateUser(id, { isLocked: true });
  // Unlock before refreshing, so the check reaches the revoked token rather than the locked-account check.
  await adminApi.admin.updateUser(id, { isLocked: false });

  expect(label(await attempt(api.auth.refresh(login.refreshToken)))).toBe(`401 ${REUSE}`);
});

test("a login after an admin lock is refused", async ({ adminApi }) => {
  const api = createApi(API_URL);
  const user = await createVerifiedUser();
  const { id } = await createApi(API_URL, user.accessToken).me.get();

  await adminApi.admin.updateUser(id, { isLocked: true });

  expect(label(await attempt(api.auth.login(user.email, user.password)))).toBe(`401 ${INVALID_CREDENTIALS}`);
});

test("a login racing an admin lock never leaves a usable session behind", async ({ adminApi }) => {
  const api = createApi(API_URL);

  for (let i = 0; i < ITERATIONS; i++) {
    const user = await createVerifiedUser();
    const { id } = await createApi(API_URL, user.accessToken).me.get();

    const [lock, login] = await Promise.all([
      attempt(adminApi.admin.updateUser(id, { isLocked: true })),
      attempt(api.auth.login(user.email, user.password)),
    ]);

    expect(lock.ok).toBe(true);

    if (login.ok) {
      // Unlock before refreshing: while the account is locked, refresh refuses before it rotates, which would hide
      // a token the lock failed to revoke. After unlocking, a surviving token would rotate and return 200.
      await adminApi.admin.updateUser(id, { isLocked: false });
      expect(label(await attempt(api.auth.refresh(login.value.refreshToken)))).toBe(`401 ${REUSE}`);
    } else {
      expect(login.title).toBe(INVALID_CREDENTIALS);
    }
  }
});

test("a session created before a password reset does not survive it", async () => {
  const api = createApi(API_URL);
  const user = await createVerifiedUser();

  const login = await api.auth.login(user.email, user.password);
  const resetToken = await seedPasswordResetToken(user.email);
  await api.auth.resetPassword(resetToken, NEW_PASSWORD, NEW_PASSWORD);

  expect(label(await attempt(api.auth.refresh(login.refreshToken)))).toBe(`401 ${REUSE}`);
});

test("a logout racing a refresh of the same token leaves no usable session behind", async () => {
  const api = createApi(API_URL);

  for (let i = 0; i < ITERATIONS; i++) {
    const session = await createVerifiedUser();

    const [ended, refreshed] = await Promise.all([
      attempt(api.auth.logout(session.refreshToken)),
      attempt(api.auth.refresh(session.refreshToken)),
    ]);

    expect(ended.ok).toBe(true);

    if (refreshed.ok) {
      // The refresh ran first: logout must have ended the successor it issued.
      expect(label(await attempt(api.auth.refresh(refreshed.value.refreshToken)))).toBe(`401 ${REUSE}`);
    } else {
      // Logout ran first: the refresh presents a revoked token, which is reuse.
      expect(label(refreshed)).toBe(`401 ${REUSE}`);
    }
  }
});

test("a login racing a password reset never leaves a usable session behind", async () => {
  const api = createApi(API_URL);

  for (let i = 0; i < ITERATIONS; i++) {
    const user = await createVerifiedUser();
    const resetToken = await seedPasswordResetToken(user.email);

    const [login, reset] = await Promise.all([
      attempt(api.auth.login(user.email, user.password)),
      attempt(api.auth.resetPassword(resetToken, NEW_PASSWORD, NEW_PASSWORD)),
    ]);

    expect(reset.ok).toBe(true);

    if (login.ok) {
      // The login ran first with the old password, so the reset revoked the session it created.
      expect(label(await attempt(api.auth.refresh(login.value.refreshToken)))).toBe(`401 ${REUSE}`);
    } else {
      // The reset ran first, so the old password no longer works.
      expect(login.title).toBe(INVALID_CREDENTIALS);
    }
  }
});
