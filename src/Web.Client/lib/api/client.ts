import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isLoggingOut, refreshAccessToken } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";
import { ApiError, ProblemDetails } from "@/lib/types/api";

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data;
  const problem = (typeof data === "object" && data !== null ? data : {}) as ProblemDetails;
  return new ApiError(status, problem);
}

/**
 * Sends the page to /login once a refresh has failed. A logout in progress already ends this session, and its page
 * moves on by itself. A hard navigation here could cut that request short, which would leave the server session alive.
 */
export function redirectToLoginUnlessSigningOut(
  navigate: (href: string) => void = (href) => {
    window.location.href = href;
  },
): void {
  if (typeof window === "undefined" || isLoggingOut()) {
    return;
  }

  navigate("/login");
}

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
      redirectToLoginUnlessSigningOut();
    }

    throw toApiError(error);
  },
);
