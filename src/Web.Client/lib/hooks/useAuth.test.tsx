import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegisterRequest } from "@/lib/types/auth";

const register = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("@/lib/api/auth", () => ({ register }));

import { useRegister } from "@/lib/hooks/useAuth";

describe("auth mutations", () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    register.mockClear();
  });

  it("send the request while offline instead of pausing, so the password is never queued", async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRegister(), { wrapper });

    act(() => {
      result.current.mutate({ email: "a@example.com", password: "hunter2" } as RegisterRequest);
    });

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(client.getMutationCache().getAll()[0]?.state.isPaused).toBe(false);
  });
});
