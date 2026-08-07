"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);

  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      setTokens(tokens.accessToken, tokens.accessTokenExpiresAt);
      router.push(searchParams.get("next") ?? "/");
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: verifyEmail });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      resetPassword(token, newPassword),
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      clear();
      router.push("/login");
    },
  });
}
