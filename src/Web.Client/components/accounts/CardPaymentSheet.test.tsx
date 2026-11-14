import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError } from "@/lib/types/api";
import { today } from "@/lib/utils/date";

const state = vi.hoisted(() => ({
  online: true,
  accounts: [] as { id: string; name: string; type: string; balance: number }[] | undefined,
  mutate: vi.fn(),
  isPending: false,
  isPaused: false,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: state.accounts }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("@/lib/hooks/useCardPayments", () => ({
  useCreateCardPayment: () => ({
    mutate: state.mutate,
    isPending: state.isPending,
    isPaused: state.isPaused,
  }),
}));

import { CardPaymentSheet } from "@/components/accounts/CardPaymentSheet";

const card = { id: "visa", name: "Visa", owed: 250 };

const sources = [
  { id: "budget", name: "Budget", type: "Spending", balance: 400 },
  { id: "savings", name: "Savings", type: "Saving", balance: 300 },
  { id: "visa", name: "Visa", type: "CreditCard", balance: -250 },
];

function renderSheet(overrides: Partial<React.ComponentProps<typeof CardPaymentSheet>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <CardPaymentSheet open onOpenChange={onOpenChange} card={card} {...overrides} />,
  );
  return { onOpenChange };
}

function amountInput() {
  return screen.getByRole("spinbutton", { name: "Amount" });
}

function saveButton() {
  return screen.getByRole("button", { name: /Save payment|Saving\.\.\./ });
}

describe("CardPaymentSheet", () => {
  beforeEach(() => {
    state.online = true;
    state.accounts = sources;
    state.isPending = false;
    state.isPaused = false;
    state.mutate.mockReset();
    vi.mocked(toast.info).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("keeps Save disabled until an amount and a source are chosen", () => {
    renderSheet();

    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    expect(saveButton()).toBeDisabled();

    fireEvent.change(amountInput(), { target: { value: "0" } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(amountInput(), { target: { value: "100" } });
    expect(saveButton()).toBeEnabled();
  });

  it("shows an empty state when there is no account to pay from", () => {
    state.accounts = [{ id: "visa", name: "Visa", type: "CreditCard", balance: -250 }];
    renderSheet();

    expect(
      screen.getByText("Add a spending or saving account to pay from."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Visa" })).not.toBeInTheDocument();
  });

  it("fills the amount with the full owed balance from Pay full balance", () => {
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Pay full balance" }));

    expect(amountInput()).toHaveValue(250);
  });

  it("submits the card, source, amount, and date", () => {
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    fireEvent.change(amountInput(), { target: { value: "100" } });
    fireEvent.click(saveButton());

    expect(state.mutate).toHaveBeenCalledWith(
      { fromAccountId: "budget", cardAccountId: "visa", amount: 100, date: today() },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("shows the server message when the save fails", () => {
    state.mutate.mockImplementation(
      (_request: unknown, options: { onError: (err: unknown) => void }) =>
        options.onError(
          new ApiError(400, {
            title: "CardPayments.SameAccount",
            detail: "A card cannot pay itself.",
          }),
        ),
    );
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    fireEvent.change(amountInput(), { target: { value: "100" } });
    fireEvent.click(saveButton());

    expect(toast.error).toHaveBeenCalledWith("A card cannot pay itself.");
  });

  it("queues the payment and closes when offline", () => {
    state.online = false;
    const { onOpenChange } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    fireEvent.change(amountInput(), { target: { value: "100" } });
    fireEvent.click(saveButton());

    expect(state.mutate).toHaveBeenCalledWith({
      fromAccountId: "budget",
      cardAccountId: "visa",
      amount: 100,
      date: today(),
    });
    expect(toast.info).toHaveBeenCalledWith("Queued — will sync when you're back online");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps Save usable while a queued payment is paused", () => {
    state.isPending = true;
    state.isPaused = true;
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    fireEvent.change(amountInput(), { target: { value: "100" } });

    expect(screen.getByRole("button", { name: "Save payment" })).toBeEnabled();
  });

  it("names what is missing under a disabled Save", () => {
    renderSheet();

    expect(saveButton()).toHaveAccessibleDescription(
      "Enter an amount and choose an account to pay from.",
    );
    expect(screen.getByText("Enter an amount and choose an account to pay from.")).toBeVisible();

    fireEvent.change(amountInput(), { target: { value: "100" } });
    expect(screen.getByText("Choose an account to pay from.")).toBeInTheDocument();
    expect(screen.queryByText(/Enter an amount/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    expect(screen.queryByText(/Choose an account|Enter an amount/)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("asks only for the amount when a source is already chosen", () => {
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));

    expect(screen.getByText("Enter an amount to pay.")).toBeInTheDocument();
  });

  it("shows Saving and disables Save while a live payment is in flight", () => {
    state.isPending = true;
    state.isPaused = false;
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    fireEvent.change(amountInput(), { target: { value: "100" } });

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
