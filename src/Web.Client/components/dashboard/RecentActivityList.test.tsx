import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { activityAmount, RecentActivityList } from "@/components/dashboard/RecentActivityList";
import type { ActivityItem } from "@/lib/types/dashboard";

const expense: ActivityItem = {
  id: "e1",
  kind: "expense",
  amount: 120,
  description: "Groceries",
  category: "Food",
  date: "2026-11-10",
  allocations: [],
};

const income: ActivityItem = {
  id: "i1",
  kind: "income",
  amount: 2000,
  description: "Salary",
  category: null,
  date: "2026-11-10",
  allocations: [{ accountName: "Budget", amount: 1200 }],
};

const queued: ActivityItem = { ...expense, id: "e2", description: "Coffee", pendingSync: true };

describe("activityAmount", () => {
  it("shows a minus for expenses and a plus for income", () => {
    expect(activityAmount(expense, "PHP").text).toMatch(/^−/);
    expect(activityAmount(income, "PHP").text).toMatch(/^\+/);
  });

  it("shows no sign for transfers", () => {
    const transfer: ActivityItem = { ...income, kind: "transfer", amount: 300 };
    expect(activityAmount(transfer, "PHP").text.startsWith("+")).toBe(false);
    expect(activityAmount(transfer, "PHP").text.startsWith("−")).toBe(false);
  });
});

describe("RecentActivityList", () => {
  it("renders each item in list view with its allocation lines", () => {
    render(
      <RecentActivityList
        items={[income, expense]}
        currency="PHP"
        view="list"
        onItemClick={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /Salary/ })).toBeInTheDocument();
    expect(screen.getByText("Budget", { exact: false })).toBeInTheDocument();
  });

  it("renders the same items as tiles in grid view without allocation lines", () => {
    const { container } = render(
      <RecentActivityList
        items={[income, expense]}
        currency="PHP"
        view="grid"
        onItemClick={() => {}}
      />,
    );

    const tiles = within(container.querySelector("ul") as HTMLElement).getAllByRole("button");
    expect(tiles).toHaveLength(2);
    expect(screen.queryByText("Budget", { exact: false })).not.toBeInTheDocument();
  });

  it("calls onItemClick with the tapped item", () => {
    const onItemClick = vi.fn();
    render(
      <RecentActivityList
        items={[expense]}
        currency="PHP"
        view="grid"
        onItemClick={onItemClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Groceries/ }));
    expect(onItemClick).toHaveBeenCalledWith(expense);
  });

  it("disables a queued item and shows it as syncing", () => {
    render(
      <RecentActivityList items={[queued]} currency="PHP" view="grid" onItemClick={() => {}} />,
    );

    expect(screen.getByRole("button", { name: /Coffee/ })).toBeDisabled();
    expect(screen.getByText("Syncing…")).toBeInTheDocument();
  });
});
