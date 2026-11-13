import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const state = vi.hoisted(() => ({
  online: true,
  mutate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => state.online,
}));

vi.mock("@/lib/hooks/useSuggestions", () => ({
  useCreateSuggestion: () => ({ mutate: state.mutate, isPending: false, isPaused: false }),
}));

import { SuggestionSheet } from "@/components/suggestions/SuggestionSheet";

function typeMessage(text: string) {
  fireEvent.change(screen.getByLabelText("Your suggestion"), { target: { value: text } });
}

describe("SuggestionSheet", () => {
  beforeEach(() => {
    state.online = true;
    state.mutate.mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("keeps the sheet open until the send succeeds when online", () => {
    const onOpenChange = vi.fn();
    render(<SuggestionSheet open onOpenChange={onOpenChange} />);

    typeMessage("  Add dark export  ");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(state.mutate).toHaveBeenCalledWith(
      { message: "Add dark export", category: null, rating: null },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes and confirms the save when offline, because the replay runs later", () => {
    state.online = false;
    const onOpenChange = vi.fn();
    render(<SuggestionSheet open onOpenChange={onOpenChange} />);

    typeMessage("Show weekly totals");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(state.mutate).toHaveBeenCalledWith({
      message: "Show weekly totals",
      category: null,
      rating: null,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalledWith("Saved. It will send when you're back online.");
  });
});
