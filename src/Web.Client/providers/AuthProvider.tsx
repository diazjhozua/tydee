"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { listenForLogoutElsewhere, refreshAccessToken } from "@/lib/api/auth";

// Rehydrates the in-memory access token from the httpOnly cookie on cold load. Also drops this tab's cached data
// when another tab logs out, so balances from the old session do not stay on screen.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => listenForLogoutElsewhere(() => queryClient.clear()), [queryClient]);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void refreshAccessToken();
  }, []);

  return <>{children}</>;
}
