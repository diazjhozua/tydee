import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  defaultPage: null as "Home" | "LogExpense" | null,
  online: true,
  replace: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ replace: state.replace }),
}));

vi.mock("@/lib/hooks/useMe", () => ({
  useMe: () => ({
    data: { defaultPage: state.defaultPage },
    isFetchedAfterMount: true,
  }),
  useUpdateDefaultPage: () => ({ mutate: state.mutate, isPending: false }),
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DefaultPagePrompt } from "@/components/layout/DefaultPagePrompt";

describe("DefaultPagePrompt", () => {
  beforeEach(() => {
    state.defaultPage = null;
    state.online = true;
    state.mutate.mockReset();
    state.replace.mockReset();
  });

  it("asks for a choice when the preference was never set", () => {
    render(<DefaultPagePrompt />);

    expect(
      screen.getByRole("dialog", { name: "Where should Tydee open?" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("saves the chosen page", () => {
    state.mutate.mockImplementation((_value, options) => options?.onSuccess?.());

    render(<DefaultPagePrompt />);
    fireEvent.click(screen.getByRole("button", { name: /Log expense/ }));

    expect(state.mutate).toHaveBeenCalledWith("LogExpense", expect.any(Object));
    expect(state.replace).toHaveBeenCalledWith("/log-expense");
  });

  it("lets an offline user escape the forced choice", () => {
    state.online = false;

    render(<DefaultPagePrompt />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Home/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Log expense/ })).toBeDisabled();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing once a preference exists", () => {
    state.defaultPage = "Home";

    render(<DefaultPagePrompt />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
