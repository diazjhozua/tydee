"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIncome, deleteIncome, updateIncome } from "@/lib/api/incomes";
import { IncomeRequest } from "@/lib/types/income";

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
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
