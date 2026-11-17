import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthModule = typeof import("@/lib/api/auth");
type LoginArgs = Parameters<AuthModule["login"]>[0];

// Each fetch waits until the test answers it, so the order of requests can be asserted.
type PendingCall = {
  url: string;
  answer: (res: Response) => void;
  fail: (err: unknown) => void;
};

function queueFetch(): PendingCall[] {
  const calls: PendingCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string) =>
        new Promise<Response>((resolve, reject) => {
          calls.push({ url, answer: resolve, fail: reject });
        }),
    ),
  );
  return calls;
}

// Lets queued microtasks run, so the next request is recorded before the test looks at the list.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Calls to one endpoint, in request order. A refresh and an immediate logout can start in either order, so the
// tests pick calls by endpoint rather than by position.
const REFRESH = "/api/auth/refresh";
const LOGOUT = "/api/auth/logout";
const LOGIN = "/api/auth/login";
const callsTo = (calls: PendingCall[], url: string) => calls.filter((call) => call.url === url);

// Mirrors the browser's exclusive lock: one holder at a time, granted in request order.
function fakeLocks() {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    request: <T>(_name: string, _options: unknown, task: () => Promise<T>): Promise<T> => {
      const run = tail.then(task);
      tail = run.catch(() => undefined);
      return run;
    },
  };
}

// Stands in for BroadcastChannel: channels with one name hear each other's messages, as tabs do.
const channels: FakeChannel[] = [];

class FakeChannel {
  private readonly listeners: ((event: MessageEvent) => void)[] = [];

  constructor(readonly name: string) {
    channels.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  postMessage(data: unknown) {
    for (const other of channels) {
      if (other !== this && other.name === this.name) {
        queueMicrotask(() => other.listeners.forEach((listener) => listener({ data } as MessageEvent)));
      }
    }
  }
}

// Fresh module state per test: the refresh single-flight, the logout epoch, and the channel live at module level.
async function load() {
  vi.resetModules();
  const auth = await import("@/lib/api/auth");
  const { useAuthStore } = await import("@/lib/stores/authStore");
  return { auth, useAuthStore };
}

const tokens = { accessToken: "access-2", accessTokenExpiresAt: "2026-11-17T12:00:00Z" };
const refreshed = () => new Response(JSON.stringify(tokens), { status: 200 });
const unauthorized = () => new Response(null, { status: 401 });
const noContent = () => new Response(null, { status: 204 });
const credentials = { email: "a@example.com", password: "secret" } as LoginArgs;

describe.each([
  ["with the Web Locks API", true],
  ["without it, queueing within the tab", false],
])("session ordering %s", (_label, withLocks) => {
  beforeEach(() => {
    channels.length = 0;
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    if (withLocks) {
      vi.stubGlobal("navigator", { locks: fakeLocks() });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("logout ends sessions at once, then again after a refresh that was already running", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const refreshing = auth.refreshAccessToken();
    const loggingOut = auth.logout();
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(1);
    expect(callsTo(calls, REFRESH)).toHaveLength(1);

    callsTo(calls, LOGOUT)[0].answer(noContent());
    callsTo(calls, REFRESH)[0].answer(unauthorized());
    await refreshing;
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(2);

    callsTo(calls, LOGOUT)[1].answer(noContent());
    await loggingOut;
  });

  it("a refresh requested before logout sets no access token", async () => {
    const calls = queueFetch();
    const { auth, useAuthStore } = await load();

    const refreshing = auth.refreshAccessToken();
    const loggingOut = auth.logout();
    await settle();

    callsTo(calls, LOGOUT)[0].answer(noContent());
    callsTo(calls, REFRESH)[0].answer(refreshed());
    await expect(refreshing).resolves.toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();

    await settle();
    callsTo(calls, LOGOUT)[1].answer(noContent());
    await loggingOut;
  });

  it("a refresh requested after logout runs after the logout requests", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const loggingOut = auth.logout();
    await settle();
    const refreshing = auth.refreshAccessToken();
    await settle();
    expect(callsTo(calls, REFRESH)).toHaveLength(0);

    callsTo(calls, LOGOUT)[0].answer(noContent());
    callsTo(calls, LOGOUT)[1].answer(noContent());
    await loggingOut;
    await settle();
    expect(callsTo(calls, REFRESH)).toHaveLength(1);

    callsTo(calls, REFRESH)[0].answer(unauthorized());
    await expect(refreshing).resolves.toBeNull();
  });

  it("logout resolves within three seconds while a refresh stalls", async () => {
    const calls = queueFetch();
    const { auth } = await load();
    vi.useFakeTimers();

    void auth.refreshAccessToken();
    const loggingOut = auth.logout();

    await vi.advanceTimersByTimeAsync(3000);
    await expect(loggingOut).resolves.toBeNull();
    expect(callsTo(calls, REFRESH)).toHaveLength(1);
    expect(callsTo(calls, LOGOUT)).toHaveLength(1);
  });

  it("a rejected refresh releases the queue for the second logout request", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const refreshing = auth.refreshAccessToken();
    const loggingOut = auth.logout();
    await settle();

    // A network failure leaves the session unknown, not ended: the refresh resolves to null and the queue moves on.
    callsTo(calls, REFRESH)[0].fail(new TypeError("network down"));
    await expect(refreshing).resolves.toBeNull();
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(2);

    callsTo(calls, LOGOUT)[0].answer(noContent());
    callsTo(calls, LOGOUT)[1].answer(noContent());
    await loggingOut;
  });

  it("login waits behind a logout that is still running", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const loggingOut = auth.logout();
    await settle();
    const loggingIn = auth.login(credentials);
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(2);
    expect(callsTo(calls, LOGIN)).toHaveLength(0);

    callsTo(calls, LOGOUT)[0].answer(noContent());
    callsTo(calls, LOGOUT)[1].answer(noContent());
    await loggingOut;
    await settle();
    expect(callsTo(calls, LOGIN)).toHaveLength(1);

    callsTo(calls, LOGIN)[0].answer(refreshed());
    await expect(loggingIn).resolves.toEqual(tokens);
  });

  it("concurrent refreshes share one request", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const first = auth.refreshAccessToken();
    const second = auth.refreshAccessToken();
    await settle();
    expect(callsTo(calls, REFRESH)).toHaveLength(1);

    callsTo(calls, REFRESH)[0].answer(unauthorized());
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toBeNull();
  });

