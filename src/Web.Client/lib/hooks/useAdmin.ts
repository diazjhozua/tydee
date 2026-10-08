"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStats, listUsers, updateUser } from "@/lib/api/admin";
import { useAuthStore } from "@/lib/stores/authStore";

export function useAdminUsers() {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers({ page: 1, pageSize: 100 }),
    enabled: hasToken,
  });
}

export function useAdminStats() {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getStats,
    enabled: hasToken,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: { isEmailVerified?: boolean; isLocked?: boolean };
    }) => updateUser(id, changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}