"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSuggestion,
  listMySuggestions,
  listSuggestions,
  updateSuggestionStatus,
} from "@/lib/api/suggestions";
import { useAuthStore } from "@/lib/stores/authStore";
import { SuggestionStatus } from "@/lib/types/suggestion";

export function useMySuggestions() {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["suggestions", "mine"],
    queryFn: listMySuggestions,
    enabled: hasToken,
  });
}

export function useCreateSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useSuggestions(status?: SuggestionStatus) {
  const hasToken = useAuthStore((s) => s.accessToken !== null);

  return useQuery({
    queryKey: ["suggestions", "all", status ?? "any"],
    queryFn: () => listSuggestions({ status, page: 1, pageSize: 100 }),
    enabled: hasToken,
  });
}

export function useUpdateSuggestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: SuggestionStatus;
      adminNote: string | null;
    }) => updateSuggestionStatus(id, status, adminNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}