"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useConsentStore } from "@/lib/stores/consentStore";

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

export function CookieBanner() {
  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const choice = useConsentStore((state) => state.choice);
  const setChoice = useConsentStore((state) => state.setChoice);

  if (!mounted || choice !== undefined) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 px-4">
      <div className="mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-border/60 bg-background/90 p-4 shadow-lg backdrop-blur-md">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Tydee uses only a strictly-necessary session cookie and local browser storage. We use no
          tracking or analytics cookies. See our{" "}
          <Link href="/cookie-policy" className="font-medium text-primary hover:underline">
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setChoice("necessary")}>
            Necessary only
          </Button>
          <Button size="sm" className="rounded-xl" onClick={() => setChoice("all")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}