import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Money } from "@/components/shared/Money";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";

afterEach(() => {
  act(() => useBalanceVisibilityStore.setState({ hideBalances: false }));
});

describe("Money", () => {
  it("renders the formatted amount", () => {
    const { container } = render(<Money value={1234.5} currency="USD" />);
    const money = container.querySelector(".money");

    expect(money).toBeInTheDocument();
    expect(money?.textContent).toBe("$1,234.50");
  });

  it("masks a hideable amount when balances are hidden", () => {
    act(() => useBalanceVisibilityStore.setState({ hideBalances: true }));

    const { container } = render(<Money value={1234.5} currency="USD" hideable />);

    expect(container.textContent).toBe("$••••");
  });

  it("does not mask an amount that is not hideable", () => {
    act(() => useBalanceVisibilityStore.setState({ hideBalances: true }));

    const { container } = render(<Money value={99} currency="USD" />);

    expect(container.textContent).toBe("$99.00");
  });
});
