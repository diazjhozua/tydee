"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

  return useMutation({
    mutationFn: logout,
    // Never paused for replay: a sign-out must not run later, after a new login. The controls are disabled offline
    // (see Sidebar and settings), so a call that does start fails at once rather than queuing.
    networkMode: "always",
    onSuccess: () => {
      // logout() has already ended the local session and discarded the queue. Clear memory, then discard storage
      // again, because a throttled save during the request may have written queued writes back.
      queryClient.clear();
      discardOfflineQueue();
      router.push("/login");
    },
    onError: () => {
      toast.error("Couldn't sign you out. You're still signed in.");
    },
  });
}
