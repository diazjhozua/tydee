import type { HttpClient } from "./http";
import type { AccountResponse, AccountType } from "./types";

export type CreateAccountPayload = {
  name: string;
  type: AccountType;
  allocationPercent?: number;
  icon?: string | null;
  color?: string | null;
};

export function createAccountsApi(http: HttpClient) {
  return {
    list: (includeArchived = false) =>
      http.get<AccountResponse[]>(
        `/api/v1/accounts?includeArchived=${includeArchived ? "true" : "false"}`,
      ),
    create: (payload: CreateAccountPayload) =>
      http.post<{ id: string }>("/api/v1/accounts", {
        allocationPercent: 0,
        icon: null,
        color: null,
        ...payload,
      }),
    update: (
      accountId: string,
      payload: { name: string; type: AccountType; icon: string | null; color: string | null },
    ) => http.put<void>(`/api/v1/accounts/${accountId}`, payload),
    archive: (accountId: string) => http.delete<void>(`/api/v1/accounts/${accountId}`),
    setBalance: (accountId: string, newBalance: number, date: string) =>
      http.put<{ id: string }>(`/api/v1/accounts/${accountId}/balance`, { newBalance, date }),
    updateTemplate: (items: { accountId: string; percent: number }[]) =>
      http.put<void>("/api/v1/accounts/template", { items }),
    reorder: (accountIds: string[]) =>
      http.put<void>("/api/v1/accounts/reorder", { accountIds }),
  };
}

export type AccountsApi = ReturnType<typeof createAccountsApi>;
