import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import type { Account } from "@/lib/types/account";

vi.mock("@/lib/hooks/useAccounts", () => ({
  useCreateAccount: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAccount: () => ({ mutate: vi.fn(), isPending: false }),
}));

const funded = {
  id: "budget",
  name: "Budget",
  type: "Spending",
  balance: 400,
  allocationPercent: 50,
  icon: null,
  color: null,
} as unknown as Account;

const unfunded = { ...funded, id: "vault", name: "Vault", allocationPercent: 0 } as Account;

function renderDialog(account?: Account) {
  return render(<AccountDialog open onOpenChange={vi.fn()} account={account} />);
}

// Opens the Type picker and returns its options as rendered in the popup.
function openTypePicker() {
  fireEvent.click(screen.getByLabelText("Type"));
  return screen.getByRole("listbox");
}

describe("AccountDialog accessibility", () => {
  it("names each icon option and reports which one is pressed", () => {
    renderDialog();

    const wallet = screen.getByRole("button", { name: "wallet" });
    expect(wallet).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(wallet);

    expect(screen.getByRole("button", { name: "wallet" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the pressed color swatch", () => {
    renderDialog();

    const sky = screen.getByRole("button", { name: "sky" });
    expect(sky).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(sky);

    expect(screen.getByRole("button", { name: "sky" })).toHaveAttribute("aria-pressed", "true");
  });

  it("associates the Type label with the picker", () => {
    renderDialog();

    const picker = screen.getByLabelText("Type");
    expect(picker).toHaveAttribute("id", "account-type");
  });
});

describe("AccountDialog credit card lock", () => {
  it("disables Credit Card and explains why for an envelope that is still funded", () => {
    renderDialog(funded);

    const options = openTypePicker();
    expect(within(options).getByRole("option", { name: /Credit Card/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(options).getByRole("option", { name: /Spending/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByText(/set its allocation to 0% in the allocation template first/),
    ).toBeInTheDocument();
  });

  it("leaves Credit Card available for an envelope with no allocation", () => {
    renderDialog(unfunded);

    const options = openTypePicker();
    expect(within(options).getByRole("option", { name: /Credit Card/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByText(/set its allocation to 0%/)).not.toBeInTheDocument();
  });

  it("leaves Credit Card available when creating a new account", () => {
    renderDialog();

    const options = openTypePicker();
    expect(within(options).getByRole("option", { name: /Credit Card/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByText(/set its allocation to 0%/)).not.toBeInTheDocument();
  });
});
