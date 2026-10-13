"use client";

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { SetBalanceSheet } from "@/components/accounts/SetBalanceSheet";
import { SortableAccountRow } from "@/components/accounts/SortableAccountRow";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccounts,
  useArchiveAccount,
  useReorderAccounts,
  useUpdateAllocationTemplate,
} from "@/lib/hooks/useAccounts";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { Account } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const { data: accounts, isPending } = useAccounts();
  const { data: me } = useMe();
  const archiveAccount = useArchiveAccount();
  const reorderAccounts = useReorderAccounts();
  const updateTemplate = useUpdateAllocationTemplate();
  const isOnline = useOnlineStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [balanceAccount, setBalanceAccount] = useState<Account | undefined>();
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [seededAccounts, setSeededAccounts] = useState<Account[] | undefined>();

  const activeAccounts = accounts ?? [];
  const currency = me?.currency ?? "PHP";
  const total = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
  const percentTotal = activeAccounts.reduce((sum, a) => sum + (Number(percents[a.id]) || 0), 0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (accounts !== seededAccounts) {
    setSeededAccounts(accounts);
    if (accounts) {
      setPercents(Object.fromEntries(accounts.map((a) => [a.id, String(a.allocationPercent)])));
    }
  }

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function saveTemplate() {
    updateTemplate.mutate(
      activeAccounts.map((a) => ({ accountId: a.id, percent: Number(percents[a.id]) || 0 })),
      {
        onSuccess: () => toast.success("Template saved"),
        onError: handleError,
      },
    );
  }

  function archive(account: Account) {
    archiveAccount.mutate(account.id, {
      onSuccess: () => toast.success(`${account.name} archived`),
      onError: handleError,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeAccounts.findIndex((a) => a.id === active.id);
    const newIndex = activeAccounts.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(activeAccounts, oldIndex, newIndex);
    reorderAccounts.mutate(reordered.map((a) => a.id), { onError: handleError });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Accounts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Your envelopes. Drag to reorder.</p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full font-semibold"
          onClick={() => {
            setEditingAccount(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Total balance</span>
        <Money value={total} currency={currency} size="md" hideable />
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="space-y-1">
          {isPending && (
            <div className="space-y-2 py-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isPending && (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={activeAccounts.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {activeAccounts.map((account, index) => (
                  <div key={account.id}>
                    {index > 0 && <Separator className="my-1 opacity-50" />}
                    <SortableAccountRow
                      account={account}
                      currency={currency}
                      archiveDisabled={!isOnline}
                      onEdit={() => {
                        setEditingAccount(account);
                        setDialogOpen(true);
                      }}
                      onSetBalance={() => setBalanceAccount(account)}
                      onArchive={() => archive(account)}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          )}

          {!isPending && activeAccounts.length === 0 && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">No accounts yet.</p>
              <Button
                render={<Link href="/setup" />}
                nativeButton={false}
                size="sm"
                className="rounded-full font-semibold"
              >
                Set up accounts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0 pt-1">
        <h2 className="text-sm font-semibold">Allocation template</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How each income is split across your accounts. Must total 100%.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="space-y-3">
          {isPending && (
            <div className="space-y-2 py-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isPending &&
            activeAccounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3">
                <AccountIcon
                  type={account.type}
                  icon={account.icon}
                  color={account.color}
                  className="size-9 rounded-lg"
                />
                <span className="flex-1 truncate text-sm font-medium">{account.name}</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    className="money h-10 w-20 rounded-xl text-right"
                    value={percents[account.id] ?? ""}
                    onChange={(e) =>
                      setPercents((prev) => ({ ...prev, [account.id]: e.target.value }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}

          {!isPending && activeAccounts.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Add an account to set up your allocation.
            </p>
          )}

          {!isPending && activeAccounts.length > 0 && (
            <>
              <div className="space-y-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      percentTotal === 100 ? "bg-primary" : "bg-destructive/70",
                    )}
                    style={{ width: `${Math.min(percentTotal, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span
                    className={cn(
                      "money font-semibold",
                      percentTotal === 100 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {percentTotal}%
                  </span>
                </div>
                {percentTotal !== 100 && (
                  <p className="text-xs text-muted-foreground">
                    {percentTotal < 100
                      ? `${100 - percentTotal}% left to allocate`
                      : `${percentTotal - 100}% over`}
                  </p>
                )}
              </div>

              <Button
                className="h-11 w-full rounded-xl font-semibold"
                onClick={saveTemplate}
                disabled={percentTotal !== 100 || updateTemplate.isPending || !isOnline}
              >
                {!isOnline
                  ? "Go online to save"
                  : updateTemplate.isPending
                    ? "Saving..."
                    : "Save template"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} account={editingAccount} />

      <SetBalanceSheet
        open={balanceAccount !== undefined}
        onOpenChange={(open) => !open && setBalanceAccount(undefined)}
        account={balanceAccount}
      />
    </div>
  );
}