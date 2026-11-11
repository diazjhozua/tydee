import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AccountsSection } from "@/components/dashboard/AccountsSection";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";
import type { AccountBalance } from "@/lib/types/dashboard";

const accounts: AccountBalance[] = [
  {
    accountId: "budget",
    name: "Budget",
    type: "Spending",
    allocationPercent: 50,
    balance: 400,
    icon: null,
    color: null,
  },
  {
    accountId: "savings",
    name: "Savings",
    type: "Saving",
    allocationPercent: 30,
    balance: 300,
    icon: null,
    color: null,
  },
];

afterEach(() => {
  act(() => useBalanceVisibilityStore.setState({ hideBalances: false }));
});

function renderAccounts(overrides: Partial<React.ComponentProps<typeof AccountsSection>> = {}) {
  return render(
    <AccountsSection
      accounts={accounts}
      spent={100}
      currency="USD"
      view="list"
      onViewChange={() => {}}
      {...overrides}
    />,
  );
}

describe("AccountsSection", () => {
  it("renders the list with names, allocation, and balances", () => {
    const { container } = renderAccounts();

    expect(screen.getByRole("heading", { level: 2, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Spending · 50%")).toBeInTheDocument();
    expect(container.querySelector(".money")?.textContent).toBe("$400.00");
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("keeps account cards and amounts in grid view", () => {
    const { container } = renderAccounts({ view: "grid" });

    expect(container.querySelector('[data-view="grid"]')).toBeInTheDocument();
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(container.querySelector(".money")?.textContent).toBe("$400.00");
  });

  it("masks hideable balances in both views", () => {
    act(() => useBalanceVisibilityStore.setState({ hideBalances: true }));

    const { rerender } = renderAccounts();
    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);

    rerender(
      <AccountsSection
        accounts={accounts}
        spent={100}
        currency="USD"
        view="grid"
        onViewChange={() => {}}
      />,
    );
    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);
  });

  it("renders no cards when there are no accounts", () => {
    const { container } = renderAccounts({ accounts: [] });

    expect(screen.getByRole("heading", { level: 2, name: "Accounts" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(0);
  });
});
