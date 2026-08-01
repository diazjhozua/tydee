"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api/dashboard";
import { useAuthStore } from "@/lib/stores/authStore";

export function useDashboard(year: number, month: number) {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["dashboard", year, month],
    queryFn: () => getDashboard(year, month),
    enabled: hasToken,
  });
}
