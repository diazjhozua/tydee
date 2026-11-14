import { DndContext } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableAccountRow } from "@/components/accounts/SortableAccountRow";
import type { Account } from "@/lib/types/account";

const account = {
  id: "a1",
  name: "Budget",
  type: "Spending",
  balance: 5400,
  icon: null,
  color: null,
  allocationPercent: 50,
} as unknown as Account;

const visa = {
  id: "visa",
  name: "Visa",
  type: "CreditCard",
  balance: -250,
  icon: null,
  color: null,
  allocationPercent: 0,
} as unknown as Account;

function renderRowFor(
  row: Account,
  variant: "row" | "card",
  archiveDisabled = false,
  handlers: { onSetBalance?: () => void } = {},
) {
  return render(
    <DndContext>
      <SortableContext items={[row.id]} strategy={rectSortingStrategy}>
        <SortableAccountRow
          account={row}
          currency="PHP"
          variant={variant}
          archiveDisabled={archiveDisabled}
          onEdit={vi.fn()}
          onSetBalance={handlers.onSetBalance ?? vi.fn()}
          onArchive={vi.fn()}
        />
      </SortableContext>
    </DndContext>,
  );
}

function renderRow(variant: "row" | "card", archiveDisabled = false) {
  return renderRowFor(account, variant, archiveDisabled);
}

function openActions() {
  fireEvent.click(screen.getByRole("button", { name: "Account actions" }));
}

describe("SortableAccountRow", () => {
  it("renders the card variant with the drag handle and actions trigger", () => {
    renderRow("card");

    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Spending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account actions" })).toBeInTheDocument();
  });

  it("renders the row variant with the same controls", () => {
    renderRow("row");

    expect(screen.getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account actions" })).toBeInTheDocument();
  });

  it("keeps the handle draggable through its attributes", () => {
    renderRow("card");

    const handle = screen.getByRole("button", { name: "Drag to reorder" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
  });

  it("offers Set balance for a spending account", () => {
    const onSetBalance = vi.fn();
    renderRowFor(account, "row", false, { onSetBalance });

    openActions();
    fireEvent.click(screen.getByRole("menuitem", { name: /Set balance/ }));

    expect(onSetBalance).toHaveBeenCalledTimes(1);
  });

  it("has no Set balance item for a credit card row", () => {
    renderRowFor(visa, "row");

    openActions();

    expect(screen.getByRole("menuitem", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Set balance/ })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Archive/ })).toBeInTheDocument();
  });

  it("has no Set balance item for a credit card in the grid variant", () => {
    renderRowFor(visa, "card");

    openActions();

    expect(within(screen.getByRole("menu")).queryByText("Set balance")).not.toBeInTheDocument();
  });

  it.each<[string, "row" | "card", number, string, string]>([
    ["list", "row", -250, "owed", "₱250.00"],
    ["list", "row", 0, "Paid", ""],
    ["list", "row", 40, "In credit", "₱40.00"],
    ["grid", "card", -250, "owed", "₱250.00"],
    ["grid", "card", 0, "Paid", ""],
    ["grid", "card", 40, "In credit", "₱40.00"],
  ])("shows the owed state on a %s card row (%s)", (_view, variant, balance, status, amount) => {
    const { container } = renderRowFor({ ...visa, balance }, variant);

    expect(screen.getByText(status)).toBeInTheDocument();
    if (amount !== "") {
      expect(container.querySelector(".money")?.textContent).toBe(amount);
    }
  });

  it("shows a spending balance as stored, without an owed label", () => {
    const { container } = renderRowFor(account, "row");

    expect(container.querySelector(".money")?.textContent).toBe("₱5,400.00");
    expect(screen.queryByText("owed")).not.toBeInTheDocument();
  });
});
