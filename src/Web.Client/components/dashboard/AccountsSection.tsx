"use client";

import { AccountIcon } from "@/components/shared/AccountIcon";
import { Money } from "@/components/shared/Money";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardView } from "@/lib/stores/dashboardViewStore";
import type { AccountBalance } from "@/lib/types/dashboard";

type Props = {
  accounts: AccountBalance[];
  spent: number;
  currency: string;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

export function AccountsSection({ accounts, spent, currency, view, onViewChange }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Accounts</SectionLabel>
        <ViewToggle label="Accounts" value={view} onChange={onViewChange} />
      </div>

      {view === "grid" ? (
        <div data-view="grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {accounts.map((account) => {
            const isSpending = account.type === "Spending";
            const accountTotal = isSpending ? account.balance + spent : 0;

            return (
              <Card
                key={account.accountId}
                className="h-full rounded-2xl border-border/60 py-0 shadow-sm"
              >
                <CardContent className="flex h-full flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <AccountIcon
                      type={account.type}
                      icon={account.icon}
                      color={account.color}
                      className="size-9 rounded-lg"
                    />
                    <span className="text-xs text-muted-foreground">
                      {account.allocationPercent}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{account.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{account.type}</p>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <Money
                      value={account.balance}
                      currency={currency}
                      size="sm"
                      hideable
                      className="max-w-full"
                    />
                    {isSpending && (
                      <p className="text-[11px] font-medium text-muted-foreground">left</p>
                    )}
                  </div>
                  {isSpending && accountTotal > 0 && (
                    <div className="mt-auto h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max((account.balance / accountTotal) * 100, 0)}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div data-view="list" className="space-y-3">
          {accounts.map((account) => {
            const isSpending = account.type === "Spending";
            const accountTotal = isSpending ? account.balance + spent : 0;

            return (
              <Card key={account.accountId} className="rounded-2xl border-border/60 py-0 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <AccountIcon type={account.type} icon={account.icon} color={account.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.type} · {account.allocationPercent}%
                    </p>
                    {isSpending && accountTotal > 0 && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max((account.balance / accountTotal) * 100, 0)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Money value={account.balance} currency={currency} size="md" hideable />
                    {isSpending && (
                      <p className="text-[11px] font-medium text-muted-foreground">left</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
