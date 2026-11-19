import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  online: true,
  logout: vi.fn(),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({
    data: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      currency: "PHP",
      defaultPage: "Home",
    },
  }),
  useUpdateCurrency: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDefaultPage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useLogout: () => ({ mutate: state.logout, isPending: false }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("@/lib/hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({ isInstalled: true, canPrompt: false, platform: "other" }),
}));

vi.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@/components/suggestions/SuggestionSheet", () => ({
  SuggestionSheet: () => null,
}));

import SettingsPage from "@/app/(app)/settings/page";

describe("Settings page log out", () => {
  beforeEach(() => {
    state.online = true;
    state.logout.mockReset();
  });

  it("logs out through the logout mutation while online", () => {
    render(<SettingsPage />);

    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toBeEnabled();
    expect(screen.queryByText("Connect to sign out.")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(state.logout).toHaveBeenCalledTimes(1);
  });

  it("is disabled offline, says why, and does not start a logout", () => {
    state.online = false;
    render(<SettingsPage />);

    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Connect to sign out.");

    fireEvent.click(button);
    expect(state.logout).not.toHaveBeenCalled();
  });
});
