import { apiClient } from "@/lib/api/client";

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
};

export async function createTransfer(request: TransferRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/transfers", request);
  return res.data.id;
}

export async function deleteTransfer(transferId: string): Promise<void> {
  await apiClient.delete(`/api/v1/transfers/${transferId}`);
}
