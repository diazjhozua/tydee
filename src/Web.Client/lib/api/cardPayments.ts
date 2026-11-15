import { apiClient } from "@/lib/api/client";
import { CreateCardPaymentRequest } from "@/lib/types/cardPayment";

export async function createCardPayment(request: CreateCardPaymentRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/card-payments", request);
  return res.data.id;
}

export async function deleteCardPayment(paymentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/card-payments/${paymentId}`);
}
