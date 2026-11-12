import { DndContext } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
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

function renderRow(variant: "row" | "card", archiveDisabled = false) {
  return render(
    <DndContext>
      <SortableContext items={[account.id]} strategy={rectSortingStrategy}>
        <SortableAccountRow
          account={account}
          currency="PHP"
          variant={variant}
          archiveDisabled={archiveDisabled}
          onEdit={vi.fn()}
          onSetBalance={vi.fn()}
          onArchive={vi.fn()}
        />
      </SortableContext>
    </DndContext>,
  );
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
});
