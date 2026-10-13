"use client";

import {
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Globe,
  LogOut,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SuggestionSheet } from "@/components/suggestions/SuggestionSheet";
import { InstallSteps } from "@/components/shared/InstallSteps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LEGAL_LINKS } from "@/lib/legal/constants";
import { useLogout } from "@/lib/hooks/useAuth";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";
import { useMe, useUpdateCurrency } from "@/lib/hooks/useMe";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";
import { ApiError } from "@/lib/types/api";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: me } = useMe();
  const updateCurrency = useUpdateCurrency();
  const logout = useLogout();
  const install = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const hideBalances = useBalanceVisibilityStore((state) => state.hideBalances);
  const setHideBalances = useBalanceVisibilityStore((state) => state.setHidden);
  // False during SSR and hydration, true after - the theme select would
  // otherwise mismatch the server-rendered markup.
  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);

  const [suggestionOpen, setSuggestionOpen] = useState(false);

  const currency = me?.currency ?? "PHP";

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Preferences">
        <div className="space-y-1">
          <div className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <Globe className="size-4 text-muted-foreground" /> Currency
            </span>
            <Select
              value={currency}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                updateCurrency.mutate(value, {
                  onSuccess: () => toast.success(`Currency set to ${value}`),
                  onError: handleError,
                });
              }}
            >
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-1 opacity-50" />

          <div className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <Moon className="size-4 text-muted-foreground" /> Theme
            </span>
            {mounted && (
              <Select value={theme ?? "system"} onValueChange={(v) => v && setTheme(v)}>
                <SelectTrigger className="w-28 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="my-1 opacity-50" />

          <div className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              {hideBalances ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}{" "}
              Hide balances
            </span>
            {mounted && (
              <Button
                variant="outline"
                size="sm"
                className="w-28 rounded-xl"
                onClick={() => setHideBalances(!hideBalances)}
                aria-pressed={hideBalances}
              >
                {hideBalances ? "Hidden" : "Visible"}
              </Button>
            )}
          </div>

          <Separator className="my-1 opacity-50" />

          <div className="flex items-center justify-between py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {me ? `${me.firstName} ${me.lastName}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={() => logout.mutate()}
            >
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Install app">
        {install.isInstalled ? (
          <p className="py-1.5 text-sm text-muted-foreground">
            Tydee is installed on this device. Open it from your home screen or app list.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <Download className="size-4 text-muted-foreground" /> Add Tydee to your device
              </span>
              {install.canPrompt && (
                <Button
                  size="sm"
                  className="rounded-full font-semibold"
                  onClick={install.promptInstall}
                >
                  Install
                </Button>
              )}
            </div>
            {!install.canPrompt && <InstallSteps platform={install.platform} />}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Legal">
        <div className="space-y-1">
          {LEGAL_LINKS.map(({ href, label }) => (
            <Button
              key={href}
              render={<Link href={href} />}
              nativeButton={false}
              variant="ghost"
              className="w-full justify-between rounded-xl px-2"
            >
              <span className="text-sm font-medium">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Feedback">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-between rounded-xl px-2"
            onClick={() => setSuggestionOpen(true)}
          >
            <span className="text-sm font-medium">Send feedback</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
          {me?.isAdmin && (
            <Button
              render={<Link href="/admin" />}
              nativeButton={false}
              variant="ghost"
              className="w-full justify-between rounded-xl px-2"
            >
              <span className="text-sm font-medium">Admin</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </SectionCard>

      <a
        href="https://github.com/diazjhozua/tydee/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {`Tydee v${process.env.NEXT_PUBLIC_APP_VERSION} · What's new`}
      </a>

      <SuggestionSheet open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </div>
  );
}
