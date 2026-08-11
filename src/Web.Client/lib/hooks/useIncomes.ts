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
import { ApiError } from "@/lib/types/api";
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
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (request: IncomeRequest) => createIncome(request),
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
