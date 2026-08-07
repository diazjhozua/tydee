import { useAuthStore } from "@/lib/stores/authStore";
import { ApiError } from "@/lib/types/api";
import { AuthTokens, LoginRequest, RegisterRequest } from "@/lib/types/auth";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data ?? {});
  }

  return data as T;
}

export function login(request: LoginRequest): Promise<AuthTokens> {
  return post<AuthTokens>("/api/auth/login", request);
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

export function resetPassword(token: string, newPassword: string): Promise<null> {
  return post<null>(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
    token,
    newPassword,
  });
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return post<{ message: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/resend-verification`,
    { email },
  );
}

export function logout(): Promise<null> {
  return post<null>("/api/auth/logout");
}

// Single-flight: concurrent 401s and the AuthProvider mount share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function doRefresh(): Promise<string | null> {
  const res = await fetch("/api/auth/refresh", { method: "POST" });

  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().clear();
    }
    return null;
  }

  const tokens = (await res.json()) as AuthTokens;
  useAuthStore.getState().setTokens(tokens.accessToken, tokens.accessTokenExpiresAt);
  return tokens.accessToken;
}
