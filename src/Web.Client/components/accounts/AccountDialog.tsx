"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ACCOUNT_COLOR_OPTIONS, ACCOUNT_ICON_OPTIONS } from "@/components/shared/AccountIcon";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAccount, useUpdateAccount } from "@/lib/hooks/useAccounts";
import { Account, AccountType } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
};

export function AccountDialog({ open, onOpenChange, account }: Props) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Spending");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  const isEdit = account !== undefined;

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "Spending");
      setIcon(account?.icon ?? null);
      setColor(account?.color ?? null);
    }
  }

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    if (isEdit) {
      updateAccount.mutate(
        { accountId: account.id, request: { name: name.trim(), type, icon, color } },
        {
          onSuccess: () => {
            toast.success("Account updated");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      createAccount.mutate(
        { name: name.trim(), type, allocationPercent: 0, icon, color },
        {
          onSuccess: () => {
            toast.success("Account created. Don't forget to update your allocation split.");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    }
  }

  const pending = createAccount.isPending || updateAccount.isPending;

  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit account" : "Add account"}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            placeholder="e.g. Emergency Fund"
            className="h-11 rounded-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v as AccountType)}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Spending">Spending (day-to-day budget)</SelectItem>
              <SelectItem value="Saving">Saving (money you keep)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Icon (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_ICON_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = icon === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setIcon(selected ? null : option.key)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_COLOR_OPTIONS.map((option) => {
              const selected = color === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setColor(selected ? null : option.key)}
                  className={cn(
                    "size-8 rounded-full transition-shadow",
                    option.swatchClass,
                    selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  aria-label={option.key}
                />
              );
            })}
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={save}
          disabled={name.trim() === "" || pending}
        >
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </EntrySheet>
  );
}
