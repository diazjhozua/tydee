import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/providers/QueryProvider";
import { LEGACY_CACHE_KEY, OFFLINE_QUEUE_KEY } from "@/lib/offline/offlineQueue";

type Stored = {
  clientState: {
    queries: unknown[];
    mutations: { mutationKey?: unknown[] }[];
  };
};

async function mount(): Promise<QueryClient> {
  let client: QueryClient | undefined;

  function Probe() {
    client = useQueryClient();
    return null;
  }

  // The persist provider updates state on mount; flush it inside act.
  await act(async () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
  });

  if (!client) {
    throw new Error("QueryClient was not provided");
  }
  return client;
}

// What the persister wrote. Saves are throttled, so tests wait for the expected state with vi.waitFor.
function stored(): Stored | null {
  const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw === null ? null : (JSON.parse(raw) as Stored);
}

// Starts a write while offline, so it pauses instead of running, which is what a queued change looks like.
function queueWhileOffline(client: QueryClient, mutationKey: unknown[] | undefined, variables: unknown) {
  void client
    .getMutationCache()
    .build(client, { mutationKey, mutationFn: async () => null })
    .execute(variables);
}

describe("QueryProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    window.localStorage.clear();
  });

  it("registers the card payment create mutation for offline replay", async () => {
    const client = await mount();

    const defaults = client.getMutationDefaults(["card-payments", "create"]);
    expect(defaults).toBeDefined();
    expect(defaults?.mutationFn).toBeTypeOf("function");
  });

  it("stores queued offline writes but never query data", async () => {
    const client = await mount();
    client.setQueryData(["dashboard", 2026, 11], { totalSpend: 1234 });

    onlineManager.setOnline(false);
    queueWhileOffline(client, ["expenses", "create"], { amount: 5 });

    await vi.waitFor(() => expect(stored()?.clientState.mutations).toHaveLength(1), { timeout: 3000 });
    expect(stored()?.clientState.queries).toHaveLength(0);
    expect(stored()?.clientState.mutations[0].mutationKey).toEqual(["expenses", "create"]);
  });

  it("never stores auth-style mutations or mutations without a replay function", async () => {
    const client = await mount();

    onlineManager.setOnline(false);
    // No key: stands in for login or register, whose variables carry a password.
    queueWhileOffline(client, undefined, { password: "hunter2" });
    // Keyed, but nothing registered to replay it.
    queueWhileOffline(client, ["card-payments", "delete"], { id: "payment-1" });
    queueWhileOffline(client, ["expenses", "create"], { amount: 5 });

    await vi.waitFor(() => expect(stored()).not.toBeNull(), { timeout: 3000 });
    await vi.waitFor(
      () => expect(stored()?.clientState.mutations.map((m) => m.mutationKey)).toEqual([["expenses", "create"]]),
      { timeout: 3000 },
    );
    expect(window.localStorage.getItem(OFFLINE_QUEUE_KEY)).not.toContain("hunter2");
  });

  it("removes the pre-change cache key on mount", async () => {
    window.localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify({ clientState: { queries: [{}] } }));

    await mount();

    expect(window.localStorage.getItem(LEGACY_CACHE_KEY)).toBeNull();
  });
});
