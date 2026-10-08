export type SuggestionStatus = "Open" | "Done" | "Dismissed";

export type Suggestion = {
  id: string;
  message: string;
  category: string | null;
  rating: number | null;
  status: SuggestionStatus;
  adminNote: string | null;
  createdAtUtc: string;
};

export type AdminSuggestion = Suggestion & {
  userId: string;
  userEmail: string;
};

export type SuggestionRequest = {
  message: string;
  category: string | null;
  rating: number | null;
};