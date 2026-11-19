import { discardOfflineQueue } from "@/lib/offline/offlineQueue";
import { useAuthStore } from "@/lib/stores/authStore";
import { ApiError } from "@/lib/types/api";
import { AuthTokens, LoginRequest, RegisterRequest } from "@/lib/types/auth";

// Bounds on each call, so a stalled server cannot hold the cross-tab lock forever. The BFF routes cut their own
// upstream calls a little sooner (see app/api/auth/*), so these only fire when the route itself never answers.
const REFRESH_TIMEOUT_MS = 15_000;
const LOGIN_TIMEOUT_MS = 20_000;
const LOGOUT_TIMEOUT_MS = 10_000;

// AbortSignal.timeout is missing in some runtimes. Without it the call has no bound, rather than failing.
function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(ms) : undefined;
}

async function post<T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  let res: Response | null;

  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutMs === undefined ? undefined : timeoutSignal(timeoutMs),
    });
  } catch {
    throw new ApiError(0, {});
  }

  if (res === null) {
    throw new ApiError(0, {});
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data ?? {});
  }

  return data as T;
}

// Login, refresh, and logout each change the refresh_token cookie. Login and refresh run one at a time across tabs
// of this browser profile, so a refresh is never overtaken by a login. Without the Web Locks API they queue within
// this tab only.
const SESSION_LOCK = "tydee-auth-session";
let localQueue: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;

  if (locks) {
    // The lock is held until the task settles, so the callback returns that settlement and the caller gets its result.
    return new Promise<T>((resolve, reject) => {
      void locks.request(SESSION_LOCK, { mode: "exclusive" }, () => task().then(resolve, reject));
    });
  }

  const run = localQueue.then(task);
  localQueue = run.catch(() => undefined);
  return run;
}

// Bumped when a logout starts, here or in another tab. A refresh requested before that must not put an access
// token back into the store.
let logoutEpoch = 0;
let logoutsInFlight = 0;

// The UI stops waiting for logout after this long, even if a refresh ahead of it has stalled.
const LOGOUT_WAIT_LIMIT_MS = 3000;

// Tabs of one browser profile hear about a logout here, so each clears its own access token. Created only in a
// browser: a channel left open on the server would keep the process alive.
const LOGOUT_CHANNEL = "tydee-auth-logout";
const LOGOUT_MESSAGE = "logout";
const logoutChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(LOGOUT_CHANNEL)
    : null;

let onLogoutElsewhere: (() => void) | null = null;

function endSessionHere(): void {
  logoutEpoch += 1;
  useAuthStore.getState().clear();
  // Storage goes now. The in-memory queue is cleared when logout settles (useLogout), which discards storage again.
  discardOfflineQueue();
}

logoutChannel?.addEventListener("message", (event: MessageEvent) => {
  if (event.data === LOGOUT_MESSAGE) {
    endSessionHere();
    onLogoutElsewhere?.();
  }
});

// Handlers run when a refresh answers 401: the session ended without a logout (expired, or revoked elsewhere).
const sessionEndedHandlers = new Set<() => void>();

/**
 * Runs `handler` when a refresh answers 401, so the page can drop its in-memory data as well as storage. Returns a
 * function that stops it.
 */
export function onSessionEnded(handler: () => void): () => void {
  sessionEndedHandlers.add(handler);

  return () => {
    sessionEndedHandlers.delete(handler);
  };
}

/**
 * Runs `handler` when another tab of this browser profile logs out, so this tab can drop cached data too.
 * Returns a function that stops it.
 */
export function listenForLogoutElsewhere(handler: () => void): () => void {
  onLogoutElsewhere = handler;

  return () => {
    if (onLogoutElsewhere === handler) {
      onLogoutElsewhere = null;
    }
  };
}

/** True while a logout request is unsettled. A 401 then must not send the page to /login mid-request. */
export function isLoggingOut(): boolean {
  return logoutsInFlight > 0;
}

export async function login(request: LoginRequest): Promise<AuthTokens> {
  const epochAtRequest = logoutEpoch;
  const tokens = await exclusive(() => post<AuthTokens>("/api/auth/login", request, LOGIN_TIMEOUT_MS));

  // Another tab logged out while this login ran. The session it created may already be revoked, so end it here
  // too, and ask for a new login rather than storing a token.
  if (epochAtRequest !== logoutEpoch) {
    void logout();
    throw new ApiError(401, {
      title: "Users.SignedOutElsewhere",
      detail: "You were signed out in another tab. Log in again.",
    });
  }

  return tokens;
}

export function register(request: RegisterRequest): Promise<{ message: string }> {
  return post<{ message: string }>("/api/auth/register", request);
}

export function verifyEmail(token: string): Promise<{ message: string }> {
  return post<{ message: string }>("/api/auth/verify-email", { token });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return post<{ message: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`,
    { email },
  );
}

export function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<null> {
  return post<null>(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
    token,
    newPassword,
    confirmPassword,
  });
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return post<{ message: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/resend-verification`,
    { email },
  );
}

/**
 * Ends every session of the user. The request is sent now, so sessions end even while a refresh is still running.
 * The server orders it after that refresh on the user row. A refresh that was already running can still set its
 * cookie after this request has cleared it, so a second request is queued behind that refresh and clears the
 * cookie again. The returned promise resolves after LOGOUT_WAIT_LIMIT_MS at the latest, so a stall never holds the UI.
 */
export function logout(): Promise<null> {
  endSessionHere();
  logoutsInFlight += 1;
  logoutChannel?.postMessage(LOGOUT_MESSAGE);

  const now = post<null>("/api/auth/logout", undefined, LOGOUT_TIMEOUT_MS);
  const queued = exclusive(() => post<null>("/api/auth/logout", undefined, LOGOUT_TIMEOUT_MS));

  const settled = Promise.allSettled([now, queued]).then(() => {
    logoutsInFlight -= 1;
    return null;
  });
  const limit = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOGOUT_WAIT_LIMIT_MS));

  return Promise.race([settled, limit]);
}

// Single-flight: concurrent 401s and the AuthProvider mount share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const epochAtRequest = logoutEpoch;

    refreshPromise = exclusive(() => doRefresh(epochAtRequest)).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function doRefresh(epochAtRequest: number): Promise<string | null> {
  let res: Response;

  try {
    res = await fetch("/api/auth/refresh", { method: "POST", signal: timeoutSignal(REFRESH_TIMEOUT_MS) });
  } catch {
    // Network failure or timeout: the session is unknown, not ended, so the store is left alone.
    return null;
  }

  if (!res.ok) {
    // Only a real 401 ends the session. A network failure or timeout leaves the queue and cache for the next attempt.
    if (res.status === 401) {
      useAuthStore.getState().clear();
      discardOfflineQueue();
      sessionEndedHandlers.forEach((handler) => handler());
    }
    return null;
  }

  const tokens = (await res.json()) as AuthTokens;

  // Logout started after this refresh was requested. The refresh cookie is already applied, and logout ends
  // that session, so the access token must not come back into the store.
  if (epochAtRequest !== logoutEpoch) {
    return null;
  }

  useAuthStore.getState().setTokens(tokens.accessToken, tokens.accessTokenExpiresAt);
  return tokens.accessToken;
}
