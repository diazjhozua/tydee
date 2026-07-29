"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExpense, deleteExpense, listExpenses, updateExpense } from "@/lib/api/expenses";
import { ExpenseRequest } from "@/lib/types/expense";

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };
}

export function useExpenses(params: { accountId?: string; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => listExpenses(params),
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (request: ExpenseRequest) => createExpense(request),
    onSuccess: invalidate,
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: ({ expenseId, request }: { expenseId: string; request: ExpenseRequest }) =>
      updateExpense(expenseId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: invalidate,
  });
}
