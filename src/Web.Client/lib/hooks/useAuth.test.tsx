import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterRequest } from "@/lib/types/auth";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(async () => ({})),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/auth", () => ({
  forgotPassword: vi.fn(),
  login: vi.fn(),
  logout: state.logout,
  register: state.register,
  resendVerification: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
}));

vi.mock("@/lib/api/me", () => ({ getMe: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import { useLogout, useRegister } from "@/lib/hooks/useAuth";

function wrapperFor(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["accounts"], []);

  const hook = renderHook(() => useLogout(), { wrapper: wrapperFor(queryClient) });

  return { queryClient, ...hook };
}

describe("useLogout", () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("returns to /login and drops cached data once the server confirms", async () => {
    state.logout.mockResolvedValue(null);
    const { queryClient, result } = setup();

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/login"));
    expect(queryClient.getQueryData(["accounts"])).toBeUndefined();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("stays put, keeps cached data, and says so when the server does not confirm", async () => {
    state.logout.mockRejectedValue(new Error("503"));
    const { queryClient, result } = setup();

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't sign you out. You're still signed in."),
    );
    expect(state.push).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["accounts"])).toEqual([]);
  });

  it("is never paused offline, so a sign-out cannot run later, after a reconnect", async () => {
    onlineManager.setOnline(false);
    state.logout.mockRejectedValue(new Error("offline"));
    const { result } = setup();

    await act(async () => {
      result.current.mutate();
    });

    expect(state.logout).toHaveBeenCalledTimes(1);
    expect(result.current.isPaused).toBe(false);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe("useRegister", () => {
  beforeEach(() => {
    state.register.mockClear();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("sends the request while offline instead of pausing, so the password is never queued", async () => {
    onlineManager.setOnline(false);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useRegister(), { wrapper: wrapperFor(queryClient) });

    act(() => {
      result.current.mutate({ email: "a@example.com", password: "hunter2" } as RegisterRequest);
    });

    await waitFor(() => expect(state.register).toHaveBeenCalledTimes(1));
    expect(queryClient.getMutationCache().getAll()[0]?.state.isPaused).toBe(false);
  });
});
