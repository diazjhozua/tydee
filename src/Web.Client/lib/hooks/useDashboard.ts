"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api/dashboard";
import { useAuthStore } from "@/lib/stores/authStore";

export function useDashboard() {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    enabled: hasToken,
  });
}
