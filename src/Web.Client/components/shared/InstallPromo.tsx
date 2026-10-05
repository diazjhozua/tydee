"use client";

import { Download } from "lucide-react";
import { InstallSteps } from "@/components/shared/InstallSteps";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";

/**
 * "Install Tydee" prompt for public surfaces. Leads with a prominent install
 * button when the browser offers a native prompt, otherwise the manual steps.
 * Renders nothing once installed.
 */
export function InstallPromo({ className }: { className?: string }) {
  const { canPrompt, isInstalled, platform, promptInstall } = useInstallPrompt();

  if (isInstalled) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
        <p className="flex items-center gap-2 text-base font-semibold text-white">
          <Download className="size-5" />
          Install Tydee as an app
        </p>

        {canPrompt ? (
          <button
            type="button"
            onClick={promptInstall}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-emerald-700 shadow-lg transition-transform active:scale-95"
          >
            <Download className="size-4" />
            Install
          </button>
        ) : (
          <p className="text-center text-xs text-white/75">
            Add it to your home screen for one-tap access
          </p>
        )}
      </div>

      {!canPrompt && (
        <details className="mx-auto mt-4 max-w-sm text-left">
          <summary className="cursor-pointer text-center text-sm font-semibold text-white/85 hover:text-white">
            How to install
          </summary>
          <div className="mt-3 rounded-2xl bg-white/10 p-4 [&_*]:text-white/90">
            <InstallSteps platform={platform} />
          </div>
        </details>
      )}
    </div>
  );
}