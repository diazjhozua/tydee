import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logout = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/useAuth", () => ({
  useLogout: () => ({ mutate: logout, isPending: false }),
}));

import { useSignOut } from "@/lib/hooks/useSignOut";

// Real queue, real count: the hook reads paused mutations from a QueryClient. mount() subscribes the client to
// connectivity, so going back online resumes the queue the way a reconnect does.
function setup() {
  const client = new QueryClient();
  client.mount();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useSignOut(), { wrapper });
  return { client, ...hook };
}

// Starts a write while offline, so it stays queued (paused) rather than running.
function queueWrite(client: QueryClient) {
  void client
    .getMutationCache()
    .build(client, { mutationKey: ["expenses", "create"], mutationFn: async () => null })
    .execute({ amount: 5 });
}

describe("useSignOut", () => {
  beforeEach(() => {
    logout.mockReset();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("signs out at once when nothing is unsynced", () => {
    const { result } = setup();

    act(() => {
      result.current.requestSignOut();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(result.current.askOpen).toBe(false);
  });

  it("asks when changes are queued, closes when the queue drains, and does not reopen by itself", async () => {
    onlineManager.setOnline(false);
    const { client, result } = setup();

    queueWrite(client);
    await waitFor(() => expect(client.getMutationCache().getAll()[0]?.state.isPaused).toBe(true));

    act(() => {
      result.current.requestSignOut();
    });
    expect(result.current.askOpen).toBe(true);
    expect(result.current.count).toBe(1);
    expect(logout).not.toHaveBeenCalled();

    // The queue drains while the question is open (connection back, write synced): it closes, nothing is signed out.
    onlineManager.setOnline(true);
    await waitFor(() => expect(result.current.askOpen).toBe(false));
    expect(logout).not.toHaveBeenCalled();

    // A new change queues later: the question stays closed until sign-out is requested again.
    onlineManager.setOnline(false);
    queueWrite(client);
    await waitFor(() => expect(client.getMutationCache().getAll().at(-1)?.state.isPaused).toBe(true));
    expect(result.current.askOpen).toBe(false);

    act(() => {
      result.current.requestSignOut();
    });
    expect(result.current.askOpen).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it("confirm signs out once", () => {
    onlineManager.setOnline(false);
    const { client, result } = setup();
    queueWrite(client);

    act(() => {
      result.current.confirm();
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
