"use client";

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  Globe,
  GripVertical,
  LogOut,
  MoreVertical,
  Moon,
  Pencil,
  Percent,
  Scale,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { SetBalanceSheet } from "@/components/accounts/SetBalanceSheet";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useAccounts,
  useArchiveAccount,
  useReorderAccounts,
  useUpdateAllocationTemplate,
} from "@/lib/hooks/useAccounts";
import { useLogout } from "@/lib/hooks/useAuth";
import { useMe, useUpdateCurrency } from "@/lib/hooks/useMe";
import { Account } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

function SortableAccountRow({
  account,
  currency,
  onEdit,
  onSetBalance,
  onArchive,
}: {
  account: Account;
  currency: string;
  onEdit: () => void;
  onSetBalance: () => void;
  onArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 py-1.5", isDragging && "z-10 opacity-90")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <AccountIcon
        type={account.type}
        icon={account.icon}
        color={account.color}
        className="size-9 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{account.name}</p>
        <p className="text-xs text-muted-foreground">{account.type}</p>
      </div>
      <Money value={account.balance} currency={currency} size="sm" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Account actions"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSetBalance}>
            <Scale className="size-4" /> Set balance
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onArchive}>
            <Archive className="size-4" /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const archiveAccount = useArchiveAccount();
  const reorderAccounts = useReorderAccounts();
  const updateTemplate = useUpdateAllocationTemplate();
  const updateCurrency = useUpdateCurrency();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  // False during SSR and hydration, true after - the theme select would
  // otherwise mismatch the server-rendered markup.
  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [balanceAccount, setBalanceAccount] = useState<Account | undefined>();
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [seededAccounts, setSeededAccounts] = useState<Account[] | undefined>();

  const activeAccounts = accounts ?? [];
  const currency = me?.currency ?? "PHP";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (accounts !== seededAccounts) {
    setSeededAccounts(accounts);
    if (accounts) {
      setPercents(Object.fromEntries(accounts.map((a) => [a.id, String(a.allocationPercent)])));
    }
  }

  const total = activeAccounts.reduce((sum, a) => sum + (Number(percents[a.id]) || 0), 0);

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
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

  function saveTemplate() {
    updateTemplate.mutate(
      activeAccounts.map((a) => ({ accountId: a.id, percent: Number(percents[a.id]) || 0 })),
      {
        onSuccess: () => toast.success("Template saved"),
        onError: handleError,
      },
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Your accounts"
        action={
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setEditingAccount(undefined);
              setDialogOpen(true);
            }}
          >
            + Add
          </Button>
        }
      >
        <div className="space-y-1">
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
          {activeAccounts.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No accounts yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Allocation template">
        <div className="space-y-3">
          {activeAccounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3">
              <Percent className="size-4 text-muted-foreground" />
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

          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  total === 100 ? "bg-primary" : "bg-destructive/70",
                )}
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span
                className={cn(
                  "money font-semibold",
                  total === 100 ? "text-primary" : "text-destructive",
                )}
              >
                {total}%
              </span>
            </div>
          </div>

          <Button
            className="h-11 w-full rounded-xl font-semibold"
            onClick={saveTemplate}
            disabled={total !== 100 || updateTemplate.isPending}
          >
            {updateTemplate.isPending ? "Saving..." : "Save template"}
          </Button>
        </div>
      </SectionCard>

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

      <a
        href="https://github.com/diazjhozua/tydee/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {`Tydee v${process.env.NEXT_PUBLIC_APP_VERSION} · What's new`}
      </a>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} account={editingAccount} />

      <SetBalanceSheet
        open={balanceAccount !== undefined}
        onOpenChange={(open) => !open && setBalanceAccount(undefined)}
        account={balanceAccount}
      />
    </div>
  );
}
