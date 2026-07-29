import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { refreshAccessToken } from "@/lib/api/auth";
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

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

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

    throw toApiError(error);
  },
);

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const problem = (error.response?.data ?? {}) as ProblemDetails;
  return new ApiError(status, problem);
}
