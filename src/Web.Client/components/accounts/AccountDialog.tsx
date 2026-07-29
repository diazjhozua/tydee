"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const isEdit = account !== undefined;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(account?.name ?? "");
    setType(account?.type ?? "Spending");
  }, [open, account]);

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    if (isEdit) {
      updateAccount.mutate(
        { accountId: account.id, request: { name: name.trim(), type } },
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
        { name: name.trim(), type, allocationPercent: 0 },
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "Add account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              placeholder="e.g. Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spending">Spending (day-to-day budget)</SelectItem>
                <SelectItem value="Saving">Saving (money you keep)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={save}
            disabled={name.trim() === "" || pending}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
