import type { HttpClient } from "./http";
import type { AuthResponse } from "./types";

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
      http.post<{ message: string }>("/api/v1/auth/register", payload),
    verifyEmail: (token: string) =>
      http.post<{ message: string }>("/api/v1/auth/verify-email", { token }),
    resendVerification: (email: string) =>
      http.post<{ message: string }>("/api/v1/auth/resend-verification", { email }),
    login: (email: string, password: string) =>
      http.post<AuthResponse>("/api/v1/auth/login", { email, password }),
    forgotPassword: (email: string) =>
      http.post<{ message: string }>("/api/v1/auth/forgot-password", { email }),
    resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
      http.post<void>("/api/v1/auth/reset-password", { token, newPassword, confirmPassword }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
