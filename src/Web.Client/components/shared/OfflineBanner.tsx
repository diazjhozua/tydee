"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-1.5 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
      <WifiOff className="size-3.5" />
      You&apos;re offline — new entries will sync automatically
    </div>
  );
}
