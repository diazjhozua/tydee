import type { HttpClient } from "./http";

export type CreateTransferPayload = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
};

export function createTransfersApi(http: HttpClient) {
  return {
    create: (payload: CreateTransferPayload) =>
      http.post<{ id: string }>("/api/v1/transfers", payload),
    delete: (transferId: string) => http.delete<void>(`/api/v1/transfers/${transferId}`),
  };
}

export type TransfersApi = ReturnType<typeof createTransfersApi>;
