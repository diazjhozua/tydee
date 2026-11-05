import { API_URL } from "../support/env";
import { createAccountsApi } from "./accounts.api";
import { createAdminApi } from "./admin.api";
import { createAuthApi } from "./auth.api";
import { createDashboardApi } from "./dashboard.api";
import { createExpensesApi } from "./expenses.api";
import { HttpClient } from "./http";
import { createIncomesApi } from "./incomes.api";
import { createRecurringApi } from "./recurring.api";
import { createSuggestionsApi } from "./suggestions.api";
import { createTransfersApi } from "./transfers.api";
import type { MeResponse } from "./types";

export function createApi(baseUrl = API_URL, token?: string) {
  const http = new HttpClient(baseUrl, token);

  return {
    auth: createAuthApi(http),
    accounts: createAccountsApi(http),
    incomes: createIncomesApi(http),
    expenses: createExpensesApi(http),
    transfers: createTransfersApi(http),
    recurring: createRecurringApi(http),
    dashboard: createDashboardApi(http),
    admin: createAdminApi(http),
    suggestions: createSuggestionsApi(http),
    me: () => http.get<MeResponse>("/api/v1/me"),
  };
}

export type TydeeApi = ReturnType<typeof createApi>;
