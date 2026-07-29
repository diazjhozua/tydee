"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, updateCurrency } from "@/lib/api/me";
import { useAuthStore } from "@/lib/stores/authStore";

export function useMe() {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currency: string) => updateCurrency(currency),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
