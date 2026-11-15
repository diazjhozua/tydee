"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCardStatement } from "@/lib/api/accounts";
import { createCardPayment, deleteCardPayment } from "@/lib/api/cardPayments";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { CreateCardPaymentRequest } from "@/lib/types/cardPayment";

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

// The statement lives under the accounts prefix, so any accounts invalidation
// also refreshes it.
export function useCardStatement(accountId: string, year: number, month: number, enabled: boolean) {
  return useQuery({
    queryKey: ["accounts", accountId, "card-statement", year, month],
    queryFn: () => getCardStatement(accountId, year, month),
    enabled: enabled && accountId !== "",
  });
}

export function useCreateCardPayment() {
  const invalidate = useInvalidateMoneyData();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationKey: ["card-payments", "create"],
    mutationFn: (request: CreateCardPaymentRequest) => createCardPayment(request),
    meta: { queuedOffline: !isOnline, syncedMessage: "Card payment synced" },
    onSuccess: invalidate,
  });
}

// Online-only: the sheet disables delete while offline.
export function useDeleteCardPayment() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMoneyData();

  return useMutation({
    mutationKey: ["card-payments", "delete"],
    mutationFn: ({ paymentId }: { paymentId: string; cardAccountId: string }) =>
      deleteCardPayment(paymentId),
    onSuccess: (_data, { cardAccountId }) => {
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: ["accounts", cardAccountId, "card-statement"],
      });
    },
  });
}
