"use client";

import { Share, SquarePlus, MoreVertical, Download } from "lucide-react";

const STEPS = {
  ios: [
    { icon: Share, text: "Tap the Share button in Safari's toolbar" },
    { icon: SquarePlus, text: 'Scroll down and tap "Add to Home Screen"' },
    { icon: SquarePlus, text: 'Tap "Add" to install Tydee' },
  ],
  android: [
    { icon: MoreVertical, text: "Open the browser menu (⋮)" },
    { icon: Download, text: 'Tap "Install app" or "Add to Home screen"' },
    { icon: Download, text: "Confirm to install Tydee" },
  ],
  desktop: [
    { icon: Download, text: "Look for the install icon in the address bar" },
    { icon: Download, text: 'Click it and choose "Install"' },
  ],
} as const;

export function InstallSteps({ platform }: { platform: "ios" | "android" | "desktop" }) {
  return (
    <ol className="space-y-2.5">
      {STEPS[platform].map((step, index) => (
        <li key={step.text} className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <span className="flex items-center gap-1.5 pt-0.5 text-sm text-muted-foreground">
            <step.icon className="size-4 shrink-0" />
            {step.text}
          </span>
        </li>
      ))}
    </ol>
  );
}