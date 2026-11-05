import type { HttpClient } from "./http";
import type { DashboardResponse } from "./types";

export function createDashboardApi(http: HttpClient) {
  return {
    get: (year: number, month: number) =>
      http.get<DashboardResponse>(`/api/v1/dashboard?year=${year}&month=${month}`),
  };
}

export type DashboardApi = ReturnType<typeof createDashboardApi>;
