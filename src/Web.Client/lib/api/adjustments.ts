import { apiClient } from "@/lib/api/client";

export async function deleteAdjustment(adjustmentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/adjustments/${adjustmentId}`);
}
