"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransfer, deleteTransfer, TransferRequest } from "@/lib/api/transfers";

function useInvalidateMoneyData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateTransfer() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (request: TransferRequest) => createTransfer(request),
    onSuccess: invalidate,
  });
}

export function useDeleteTransfer() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (transferId: string) => deleteTransfer(transferId),
    onSuccess: invalidate,
  });
}
