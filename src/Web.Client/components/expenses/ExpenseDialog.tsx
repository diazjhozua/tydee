"use client";

import { EntrySheet } from "@/components/shared/EntrySheet";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Expense } from "@/lib/types/expense";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
};

export function ExpenseDialog({ open, onOpenChange, expense }: Props) {
  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Edit expense" : "Add expense"}
    >
      <ExpenseForm
        expense={expense}
        onSaved={() => onOpenChange(false)}
        onRequestClose={() => onOpenChange(false)}
      />
    </EntrySheet>
  );
}
