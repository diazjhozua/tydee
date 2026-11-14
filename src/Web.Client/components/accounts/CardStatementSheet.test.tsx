import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardStatementSheet } from "@/components/accounts/CardStatementSheet";

const state = vi.hoisted(() => ({
  online: true,
  statement: { isPending: true, isError: false, data: undefined } as {
    isPending: boolean;
    isError: boolean;
    data: unknown;
  },
  calls: [] as unknown[][],
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { currency: "PHP" } }),
}));

vi.mock("@/lib/hooks/useCardPayments", () => ({
  useCardStatement: (...args: unknown[]) => {
    state.calls.push(args);
    return state.statement;
  },
}));

const card = { id: "visa", name: "Visa" };

function renderSheet(open = true) {
  return render(<CardStatementSheet open={open} onOpenChange={vi.fn()} card={card} />);
}

describe("CardStatementSheet", () => {
  beforeEach(() => {
    state.online = true;
    state.statement = { isPending: true, isError: false, data: undefined };
    state.calls = [];
  });

  it("says the statement needs a connection when offline and not yet loaded", () => {
    state.online = false;
    renderSheet();

    expect(screen.getByText("Statement needs a connection")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
  });

  it("keeps the skeleton while online and loading", () => {
    renderSheet();

    expect(screen.queryByText("Statement needs a connection")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("reports a failed load", () => {
    state.statement = { isPending: false, isError: true, data: undefined };
    renderSheet();

    expect(screen.getByText("Couldn't load this statement.")).toBeInTheDocument();
  });
});

describe("CardStatementSheet period", () => {
  beforeEach(() => {
    state.online = true;
    state.statement = { isPending: true, isError: false, data: undefined };
    state.calls = [];
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the current month each time the sheet opens", () => {
    vi.setSystemTime(new Date(2026, 10, 14));
    const { rerender } = renderSheet(true);
    expect(state.calls.at(-1)).toEqual(["visa", 2026, 11, true]);

    rerender(<CardStatementSheet open={false} onOpenChange={vi.fn()} card={card} />);

    vi.setSystemTime(new Date(2026, 11, 2));
    rerender(<CardStatementSheet open onOpenChange={vi.fn()} card={card} />);

    expect(state.calls.at(-1)).toEqual(["visa", 2026, 12, true]);
    expect(screen.getByText("December 2026 statement")).toBeInTheDocument();
  });
});
