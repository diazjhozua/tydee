import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewToggle } from "@/components/dashboard/ViewToggle";

describe("ViewToggle", () => {
  it("exposes the active view with aria-pressed", () => {
    render(<ViewToggle label="Accounts" value="list" onChange={() => {}} />);

    expect(screen.getByRole("group", { name: "Accounts layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accounts: list view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Accounts: grid view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the chosen view", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ViewToggle label="Where it went" value="list" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Where it went: grid view" }));

    expect(onChange).toHaveBeenCalledWith("grid");
  });

  it("hides the icons from assistive technology", () => {
    const { container } = render(<ViewToggle label="Accounts" value="list" onChange={() => {}} />);

    for (const icon of container.querySelectorAll("svg")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });
});
