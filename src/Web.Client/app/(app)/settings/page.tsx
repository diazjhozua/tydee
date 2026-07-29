"use client";

import { Archive, MoreVertical, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/accounts/AccountDialog";
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
import { useAccounts, useArchiveAccount, useUpdateAllocationTemplate } from "@/lib/hooks/useAccounts";
import { useLogout } from "@/lib/hooks/useAuth";
import { useMe, useUpdateCurrency } from "@/lib/hooks/useMe";
import { Account } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { SUPPORTED_CURRENCIES, formatMoney } from "@/lib/utils/currency";

export default function SettingsPage() {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const archiveAccount = useArchiveAccount();
  const updateTemplate = useUpdateAllocationTemplate();
  const updateCurrency = useUpdateCurrency();
  const logout = useLogout();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [percents, setPercents] = useState<Record<string, string>>({});

  const activeAccounts = accounts ?? [];
  const currency = me?.currency ?? "PHP";

  useEffect(() => {
    if (accounts) {
      setPercents(Object.fromEntries(accounts.map((a) => [a.id, String(a.allocationPercent)])));
    }
  }, [accounts]);

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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Your accounts</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingAccount(undefined);
              setDialogOpen(true);
            }}
          >
            + Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {activeAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account.type} · {formatMoney(account.balance, currency)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" aria-label="Account actions" />}
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingAccount(account);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => archive(account)}>
                    <Archive className="size-4" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {activeAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No accounts yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocation template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeAccounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm truncate">{account.name}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  className="w-20 text-right"
                  value={percents[account.id] ?? ""}
                  onChange={(e) =>
                    setPercents((prev) => ({ ...prev, [account.id]: e.target.value }))
                  }
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className={total === 100 ? "text-primary font-medium" : "text-destructive font-medium"}>
              {total}%
            </span>
          </div>

          <Button
            className="w-full"
            onClick={saveTemplate}
            disabled={total !== 100 || updateTemplate.isPending}
          >
            {updateTemplate.isPending ? "Saving..." : "Save template"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Currency</span>
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
              <SelectTrigger className="w-28">
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

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{me ? `${me.firstName} ${me.lastName}` : ""}</p>
              <p className="text-xs text-muted-foreground">{me?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} account={editingAccount} />
    </div>
  );
}
