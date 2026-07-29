"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, listAccounts, updateAllocationTemplate } from "@/lib/api/accounts";
import { useQueryClient } from "@tanstack/react-query";
import { Account, AccountType } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type Draft = { name: string; type: AccountType };

const SUGGESTED: Draft[] = [
  { name: "Budget", type: "Spending" },
  { name: "Savings", type: "Saving" },
  { name: "Emergency Fund", type: "Saving" },
];

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className={cn("h-1.5 flex-1 rounded-full", "bg-primary")} />
      <span
        className={cn("h-1.5 flex-1 rounded-full", step === 2 ? "bg-primary" : "bg-muted")}
      />
      <span className="ml-2 text-xs font-medium text-muted-foreground">Step {step} of 2</span>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<Draft[]>(SUGGESTED);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function setDraft(index: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function createAll() {
    const valid = drafts.filter((d) => d.name.trim() !== "");
    if (valid.length === 0) {
      return;
    }

    setPending(true);
    try {
      for (const draft of valid) {
        await createAccount({ name: draft.name.trim(), type: draft.type, allocationPercent: 0 });
      }

      const created = await listAccounts();
      setAccounts(created);
      setPercents(
        Object.fromEntries(created.map((a, i) => [a.id, suggestedPercent(created.length, i)])),
      );
      setStep(2);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const total = accounts.reduce((sum, a) => sum + (Number(percents[a.id]) || 0), 0);

  async function saveTemplate() {
    setPending(true);
    try {
      await updateAllocationTemplate(
        accounts.map((a) => ({ accountId: a.id, percent: Number(percents[a.id]) || 0 })),
      );
      await queryClient.invalidateQueries();
      toast.success("You're all set!");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (step === 1) {
    return (
      <div>
        <StepIndicator step={1} />
        <Card className="rounded-3xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Set up your accounts</CardTitle>
            <CardDescription>
              Accounts are envelopes for your money. We suggest three to start — rename or
              remove them as you like.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((draft, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className="flex gap-2">
                <Input
                  value={draft.name}
                  placeholder="Account name"
                  className="h-11 rounded-xl"
                  onChange={(e) => setDraft(index, { name: e.target.value })}
                />
                <Select
                  value={draft.type}
                  onValueChange={(v) => v && setDraft(index, { type: v as AccountType })}
                >
                  <SelectTrigger className="h-11 w-32 shrink-0 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spending">Spending</SelectItem>
                    <SelectItem value="Saving">Saving</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 rounded-xl"
                  aria-label="Remove"
                  onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={() => setDrafts((prev) => [...prev, { name: "", type: "Spending" }])}
            >
              + Add another
            </Button>

            <Button
              className="h-12 w-full rounded-xl text-base font-semibold"
              onClick={createAll}
              disabled={pending || drafts.every((d) => d.name.trim() === "")}
            >
              {pending ? "Creating..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator step={2} />
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Split your income</CardTitle>
          <CardDescription>
            When you log income, it gets divided across your accounts by these percentages.
            They must total 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3">
              <AccountIcon type={account.type} />
              <span className="flex-1 truncate text-sm font-medium">{account.name}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  className="money h-11 w-20 rounded-xl text-right"
                  value={percents[account.id] ?? ""}
                  onChange={(e) =>
                    setPercents((prev) => ({ ...prev, [account.id]: e.target.value }))
                  }
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}

          <div className="space-y-1.5 pt-1">
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
            className="h-12 w-full rounded-xl text-base font-semibold"
            onClick={saveTemplate}
            disabled={total !== 100 || pending}
          >
            {pending ? "Saving..." : "Finish setup"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function suggestedPercent(count: number, index: number): string {
  if (count === 1) {
    return "100";
  }
  if (count === 2) {
    return index === 0 ? "70" : "30";
  }
  if (count === 3) {
    return ["50", "30", "20"][index];
  }
  return "";
}
