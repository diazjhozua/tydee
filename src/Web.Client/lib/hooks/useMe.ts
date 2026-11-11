"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, updateCurrency, updateDefaultPage } from "@/lib/api/me";
import { useAuthStore } from "@/lib/stores/authStore";
import { DefaultPage, Me } from "@/lib/types/me";

export function useMe(options: { refetchOnMount?: boolean | "always" } = {}) {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    staleTime: 5 * 60_000,
    refetchOnMount: options.refetchOnMount,
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

export function useUpdateDefaultPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaultPage: DefaultPage) => updateDefaultPage(defaultPage),
    onSuccess: (_result, defaultPage) => {
      queryClient.setQueryData<Me>(["me"], (me) =>
        me ? { ...me, defaultPage } : me,
      );
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
