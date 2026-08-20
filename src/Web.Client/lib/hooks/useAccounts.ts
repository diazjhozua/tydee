"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAccount,
  createAccount,
  listAccounts,
  reorderAccounts,
  setAccountBalance,
  updateAccount,
  updateAllocationTemplate,
} from "@/lib/api/accounts";
import {
  Account,
  AllocationTemplateItem,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "@/lib/types/account";

export const accountKeys = {
  all: ["accounts"] as const,
  list: (includeArchived: boolean) => ["accounts", { includeArchived }] as const,
};

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };
}

export function useAccounts(includeArchived = false) {
  return useQuery({
    queryKey: accountKeys.list(includeArchived),
    queryFn: () => listAccounts(includeArchived),
  });
}

export function useCreateAccount() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (request: CreateAccountRequest) => createAccount(request),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: ({ accountId, request }: { accountId: string; request: UpdateAccountRequest }) =>
      updateAccount(accountId, request),
    onSuccess: invalidate,
  });
}

export function useArchiveAccount() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (accountId: string) => archiveAccount(accountId),
    onSuccess: invalidate,
  });
}

export function useSetAccountBalance() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: ({
      accountId,
      request,
    }: {
      accountId: string;
      request: { newBalance: number; date: string };
    }) => setAccountBalance(accountId, request),
    onSuccess: invalidate,
  });
}

export function useUpdateAllocationTemplate() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (items: AllocationTemplateItem[]) => updateAllocationTemplate(items),
    onSuccess: invalidate,
  });
}

export function useReorderAccounts() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();
  const key = accountKeys.list(false);

  return useMutation({
    mutationFn: (accountIds: string[]) => reorderAccounts(accountIds),
    onMutate: (accountIds: string[]) => {
      const previous = queryClient.getQueryData<Account[]>(key);
      if (!previous) {
        return undefined;
      }

      const byId = new Map(previous.map((a) => [a.id, a]));
      const reordered = accountIds
        .map((id, index) => {
          const account = byId.get(id);
          return account ? { ...account, displayOrder: index } : undefined;
        })
        .filter((a): a is Account => a !== undefined);

      queryClient.setQueryData<Account[]>(key, reordered);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: invalidate,
  });
}
