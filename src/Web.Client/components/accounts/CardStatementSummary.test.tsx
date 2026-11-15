import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardStatementSummary } from "@/components/accounts/CardStatementSummary";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";
import type { CardStatement, PaymentState } from "@/lib/types/cardPayment";

const state = vi.hoisted(() => ({
  online: true,
  mutate: vi.fn(),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("@/lib/hooks/useCardPayments", () => ({
  useDeleteCardPayment: () => ({ mutate: state.mutate, isPending: false }),
}));

const statement: CardStatement = {
  accountId: "visa",
  name: "Visa",
  owed: 250,
  paidThisMonth: 100,
  paymentState: "PartiallyPaid",
  payments: [
    {
      id: "p1",
      fromAccountId: "budget",
      fromAccountName: "Budget",
      amount: 100,
      date: "2026-11-10",
    },
  ],
};

function renderSummary(overrides: Partial<CardStatement> = {}) {
  return render(
    <CardStatementSummary statement={{ ...statement, ...overrides }} currency="PHP" />,
  );
}

describe("CardStatementSummary", () => {
  beforeEach(() => {
    state.online = true;
    state.mutate.mockReset();
    act(() => useBalanceVisibilityStore.setState({ hideBalances: false }));
  });

  it("masks the owed, paid-this-month, and payment amounts when balances are hidden", () => {
    act(() => useBalanceVisibilityStore.setState({ hideBalances: true }));
    renderSummary();

    expect(screen.getAllByText("••••")).toHaveLength(3);
    expect(screen.queryByText("₱250.00")).not.toBeInTheDocument();
    expect(screen.queryByText("₱100.00")).not.toBeInTheDocument();
  });

  it("shows the owed and paid-this-month amounts", () => {
    const { container } = renderSummary();

    expect(screen.getByText("Owed")).toBeInTheDocument();
    expect(screen.getByText("Paid this month")).toBeInTheDocument();
    const amounts = Array.from(container.querySelectorAll(".money")).map((el) => el.textContent);
    expect(amounts[0]).toBe("₱250.00");
    expect(amounts[1]).toBe("₱100.00");
  });

  it.each<[PaymentState, string]>([
    ["Settled", "Settled"],
    ["InCredit", "In credit"],
    ["PartiallyPaid", "Partly paid"],
    ["Unpaid", "Unpaid"],
  ])("labels a %s statement as %s", (paymentState, label) => {
    renderSummary({ paymentState });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("says nothing is owed when the balance is zero", () => {
    renderSummary({ owed: 0, paidThisMonth: 0, payments: [], paymentState: "Settled" });

    expect(screen.getByText("Nothing owed")).toBeInTheDocument();
  });

  it("shows an empty payments list", () => {
    renderSummary({ payments: [], paidThisMonth: 0, paymentState: "Unpaid" });

    expect(screen.getByText("No payments this month.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("removes a payment only after confirming in a dialog", () => {
    renderSummary();

    fireEvent.click(screen.getByRole("button", { name: "Delete payment from Budget" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove this payment?")).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(state.mutate).toHaveBeenCalledWith(
      { paymentId: "p1", cardAccountId: "visa" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("disables delete while offline", () => {
    state.online = false;
    renderSummary();

    expect(screen.getByRole("button", { name: "Delete payment from Budget" })).toBeDisabled();
  });
});
