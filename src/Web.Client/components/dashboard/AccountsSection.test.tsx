import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      onLogPayment={() => {}}
      onOpenStatement={() => {}}
      {...overrides}
    />,
  );
}

const card: AccountBalance = {
  accountId: "visa",
  name: "Visa",
  type: "CreditCard",
  allocationPercent: 0,
  balance: -250,
  icon: null,
  color: null,
};

const settledCard: AccountBalance = { ...card, accountId: "paid", name: "Paid Card", balance: 0 };
const creditCard: AccountBalance = {
  ...card,
  accountId: "credit",
  name: "Credit Card Two",
  balance: 40,
};

describe("AccountsSection", () => {
  it("renders the list with names, allocation, and balances", () => {
    const { container } = renderAccounts();

    expect(screen.getByRole("heading", { level: 2, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Spending")).toBeInTheDocument();
    expect(screen.getByText("50% of income")).toBeInTheDocument();
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
        onLogPayment={() => {}}
        onOpenStatement={() => {}}
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

describe("AccountsSection credit card rows", () => {
  it("shows the owed amount, the type label, and a Log payment action in list view", () => {
    const onLogPayment = vi.fn();
    const { container } = renderAccounts({ accounts: [card], onLogPayment });

    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("owed")).toBeInTheDocument();
    expect(container.querySelector(".money")?.textContent).toBe("$250.00");
    expect(screen.queryByText("% of income", { exact: false })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log payment" }));
    expect(onLogPayment).toHaveBeenCalledWith(card);
  });

  it("shows Paid for a zero balance and In credit for a positive one", () => {
    const { container } = renderAccounts({ accounts: [settledCard, creditCard] });

    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("In credit")).toBeInTheDocument();
    const amounts = Array.from(container.querySelectorAll(".money")).map((el) => el.textContent);
    expect(amounts).toEqual(["$40.00"]);
  });

  it("draws no 'left' text or progress bar for a card", () => {
    const { container } = renderAccounts({ accounts: [card] });

    expect(screen.queryByText("left")).not.toBeInTheDocument();
    expect(container.querySelector(".h-1")).not.toBeInTheDocument();
  });

  it("keeps the same card content and actions in grid view", () => {
    const onLogPayment = vi.fn();
    const onOpenStatement = vi.fn();
    const { container } = renderAccounts({
      accounts: [card],
      view: "grid",
      onLogPayment,
      onOpenStatement,
    });

    expect(container.querySelector('[data-view="grid"]')).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("owed")).toBeInTheDocument();
    expect(screen.queryByText("left")).not.toBeInTheDocument();
    expect(container.querySelector(".h-1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log payment" }));
    expect(onLogPayment).toHaveBeenCalledWith(card);

    fireEvent.click(screen.getByRole("button", { name: /Visa/ }));
    expect(onOpenStatement).toHaveBeenCalledWith(card);
  });
});
