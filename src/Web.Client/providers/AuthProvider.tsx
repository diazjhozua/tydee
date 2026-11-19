"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { listenForLogoutElsewhere, onSessionEnded, refreshAccessToken } from "@/lib/api/auth";
import { discardOfflineQueue } from "@/lib/offline/offlineQueue";

// Drops this tab's data from memory and storage together, so neither holds the previous session's queue.
function dropCachedData(client: QueryClient) {
  client.clear();
  discardOfflineQueue();
}

// Rehydrates the in-memory access token from the httpOnly cookie on cold load. Also drops this tab's cached data
// when another tab logs out or a session expires, so balances from the old session do not stay on screen.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => listenForLogoutElsewhere(() => dropCachedData(queryClient)), [queryClient]);
  useEffect(() => onSessionEnded(() => dropCachedData(queryClient)), [queryClient]);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void refreshAccessToken();
  }, []);

  return <>{children}</>;
}
