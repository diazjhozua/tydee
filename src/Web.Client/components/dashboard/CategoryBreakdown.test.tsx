import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import type { CategorySpend } from "@/lib/types/dashboard";

const rows: CategorySpend[] = [
  { category: "Food", amount: 75 },
  { category: null, amount: 25 },
];

function renderBreakdown(overrides: Partial<React.ComponentProps<typeof CategoryBreakdown>> = {}) {
  return render(
    <CategoryBreakdown
      rows={rows}
      totalSpent={100}
      currency="USD"
      view="list"
      onViewChange={() => {}}
      categoryFilter={undefined}
      onCategoryClick={() => {}}
      {...overrides}
    />,
  );
}

describe("CategoryBreakdown", () => {
  it("renders the list with category names, percentages, and amounts", () => {
    const { container } = renderBreakdown();

    expect(screen.getByRole("heading", { level: 2, name: "Where it went" })).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(container.querySelector(".money")?.textContent).toBe("$75.00");
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("reports the clicked category, including the Uncategorized bucket", async () => {
    const onCategoryClick = vi.fn();
    const user = userEvent.setup();

    renderBreakdown({ onCategoryClick });
    await user.click(screen.getByRole("button", { name: /Food/ }));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");

    await user.click(screen.getByRole("button", { name: /Uncategorized/ }));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });

  it("marks the filtered category as pressed", () => {
    renderBreakdown({ categoryFilter: "Food" });

    expect(screen.getByRole("button", { name: /Food/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Uncategorized/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders a filterable grid with the same content", async () => {
    const onCategoryClick = vi.fn();
    const user = userEvent.setup();
    const { container } = renderBreakdown({ view: "grid", onCategoryClick });

    expect(container.querySelector('[data-view="grid"]')).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(container.querySelector(".money")?.textContent).toBe("$75.00");

    await user.click(screen.getByRole("button", { name: /Food/ }));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");
  });

  it("renders no rows for an empty breakdown", () => {
    const { container } = renderBreakdown({ rows: [], totalSpent: 0 });

    expect(screen.getByRole("heading", { level: 2, name: "Where it went" })).toBeInTheDocument();
    expect(container.querySelector('[data-view="list"]')?.querySelectorAll("button")).toHaveLength(
      0,
    );
  });
});
