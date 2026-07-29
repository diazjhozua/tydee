"use client";

import { useEffect, useRef } from "react";
import { refreshAccessToken } from "@/lib/api/auth";

// Rehydrates the in-memory access token from the httpOnly cookie on cold load.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void refreshAccessToken();
  }, []);

  return <>{children}</>;
}
