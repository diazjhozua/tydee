"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  deleteExpense,
  getExpenseCategories,
  listExpenses,
  updateExpense,
} from "@/lib/api/expenses";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { Dashboard } from "@/lib/types/dashboard";
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

export function useExpenseCategories(enabled: boolean) {
  return useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: getExpenseCategories,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationKey: ["expenses", "create"],
    mutationFn: (request: ExpenseRequest) => createExpense(request),
    meta: { queuedOffline: !isOnline, syncedMessage: "Expense synced" },
    onMutate: (request: ExpenseRequest) => {
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
            kind: "expense",
            amount: request.amount,
            description: request.note ?? request.category ?? "Expense",
            category: request.category,
            date: request.date,
            allocations: [],
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
