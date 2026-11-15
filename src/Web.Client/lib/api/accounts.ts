import { apiClient } from "@/lib/api/client";
import {
  Account,
  AllocationTemplateItem,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "@/lib/types/account";
import { CardStatement } from "@/lib/types/cardPayment";

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const res = await apiClient.get<Account[]>("/api/v1/accounts", {
    params: { includeArchived },
  });
  return res.data;
}

export async function createAccount(request: CreateAccountRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/accounts", request);
  return res.data.id;
}

export async function updateAccount(accountId: string, request: UpdateAccountRequest): Promise<void> {
  await apiClient.put(`/api/v1/accounts/${accountId}`, request);
}

export async function archiveAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/api/v1/accounts/${accountId}`);
}

export async function setAccountBalance(
  accountId: string,
  request: { newBalance: number; date: string },
): Promise<void> {
  await apiClient.put(`/api/v1/accounts/${accountId}/balance`, request);
}

export async function getCardStatement(
  accountId: string,
  year: number,
  month: number,
): Promise<CardStatement> {
  const res = await apiClient.get<CardStatement>(`/api/v1/accounts/${accountId}/card-statement`, {
    params: { year, month },
  });
  return res.data;
}

export async function updateAllocationTemplate(items: AllocationTemplateItem[]): Promise<void> {
  await apiClient.put("/api/v1/accounts/template", { items });
}

export async function reorderAccounts(accountIds: string[]): Promise<void> {
  await apiClient.put("/api/v1/accounts/reorder", { accountIds });
}
