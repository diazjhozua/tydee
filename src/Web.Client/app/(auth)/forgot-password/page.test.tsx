import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/types/api";
import ForgotPasswordPage from "./page";

const state = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  forgotPassword: state.forgotPassword,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
}));

const LENGTH_MESSAGE = "Email must be 256 characters or fewer.";
const FORMAT_MESSAGE = "Enter a valid email";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ForgotPasswordPage />
    </QueryClientProvider>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    state.forgotPassword.mockReset();
  });

  it("refuses an address over 256 characters before it sends anything", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("Email"));
    await user.paste(`${"a".repeat(245)}@example.com`);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(LENGTH_MESSAGE)).toBeInTheDocument();
    expect(state.forgotPassword).not.toHaveBeenCalled();
  });

  it("marks the field invalid and links the length message to it", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("Email"));
    await user.paste(`${"a".repeat(245)}@example.com`);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const field = await screen.findByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(LENGTH_MESSAGE);
  });

  it("asks for a valid email when the field is empty and sends nothing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(FORMAT_MESSAGE)).toBeInTheDocument();
    expect(state.forgotPassword).not.toHaveBeenCalled();
  });

  it("asks for a valid email when the address is malformed and sends nothing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(FORMAT_MESSAGE)).toBeInTheDocument();
    expect(state.forgotPassword).not.toHaveBeenCalled();
  });

  it("clears the length message once the owner edits the field", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("Email"));
    await user.paste(`${"a".repeat(245)}@example.com`);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(LENGTH_MESSAGE)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "x");

    expect(screen.queryByText(LENGTH_MESSAGE)).not.toBeInTheDocument();
  });

  it("sends an address of exactly 256 characters once surrounding spaces are trimmed", async () => {
    const user = userEvent.setup();
    state.forgotPassword.mockResolvedValue({ message: "ok" });
    renderPage();

    const address = `${"a".repeat(244)}@example.com`;
    await user.click(screen.getByLabelText("Email"));
    await user.paste(`   ${address}   `);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
    expect(state.forgotPassword).toHaveBeenCalledWith(address, expect.anything());
  });

  it("shows the server's reason in an alert and keeps the form", async () => {
    const user = userEvent.setup();
    state.forgotPassword.mockRejectedValue(
      new ApiError(429, { title: "Too many requests", detail: "Wait a minute before asking again." }),
    );
    renderPage();

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wait a minute before asking again.");
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("shows a generic message when the request fails without a server reason", async () => {
    const user = userEvent.setup();
    state.forgotPassword.mockRejectedValue(new Error("Network down"));
    renderPage();

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });
});
