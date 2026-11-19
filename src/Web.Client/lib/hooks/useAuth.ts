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
import { discardOfflineQueue } from "@/lib/offline/offlineQueue";
import { useAuthStore } from "@/lib/stores/authStore";
import { defaultPagePath, safeNextPath } from "@/lib/utils/defaultPage";

// Auth calls fail at once when offline instead of pausing. A paused auth mutation would sit in storage with its
// password or reset token, and it could not be replayed anyway.
const NOT_QUEUED = { networkMode: "always" } as const;

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setTokens = useAuthStore((s) => s.setTokens);

  return useMutation({
    ...NOT_QUEUED,
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
  return useMutation({ ...NOT_QUEUED, mutationFn: register });
}

export function useVerifyEmail() {
  return useMutation({ ...NOT_QUEUED, mutationFn: verifyEmail });
}

export function useForgotPassword() {
  return useMutation({ ...NOT_QUEUED, mutationFn: forgotPassword });
}

export function useResendVerification() {
  return useMutation({ ...NOT_QUEUED, mutationFn: resendVerification });
}

export function useResetPassword() {
  return useMutation({
    ...NOT_QUEUED,
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
    // Sign-out must not wait for the network. Paused offline, it would sit disabled until reconnect.
    networkMode: "always",
    onSettled: () => {
      // Memory is cleared here, once the logout request settles. A throttled save during that wait may have written
      // the queue back to storage, so storage is discarded again after the clear.
      queryClient.clear();
      discardOfflineQueue();
      clear();
      router.push("/login");
    },
  });
}
