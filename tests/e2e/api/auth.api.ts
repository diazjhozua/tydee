import type { HttpClient } from "./http";
import type {
  AuthResponse,
  RegisterResponse,
  ResendVerificationResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "./types";

export type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

export function createAuthApi(http: HttpClient) {
  return {
    register: (payload: RegisterPayload) =>
      http.post<RegisterResponse>("/api/v1/auth/register", payload),
    verifyEmail: (request: VerifyEmailRequest) =>
      http.post<VerifyEmailResponse>("/api/v1/auth/verify-email", request),
    resendVerification: (email: string, presentedVerificationSecret?: string) =>
      http.post<ResendVerificationResponse>("/api/v1/auth/resend-verification", {
        email,
        presentedVerificationSecret,
      }),
    login: (email: string, password: string) =>
      http.post<AuthResponse>("/api/v1/auth/login", { email, password }),
    refresh: (refreshToken: string) =>
      http.post<AuthResponse>("/api/v1/auth/refresh-token", { refreshToken }),
    logout: (refreshToken: string) =>
      http.post<void>("/api/v1/auth/logout", { refreshToken }),
    forgotPassword: (email: string) =>
      http.post<{ message: string }>("/api/v1/auth/forgot-password", { email }),
    resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
      http.post<void>("/api/v1/auth/reset-password", { token, newPassword, confirmPassword }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
