import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUserRow } from "@/components/admin/AdminUserRow";
import { updateUser } from "@/lib/api/admin";
import type { AdminUser } from "@/lib/types/admin";

vi.mock("@/lib/api/admin", () => ({
  getStats: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const member = {
  id: "u2",
  email: "member@example.com",
  firstName: "Maria",
  lastName: "Santos",
  isEmailVerified: true,
  isAdmin: false,
  isLocked: false,
} as AdminUser;

function renderRow(user: AdminUser, isSelf = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <AdminUserRow user={user} isSelf={isSelf} />
    </QueryClientProvider>,
  );
}

describe("AdminUserRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateUser).mockResolvedValue(undefined);
  });

  it("opens a confirmation on Lock and does not call the API yet", () => {
    renderRow(member);

    fireEvent.click(screen.getByRole("button", { name: "Lock Maria Santos" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Lock Maria Santos?")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("calls the API with isLocked true only after the lock is confirmed", async () => {
    renderRow(member);

    fireEvent.click(screen.getByRole("button", { name: "Lock Maria Santos" }));
    fireEvent.click(screen.getByRole("button", { name: "Lock account" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith("u2", { isLocked: true }));
  });

  it("cancel closes the dialog and sends nothing", async () => {
    renderRow(member);

    fireEvent.click(screen.getByRole("button", { name: "Lock Maria Santos" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("Unlock is a single click and sends isLocked false", async () => {
    renderRow({ ...member, isLocked: true });

    fireEvent.click(screen.getByRole("button", { name: "Unlock Maria Santos" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith("u2", { isLocked: false }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables Lock on the signed-in admin's own row and explains why", () => {
    renderRow(member, true);

    expect(screen.getByRole("button", { name: "Lock Maria Santos" })).toBeDisabled();
    expect(screen.getByText("You can't lock your own account.")).toBeInTheDocument();
  });

  it("shows a generic toast when the update fails", async () => {
    vi.mocked(updateUser).mockRejectedValue(new Error("network down"));
    renderRow(member);

    fireEvent.click(screen.getByRole("button", { name: "Unverify Maria Santos" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong."));
  });
});
