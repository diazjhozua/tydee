import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";

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

vi.mock("@/lib/hooks/useSuggestions", () => ({
  useCreateSuggestion: () => ({ mutate: vi.fn(), isPending: false, isPaused: false }),
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

describe("AppShell header feedback button", () => {
  beforeEach(() => {
    state.pathname = "/app";
    state.defaultPage = null;
    state.meLoaded = true;
    useBalanceVisibilityStore.setState({ hideBalances: false });
  });

  it("shows a Give feedback button in the header", () => {
    render(<AppShell>content</AppShell>);

    expect(screen.getByRole("button", { name: "Give feedback" })).toBeInTheDocument();
  });

  it("opens the feedback sheet when the button is pressed", async () => {
    render(<AppShell>content</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: "Give feedback" }));

    expect(await screen.findByRole("dialog", { name: "Send feedback" })).toBeInTheDocument();
  });

  it("places the feedback button between the balance toggle and the Settings link", () => {
    render(<AppShell>content</AppShell>);

    const balances = screen.getByRole("button", { name: "Hide balances" });
    const feedback = screen.getByRole("button", { name: "Give feedback" });
    const settings = screen.getByLabelText("Settings");

    expect(balances.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(feedback.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(settings).toHaveAttribute("href", "/settings");
  });

  it("is hidden on the onboarding route", () => {
    state.pathname = "/setup";
    render(<AppShell>content</AppShell>);

    expect(screen.queryByRole("button", { name: "Give feedback" })).not.toBeInTheDocument();
  });
});
