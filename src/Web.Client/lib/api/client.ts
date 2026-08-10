import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { refreshAccessToken } from "@/lib/api/auth";
import {
  WAKE_UP_PROBLEM,
  coldStartDelay,
  dismissWakeUpNotice,
  showWakeUpNotice,
} from "@/lib/api/coldStart";
import { useAuthStore } from "@/lib/stores/authStore";
import { ApiError, ProblemDetails } from "@/lib/types/api";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _retriedColdStart?: boolean;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }

      useAuthStore.getState().clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const coldStart = !error.response || error.response.status === 503;
    if (coldStart && config && !config._retriedColdStart) {
      config._retriedColdStart = true;
      showWakeUpNotice();
      await coldStartDelay();
      try {
        return await apiClient(config);
      } finally {
        dismissWakeUpNotice();
      }
    }

    throw toApiError(error);
  },
);

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data;
  const problem = (typeof data === "object" && data !== null ? data : {}) as ProblemDetails;

  // A dead connection or Azure's own 503 carries no useful body.
  if ((status === 0 || status === 503) && !problem.title && !problem.detail) {
    return new ApiError(503, WAKE_UP_PROBLEM);
  }

  return new ApiError(status, problem);
}
