"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { toast } from "sonner";
import { createExpense, deleteExpense, updateExpense } from "@/lib/api/expenses";
import { createIncome, deleteIncome, updateIncome } from "@/lib/api/incomes";
import { ApiError } from "@/lib/types/api";
import { ExpenseRequest } from "@/lib/types/expense";
import { IncomeRequest } from "@/lib/types/income";

type MutationMeta = {
  queuedOffline?: boolean;
  syncedMessage?: string;
};

// SSR has no localStorage; the persister just gets an in-memory stand-in
// that's discarded after the server render (nothing to persist there anyway).
function noopStorage(): Storage {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    // A mutation resumed from persisted storage after a full app close runs
    // against a fresh observer, so the useMutation() call's own onSuccess
    // (which invalidates money data) never fires - only this cache-level
    // callback does. Invalidate here too so the dashboard actually updates.
    // eslint-disable-next-line prefer-const -- assigned below, but must exist as `let` for the closure to close over it
    let client: QueryClient;

    const mutationCache = new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const meta = mutation.options.meta as MutationMeta | undefined;
        if (meta?.queuedOffline) {
          toast.success(meta.syncedMessage ?? "Synced");
          void client.invalidateQueries({ queryKey: ["accounts"] });
          void client.invalidateQueries({ queryKey: ["dashboard"] });
          void client.invalidateQueries({ queryKey: ["expenses"] });
          void client.invalidateQueries({ queryKey: ["incomes"] });
        }
      },
      onError: (error, _variables, _context, mutation) => {
        const meta = mutation.options.meta as MutationMeta | undefined;
        if (meta?.queuedOffline) {
          toast.error(
            error instanceof ApiError ? error.displayMessage : "A queued change failed to sync.",
          );
        }
      },
    });

    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: (failureCount, error) => {
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
              return false;
            }
            return failureCount < 2;
          },
        },
        mutations: {
          // Queued (paused) mutations must survive a persist/restore cycle
          // until they actually get a chance to run.
          gcTime: Infinity,
        },
      },
      mutationCache,
    });

    // Restored (persisted) mutations lose their function on JSON round-trip;
    // these defaults are what resumePausedMutations() actually invokes.
    client.setMutationDefaults(["expenses", "create"], { mutationFn: createExpense });
    client.setMutationDefaults(["incomes", "create"], { mutationFn: createIncome });
    client.setMutationDefaults(["expenses", "update"], {
      mutationFn: (vars: { expenseId: string; request: ExpenseRequest }) =>
        updateExpense(vars.expenseId, vars.request),
    });
    client.setMutationDefaults(["expenses", "delete"], {
      mutationFn: (vars: { expenseId: string; date: string }) => deleteExpense(vars.expenseId),
    });
    client.setMutationDefaults(["incomes", "update"], {
      mutationFn: (vars: { incomeId: string; request: IncomeRequest }) =>
        updateIncome(vars.incomeId, vars.request),
    });
    client.setMutationDefaults(["incomes", "delete"], {
      mutationFn: (vars: { incomeId: string; date: string }) => deleteIncome(vars.incomeId),
    });

    return client;
  });

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window === "undefined" ? noopStorage() : window.localStorage,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
        },
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
