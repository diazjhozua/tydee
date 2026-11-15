import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransferSheet } from "@/components/transfers/TransferSheet";

const state = vi.hoisted(() => ({
  mutate: vi.fn(),
}));

vi.mock("@/lib/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [
      { id: "budget", name: "Budget", type: "Spending", balance: 400 },
      { id: "savings", name: "Savings", type: "Saving", balance: 300 },
      { id: "visa", name: "Visa", type: "CreditCard", balance: -250 },
    ],
  }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("@/lib/hooks/useTransfers", () => ({
  useCreateTransfer: () => ({ mutate: state.mutate, isPending: false }),
}));

describe("TransferSheet accessibility", () => {
  beforeEach(() => {
    state.mutate.mockReset();
  });

  it("groups the From and To chips under their labels", () => {
    render(<TransferSheet open onOpenChange={vi.fn()} />);

    const from = screen.getByRole("group", { name: "From" });
    const to = screen.getByRole("group", { name: "To" });

    expect(within(from).getByRole("button", { name: "Budget" })).toBeInTheDocument();
    expect(within(to).getByRole("button", { name: "Savings" })).toBeInTheDocument();
  });

  it("marks the selected chip in each group as pressed", () => {
    render(<TransferSheet open onOpenChange={vi.fn()} />);

    const from = screen.getByRole("group", { name: "From" });
    const to = screen.getByRole("group", { name: "To" });

    fireEvent.click(within(from).getByRole("button", { name: "Budget" }));
    fireEvent.click(within(to).getByRole("button", { name: "Savings" }));

    expect(within(from).getByRole("button", { name: "Budget" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(from).getByRole("button", { name: "Savings" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(to).getByRole("button", { name: "Savings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("never offers a credit card as a chip", () => {
    render(<TransferSheet open onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Visa" })).not.toBeInTheDocument();
  });
});