  it("a refresh after an earlier one settles sends a new request", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const first = auth.refreshAccessToken();
    await settle();
    callsTo(calls, REFRESH)[0].answer(unauthorized());
    await first;

    const second = auth.refreshAccessToken();
    await settle();
    expect(callsTo(calls, REFRESH)).toHaveLength(2);

    callsTo(calls, REFRESH)[1].answer(refreshed());
    await expect(second).resolves.toBe(tokens.accessToken);
  });

  it("a refresh with no logout stores the access token", async () => {
    const calls = queueFetch();
    const { auth, useAuthStore } = await load();

    const refreshing = auth.refreshAccessToken();
    await settle();
    callsTo(calls, REFRESH)[0].answer(refreshed());

    await expect(refreshing).resolves.toBe(tokens.accessToken);
    expect(useAuthStore.getState().accessToken).toBe(tokens.accessToken);
  });

  it("a logout in another tab clears this tab's access token", async () => {
    const calls = queueFetch();
    const tabOne = await load();
    const tabTwo = await load();

    const refreshing = tabTwo.auth.refreshAccessToken();
    await settle();
    callsTo(calls, REFRESH)[0].answer(refreshed());
    await refreshing;
    expect(tabTwo.useAuthStore.getState().accessToken).toBe(tokens.accessToken);

    const loggingOut = tabOne.auth.logout();
    await settle();
    expect(tabTwo.useAuthStore.getState().accessToken).toBeNull();

    callsTo(calls, LOGOUT).forEach((call) => call.answer(noContent()));
    await loggingOut;
  });

  it("a refresh running in another tab sets no token after this tab logs out", async () => {
    const calls = queueFetch();
    const tabOne = await load();
    const tabTwo = await load();

    const refreshing = tabTwo.auth.refreshAccessToken();
    await settle();
    void tabOne.auth.logout();
    await settle();

    callsTo(calls, REFRESH)[0].answer(refreshed());
    await expect(refreshing).resolves.toBeNull();
    expect(tabTwo.useAuthStore.getState().accessToken).toBeNull();
  });

  it("logout resolves even when the BFF answers with an error", async () => {
    const calls = queueFetch();
    const { auth } = await load();

    const loggingOut = auth.logout();
    await settle();
    callsTo(calls, LOGOUT).forEach((call) => call.answer(new Response(null, { status: 500 })));

    await expect(loggingOut).resolves.toBeNull();
  });

  it("a login that finishes after another tab logs out is refused, and stores no token", async () => {
    const calls = queueFetch();
    const tabOne = await load();
    const tabTwo = await load();

    const loggingIn = tabOne.auth.login(credentials);
    await settle();
    void tabTwo.auth.logout();
    await settle();

    callsTo(calls, LOGIN)[0].answer(refreshed());
    await expect(loggingIn).rejects.toMatchObject({ title: "Users.SignedOutElsewhere" });
    expect(tabOne.useAuthStore.getState().accessToken).toBeNull();
  });

  // Two module instances stand in for two tabs. They share the one lock, as tabs of a browser profile do.
  it.runIf(withLocks)("a logout in another tab waits behind a refresh in this tab", async () => {
    const calls = queueFetch();
    const tabOne = await load();
    const tabTwo = await load();

    const refreshing = tabOne.auth.refreshAccessToken();
    const loggingOut = tabTwo.auth.logout();
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(1);

    callsTo(calls, REFRESH)[0].answer(unauthorized());
    await refreshing;
    await settle();
    expect(callsTo(calls, LOGOUT)).toHaveLength(2);

    callsTo(calls, LOGOUT).forEach((call) => call.answer(noContent()));
    await loggingOut;
  });
});
