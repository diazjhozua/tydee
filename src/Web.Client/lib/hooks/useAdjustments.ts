"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAdjustment } from "@/lib/api/adjustments";

export function useDeleteAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adjustmentId: string) => deleteAdjustment(adjustmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
