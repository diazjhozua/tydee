"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveRecurringExpense,
  createRecurringExpense,
  listRecurringExpenses,
  updateRecurringExpense,
} from "@/lib/api/recurringExpenses";
import { RecurringExpenseRequest } from "@/lib/types/recurringExpense";

export function useRecurringExpenses(includeArchived = false) {
  return useQuery({
    queryKey: ["recurring-expenses", includeArchived],
    queryFn: () => listRecurringExpenses(includeArchived),
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RecurringExpenseRequest) => createRecurringExpense(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
  });
}

export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recurringExpenseId,
      request,
    }: {
      recurringExpenseId: string;
      request: RecurringExpenseRequest;
    }) => updateRecurringExpense(recurringExpenseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
  });
}

export function useArchiveRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recurringExpenseId }: { recurringExpenseId: string }) =>
      archiveRecurringExpense(recurringExpenseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
  });
}
