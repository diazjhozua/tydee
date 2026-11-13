import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pathname: "/accounts",
  isAdmin: false,
  logout: vi.fn(),
  logoutPending: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({ data: { isAdmin: state.isAdmin } }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useLogout: () => ({ mutate: state.logout, isPending: state.logoutPending }),
}));

import { Sidebar } from "@/components/layout/Sidebar";
import { primaryNavFor } from "@/lib/navigation";

describe("Sidebar", () => {
  beforeEach(() => {
    state.pathname = "/accounts";
    state.isAdmin = false;
    state.logoutPending = false;
    state.logout.mockReset();
  });

  it("lists the four destinations and settings inside the Primary nav", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav.querySelectorAll("a")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute("href", "/log-expense");
    expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/recurring");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("hides Admin for non-admins and shows it for admins", () => {
    const { unmount } = render(<Sidebar />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    unmount();

    state.isAdmin = true;
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  it("renders Log first when given the Log-first order", () => {
    render(<Sidebar items={primaryNavFor("LogExpense")} />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = nav.querySelectorAll("a");
    expect(links[0]).toHaveAccessibleName("Log");
    expect(links[1]).toHaveAccessibleName("Home");
  });

  it("marks the current route with aria-current", () => {
    state.pathname = "/accounts";
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("signs out through the logout mutation", () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(state.logout).toHaveBeenCalledTimes(1);
  });

  it("disables sign out while the logout request is pending", () => {
    state.logoutPending = true;
    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  });
});
