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
import { getMe } from "@/lib/api/me";
import { useAuthStore } from "@/lib/stores/authStore";
import { defaultPagePath, safeNextPath } from "@/lib/utils/defaultPage";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setTokens = useAuthStore((s) => s.setTokens);

  return useMutation({
    mutationFn: login,
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.accessTokenExpiresAt);

      const next = safeNextPath(searchParams.get("next"));
      if (next) {
        router.push(next);
        return;
      }

      try {
        const me = await queryClient.fetchQuery({
          queryKey: ["me"],
          queryFn: getMe,
          staleTime: 0,
        });
        router.push(defaultPagePath(me.defaultPage));
      } catch {
        router.push("/app");
      }
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
    mutationFn: ({
      token,
      newPassword,
      confirmPassword,
    }: {
      token: string;
      newPassword: string;
      confirmPassword: string;
    }) => resetPassword(token, newPassword, confirmPassword),
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
