import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetBalanceSheet } from "@/components/accounts/SetBalanceSheet";
import type { Account } from "@/lib/types/account";

vi.mock("@/lib/hooks/useAccounts", () => ({
  useSetAccountBalance: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

const spending = {
  id: "budget",
  name: "Budget",
  type: "Spending",
  balance: 400,
  allocationPercent: 50,
  icon: null,
  color: null,
} as unknown as Account;

const visa = {
  id: "visa",
  name: "Visa",
  type: "CreditCard",
  balance: -250,
  allocationPercent: 0,
  icon: null,
  color: null,
} as unknown as Account;

describe("SetBalanceSheet", () => {
  it("opens for a spending account", () => {
    render(<SetBalanceSheet open onOpenChange={vi.fn()} account={spending} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Set Budget balance")).toBeInTheDocument();
  });

  it("renders nothing for a credit card even when opened", () => {
    render(<SetBalanceSheet open onOpenChange={vi.fn()} account={visa} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Set Visa balance")).not.toBeInTheDocument();
  });
});
