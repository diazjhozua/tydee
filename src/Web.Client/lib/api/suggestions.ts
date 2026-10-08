import { apiClient } from "@/lib/api/client";
import {
  AdminSuggestion,
  Suggestion,
  SuggestionRequest,
  SuggestionStatus,
} from "@/lib/types/suggestion";

export async function createSuggestion(request: SuggestionRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/suggestions", request);
  return res.data.id;
}

export async function listMySuggestions(): Promise<Suggestion[]> {
  const res = await apiClient.get<Suggestion[]>("/api/v1/suggestions/mine");
  return res.data;
}

export async function listSuggestions(params: {
  status?: SuggestionStatus;
  page?: number;
  pageSize?: number;
}): Promise<AdminSuggestion[]> {
  const res = await apiClient.get<AdminSuggestion[]>("/api/v1/suggestions", { params });
  return res.data;
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus,
  adminNote: string | null,
): Promise<void> {
  await apiClient.patch(`/api/v1/suggestions/${suggestionId}`, { status, adminNote });
}