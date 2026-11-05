import type { HttpClient } from "./http";
import type { AdminSuggestionResponse } from "./types";

export type CreateSuggestionPayload = {
  message: string;
  category: string | null;
  rating: number | null;
};

export function createSuggestionsApi(http: HttpClient) {
  return {
    create: (payload: CreateSuggestionPayload) =>
      http.post<{ id: string }>("/api/v1/suggestions", payload),
    list: (status?: string) => {
      const query = new URLSearchParams({ page: "1", pageSize: "100" });

      if (status) {
        query.set("status", status);
      }

      return http.get<AdminSuggestionResponse[]>(`/api/v1/suggestions?${query.toString()}`);
    },
    update: (suggestionId: string, status: string, adminNote: string | null) =>
      http.patch<void>(`/api/v1/suggestions/${suggestionId}`, { status, adminNote }),
  };
}

export type SuggestionsApi = ReturnType<typeof createSuggestionsApi>;
