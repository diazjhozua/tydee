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
import { ApiError } from "@/lib/types/api";
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
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationKey: ["expenses", "update"],
    mutationFn: ({ expenseId, request }: { expenseId: string; request: ExpenseRequest }) =>
      updateExpense(expenseId, request),
    meta: { queuedOffline: !isOnline, syncedMessage: "Expense updated" },
    onMutate: ({ expenseId, request }: { expenseId: string; request: ExpenseRequest }) => {
      const [year, month] = request.date.split("-").map(Number);
      const key = ["dashboard", year, month];
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (!previous) {
        return undefined;
      }

      const index = previous.recentActivity.findIndex((item) => item.id === expenseId);
      if (index === -1) {
        return { key, previous };
      }

      const recentActivity = [...previous.recentActivity];
      recentActivity[index] = {
        ...recentActivity[index],
        amount: request.amount,
        description: request.note ?? request.category ?? "Expense",
        category: request.category,
        date: request.date,
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
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationKey: ["expenses", "delete"],
    mutationFn: ({ expenseId }: { expenseId: string; date: string }) => deleteExpense(expenseId),
    meta: { queuedOffline: !isOnline, syncedMessage: "Expense deleted" },
    onMutate: ({ expenseId, date }: { expenseId: string; date: string }) => {
      const [year, month] = date.split("-").map(Number);
      const key = ["dashboard", year, month];
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (!previous) {
        return undefined;
      }

      queryClient.setQueryData<Dashboard>(key, {
        ...previous,
        recentActivity: previous.recentActivity.filter((item) => item.id !== expenseId),
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
