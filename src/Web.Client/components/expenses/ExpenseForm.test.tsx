import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/useExpenses", () => ({
  useCreateExpense: () => ({ mutate: mocks.createMutate, isPending: false }),
  useUpdateExpense: () => ({ mutate: mocks.updateMutate, isPending: false }),
  useDeleteExpense: () => ({ mutate: mocks.deleteMutate, isPending: false }),
  useExpenseCategories: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [{ id: "budget", name: "Budget", balance: 500 }] }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useRecurringExpenses", () => ({
  useRecurringExpenses: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { ExpenseForm } from "@/components/expenses/ExpenseForm";

const expense = {
  id: "expense-1",
  accountId: "budget",
  accountName: "Budget",
  amount: 120,
  note: "lunch",
  category: "Food",
  date: "2026-11-11",
  recurringExpenseId: null,
};

describe("ExpenseForm", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.createMutate.mockReset();
    mocks.updateMutate.mockReset();
    mocks.deleteMutate.mockReset();
  });

  it("disables save until an amount is entered", () => {
    render(<ExpenseForm />);

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "120" } });

    expect(save).toBeEnabled();
  });

  it("creates an expense and clears the form for the next entry", () => {
    mocks.createMutate.mockImplementation((_request, options) => options?.onSuccess?.());

    render(<ExpenseForm resetAfterSave submitLabel="Log expense" />);

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "lunch" } });
    fireEvent.click(screen.getByRole("button", { name: "Log expense" }));

    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "budget", amount: 120, note: "lunch" }),
      expect.any(Object),
    );
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Note (optional)") as HTMLInputElement).value).toBe("");
  });

  it("prefills and updates an existing expense", () => {
    mocks.updateMutate.mockImplementation((_vars, options) => options?.onSuccess?.());

    render(<ExpenseForm expense={expense} />);

    expect(screen.getByLabelText("Amount")).toHaveValue(120);
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("lunch");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        expenseId: "expense-1",
        request: expect.objectContaining({ accountId: "budget", amount: 120, note: "lunch" }),
      },
      expect.any(Object),
    );
  });

  it("keeps an archived envelope when editing its expense", () => {
    mocks.updateMutate.mockImplementation((_vars, options) => options?.onSuccess?.());

    render(<ExpenseForm expense={{ ...expense, accountId: "fun", accountName: "Fun" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        expenseId: "expense-1",
        request: expect.objectContaining({ accountId: "fun" }),
      },
      expect.any(Object),
    );
  });

  it("deletes an existing expense", () => {
    render(<ExpenseForm expense={expense} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.deleteMutate).toHaveBeenCalledWith(
      { expenseId: "expense-1", date: "2026-11-11" },
      expect.any(Object),
    );
  });
});
