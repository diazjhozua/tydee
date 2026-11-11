"use client";

import { House, PenLine } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMe, useUpdateDefaultPage } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { ApiError } from "@/lib/types/api";
import { DefaultPage } from "@/lib/types/me";
import { DEFAULT_PAGE_OPTIONS, defaultPagePath } from "@/lib/utils/defaultPage";
import { cn } from "@/lib/utils";

const ICONS = {
  Home: House,
  LogExpense: PenLine,
} as const;

export function DefaultPagePrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isFetchedAfterMount } = useMe({ refetchOnMount: "always" });
  const updateDefaultPage = useUpdateDefaultPage();
  const isOnline = useOnlineStatus();
  const [escaped, setEscaped] = useState(false);

  if (
    !me ||
    !isFetchedAfterMount ||
    me.defaultPage !== null ||
    pathname.startsWith("/setup")
  ) {
    return null;
  }

  // Forced choice online. Offline or while a save is in flight, Escape and the
  // backdrop must still work so the dialog never traps the user.
  const canEscape = !isOnline || updateDefaultPage.isPending;
  if (escaped && canEscape) {
    return null;
  }

  function choose(value: DefaultPage, label: string) {
    updateDefaultPage.mutate(value, {
      onSuccess: () => {
        toast.success(`Tydee opens on ${label}`);
        if (pathname === "/app") {
          router.replace(defaultPagePath(value));
        }
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
      },
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && canEscape) {
          setEscaped(true);
        }
      }}
    >
      <DialogContent showCloseButton={false} className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Where should Tydee open?</DialogTitle>
          <DialogDescription>
            Choose the page you want to see first. You can change this later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {DEFAULT_PAGE_OPTIONS.map((option) => {
            const Icon = ICONS[option.value];

            return (
              <button
                key={option.value}
                type="button"
                disabled={updateDefaultPage.isPending || !isOnline}
                onClick={() => choose(option.value, option.label)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors",
                  "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {!isOnline && (
          <p className="text-xs text-muted-foreground">
            Connect to the internet to save your choice.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
