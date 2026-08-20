"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createIncome,
  deleteIncome,
  getIncome,
  getIncomeSources,
  getLatestIncome,
  updateIncome,
} from "@/lib/api/incomes";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { ApiError } from "@/lib/types/api";
import { Dashboard } from "@/lib/types/dashboard";
import { IncomeRequest } from "@/lib/types/income";

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["incomes"] });
  };
}

export function useIncome(incomeId: string | undefined) {
  return useQuery({
    queryKey: ["incomes", incomeId],
    queryFn: () => getIncome(incomeId!),
    enabled: incomeId !== undefined,
  });
}

export function useLatestIncome(enabled: boolean) {
  return useQuery({
    queryKey: ["incomes", "latest"],
    queryFn: async () => {
      try {
        return await getLatestIncome();
      } catch (err) {
        // No incomes yet - no chip, not an error.
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useIncomeSources(enabled: boolean) {
  return useQuery({
    queryKey: ["incomes", "sources"],
    queryFn: getIncomeSources,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();
  const { data: accounts } = useAccounts();

  return useMutation({
    mutationKey: ["incomes", "create"],
    mutationFn: (request: IncomeRequest) => createIncome(request),
    meta: { queuedOffline: !isOnline, syncedMessage: "Income synced" },
    onMutate: (request: IncomeRequest) => {
      const [year, month] = request.date.split("-").map(Number);
      const key = ["dashboard", year, month];
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (!previous) {
        return undefined;
      }

      queryClient.setQueryData<Dashboard>(key, {
        ...previous,
        recentActivity: [
          {
            id: `pending-${Date.now()}`,
            kind: "income",
            amount: request.amount,
            description: request.source,
            category: null,
            date: request.date,
            allocations: request.allocations.map((line) => ({
              accountName: accounts?.find((a) => a.id === line.accountId)?.name ?? "",
              amount: line.amount,
            })),
            pendingSync: true,
          },
          ...previous.recentActivity,
        ],
      });

      return { key, previous };
    },
    onError: (_err, _request, context) => {
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (id, request) => {
      // Seed the single-income cache so an offline edit made shortly after
      // creating (before useIncome ever fetched this id) still has data to work with.
      queryClient.setQueryData(["incomes", id], { id, ...request });
      invalidate();
    },
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();
  const { data: accounts } = useAccounts();

  return useMutation({
    mutationKey: ["incomes", "update"],
    mutationFn: ({ incomeId, request }: { incomeId: string; request: IncomeRequest }) =>
      updateIncome(incomeId, request),
    meta: { queuedOffline: !isOnline, syncedMessage: "Income updated" },
    onMutate: ({ incomeId, request }: { incomeId: string; request: IncomeRequest }) => {
      const [year, month] = request.date.split("-").map(Number);
      const key = ["dashboard", year, month];
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (!previous) {
        return undefined;
      }

      const index = previous.recentActivity.findIndex((item) => item.id === incomeId);
      if (index === -1) {
        return { key, previous };
      }

      const recentActivity = [...previous.recentActivity];
      recentActivity[index] = {
        ...recentActivity[index],
        amount: request.amount,
        description: request.source,
        category: null,
        date: request.date,
        allocations: request.allocations.map((line) => ({
          accountName: accounts?.find((a) => a.id === line.accountId)?.name ?? "",
          amount: line.amount,
        })),
        pendingSync: true,
      };

      queryClient.setQueryData<Dashboard>(key, { ...previous, recentActivity });

      return { key, previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (_data, { incomeId, request }) => {
      queryClient.setQueryData(["incomes", incomeId], { id: incomeId, ...request });
      invalidate();
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationKey: ["incomes", "delete"],
    mutationFn: ({ incomeId }: { incomeId: string; date: string }) => deleteIncome(incomeId),
    meta: { queuedOffline: !isOnline, syncedMessage: "Income deleted" },
    onMutate: ({ incomeId, date }: { incomeId: string; date: string }) => {
      const [year, month] = date.split("-").map(Number);
      const key = ["dashboard", year, month];
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (!previous) {
        return undefined;
      }

      queryClient.setQueryData<Dashboard>(key, {
        ...previous,
        recentActivity: previous.recentActivity.filter((item) => item.id !== incomeId),
      });

      return { key, previous };
    },
    onError: (err, _vars, context) => {
      // A retried delete (e.g. resumed again after a reload interrupted the
      // first attempt's response) 404s because the row is already gone —
      // that's success, not a reason to resurrect it in the UI.
      if (err instanceof ApiError && err.status === 404) {
        return;
      }
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: invalidate,
  });
}
