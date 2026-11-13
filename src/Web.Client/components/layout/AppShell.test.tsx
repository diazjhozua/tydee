import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pathname: "/app",
  defaultPage: null as "Home" | "LogExpense" | null,
  meLoaded: true,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({
    data: state.meLoaded ? { isAdmin: false, defaultPage: state.defaultPage } : undefined,
  }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/expenses/ExpenseDialog", () => ({ ExpenseDialog: () => null }));
vi.mock("@/components/incomes/IncomeDialog", () => ({ IncomeDialog: () => null }));
vi.mock("@/components/transfers/TransferSheet", () => ({ TransferSheet: () => null }));
vi.mock("@/components/layout/AppOpenRedirect", () => ({ AppOpenRedirect: () => null }));
vi.mock("@/components/layout/DefaultPagePrompt", () => ({ DefaultPagePrompt: () => null }));
vi.mock("@/components/shared/InstallBanner", () => ({ InstallBanner: () => null }));
vi.mock("@/components/shared/OfflineBanner", () => ({ OfflineBanner: () => null }));

import { AppShell } from "@/components/layout/AppShell";

function navLabels(index: number) {
  const navs = screen.getAllByRole("navigation", { name: "Primary" });
  return within(navs[index])
    .getAllByRole("link")
    .map((link) => link.textContent);
}

// Sidebar is the first Primary nav in the DOM, BottomNav the second.
const SIDEBAR = 0;
const BOTTOM = 1;

describe("AppShell primary navigation order", () => {
  beforeEach(() => {
    state.pathname = "/app";
    state.defaultPage = null;
    state.meLoaded = true;
  });

  it("keeps Home first when no default page is set", () => {
    render(<AppShell>content</AppShell>);

    expect(navLabels(SIDEBAR)[0]).toBe("Home");
    expect(navLabels(BOTTOM)[0]).toBe("Home");
  });

  it("puts Log first in both navs when Log expense is the default page", () => {
    state.defaultPage = "LogExpense";
    render(<AppShell>content</AppShell>);

    expect(navLabels(SIDEBAR)[0]).toBe("Log");
    expect(navLabels(BOTTOM)[0]).toBe("Log");
  });

  it("keeps the bottom nav and sidebar in the same order", () => {
    state.defaultPage = "LogExpense";
    render(<AppShell>content</AppShell>);

    const sidebarLabels = navLabels(SIDEBAR).slice(0, 4);
    const bottomLabels = navLabels(BOTTOM);
    expect(sidebarLabels).toEqual(bottomLabels);
  });

  it("keeps Home first while the preference is still loading", () => {
    state.defaultPage = "LogExpense";
    state.meLoaded = false;
    render(<AppShell>content</AppShell>);

    expect(navLabels(BOTTOM)[0]).toBe("Home");
  });
});
