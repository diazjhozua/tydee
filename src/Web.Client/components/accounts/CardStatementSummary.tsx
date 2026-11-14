"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cardOwedStatus } from "@/lib/accounts/accountTypeBehavior";
import { useDeleteCardPayment } from "@/lib/hooks/useCardPayments";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { ApiError } from "@/lib/types/api";
import { CardStatement, CardStatementPayment, PaymentState } from "@/lib/types/cardPayment";
import { formatDate } from "@/lib/utils/date";

const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  Settled: "Settled",
  InCredit: "In credit",
  PartiallyPaid: "Partly paid",
  Unpaid: "Unpaid",
};

type Props = {
  statement: CardStatement;
  currency: string;
};

export function CardStatementSummary({ statement, currency }: Props) {
  const deletePayment = useDeleteCardPayment();
  const isOnline = useOnlineStatus();
  const [deleting, setDeleting] = useState<CardStatementPayment | undefined>();

  const standing = cardOwedStatus(statement.owed);

  function confirmDelete() {
    if (!deleting) {
      return;
    }
    deletePayment.mutate(
      { paymentId: deleting.id, cardAccountId: statement.accountId },
      {
        onSuccess: () => {
          toast.success("Payment removed");
          setDeleting(undefined);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
          setDeleting(undefined);
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            {standing === "inCredit" ? "In credit" : "Owed"}
          </p>
          {standing === "paid" ? (
            <p className="mt-1 text-sm font-semibold text-primary">Nothing owed</p>
          ) : (
            <Money
              value={Math.abs(statement.owed)}
              currency={currency}
              size="md"
              hideable
              className="mt-1"
            />
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Paid this month</p>
          <Money
            value={statement.paidThisMonth}
            currency={currency}
            size="md"
            hideable
            className="mt-1"
          />
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {PAYMENT_STATE_LABEL[statement.paymentState]}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Payments</p>
        {statement.payments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            No payments this month.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            {statement.payments.map((payment, index) => (
              <li
                key={payment.id}
                className={
                  index > 0
                    ? "flex items-center gap-3 border-t border-border/50 px-4 py-3"
                    : "flex items-center gap-3 px-4 py-3"
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{payment.fromAccountName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                </div>
                <Money value={payment.amount} currency={currency} size="sm" hideable />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={`Delete payment from ${payment.fromAccountName}`}
                  disabled={!isOnline}
                  onClick={() => setDeleting(payment)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove this payment?</DialogTitle>
            <DialogDescription>
              {deleting &&
                `${deleting.fromAccountName} → ${statement.name} will be undone and the card balance will go back up.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePayment.isPending || !isOnline}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
