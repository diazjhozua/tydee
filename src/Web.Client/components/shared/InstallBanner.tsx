"use client";

import { Download, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";

const DISMISS_KEY = "tydee.installBanner.dismissed";

function subscribe() {
  return () => {};
}
function getDismissedSnapshot() {
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}
function getServerDismissedSnapshot() {
  return true; // hidden until hydration confirms otherwise
}

export function InstallBanner() {
  const { canPrompt, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const storedDismissed = useSyncExternalStore(
    subscribe,
    getDismissedSnapshot,
    getServerDismissedSnapshot,
  );

  if (isInstalled || dismissed || storedDismissed) {
    return null;
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
      <Download className="size-3.5" />
      <span>Install Tydee for quick access</span>
      {canPrompt && (
        <button
          type="button"
          onClick={promptInstall}
          className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-primary/70 transition-colors hover:text-primary"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}