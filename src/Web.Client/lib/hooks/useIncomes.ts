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
    onSuccess: invalidate,
  });
}

export function useUpdateIncome() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: ({ incomeId, request }: { incomeId: string; request: IncomeRequest }) =>
      updateIncome(incomeId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteIncome() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (incomeId: string) => deleteIncome(incomeId),
    onSuccess: invalidate,
  });
}
