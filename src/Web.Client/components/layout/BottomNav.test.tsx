import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/log-expense" }));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

import { BottomNav } from "@/components/layout/BottomNav";

describe("BottomNav", () => {
  it("shows four tabs and marks the log page active", () => {
    render(<BottomNav />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    const log = screen.getByRole("link", { name: "Log" });
    expect(log).toHaveAttribute("href", "/log-expense");
    expect(log).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});
