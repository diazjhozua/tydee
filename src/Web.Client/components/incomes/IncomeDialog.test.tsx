import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncomeDialog } from "@/components/incomes/IncomeDialog";

vi.mock("@/lib/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [
      {
        id: "budget",
        name: "Budget",
        type: "Spending",
        allocationPercent: 60,
        balance: 0,
      },
      {
        id: "visa",
        name: "Visa",
        type: "CreditCard",
        allocationPercent: 0,
        balance: 0,
      },
      {
        id: "savings",
        name: "Savings",
        type: "Saving",
        allocationPercent: 40,
        balance: 0,
      },
    ],
  }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("@/lib/hooks/useIncomes", () => ({
  useIncome: () => ({ data: undefined }),
  useIncomeSources: () => ({ data: [] }),
  useLatestIncome: () => ({ data: undefined }),
  useCreateIncome: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateIncome: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteIncome: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("IncomeDialog allocation inputs", () => {
  it("names each allocation amount after its account", () => {
    render(<IncomeDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("spinbutton", { name: "Budget allocation amount" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Savings allocation amount" }),
    ).toBeInTheDocument();
  });

  it("does not offer an input for a credit card", () => {
    render(<IncomeDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.queryByRole("spinbutton", { name: "Visa allocation amount" }),
    ).not.toBeInTheDocument();
  });
});
