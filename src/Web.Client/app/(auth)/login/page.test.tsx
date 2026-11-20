import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/types/api";
import LoginPage from "./page";

const state = vi.hoisted(() => ({
  router: { push: vi.fn() },
  login: vi.fn(),
  resendVerification: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => state.router,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/auth", () => ({
  forgotPassword: vi.fn(),
  login: state.login,
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: state.resendVerification,
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
}));

vi.mock("@/lib/api/me", () => ({ getMe: vi.fn() }));

const PASSWORD = "secret-password";
const SENT = "If that email needs verifying, we sent a new code.";
const CAVEAT = "Resend from the browser you signed up from, or a new code drops your sign-up password.";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

function notVerified() {
  return new ApiError(403, {
    title: "Users.EmailNotVerified",
    detail: "Please verify your email before logging in.",
    status: 403,
  });
}

// Replaces the address and password, then submits the form.
async function submitLogin(email: string) {
  const user = userEvent.setup();

  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), email);
  await user.clear(screen.getByLabelText("Password", { exact: true }));
  await user.type(screen.getByLabelText("Password", { exact: true }), PASSWORD);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

async function clickResend() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Resend verification email" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    state.router.push.mockReset();
    state.login.mockReset();
    state.resendVerification.mockReset();
  });

  it("offers a fresh resend for each address that logs in unverified", async () => {
    state.login.mockRejectedValue(notVerified());
    state.resendVerification.mockResolvedValue({ message: SENT });
    renderPage();

    await submitLogin("first@example.com");
    await clickResend();
    expect(await screen.findByText(SENT)).toBeInTheDocument();

    await submitLogin("second@example.com");

    // A new login hides the earlier confirmation and offers a resend button again for the second address.
    expect(await screen.findByRole("button", { name: "Resend verification email" })).toBeInTheDocument();
    expect(screen.queryByText(SENT)).not.toBeInTheDocument();

    await clickResend();
    await waitFor(() =>
      expect(state.resendVerification).toHaveBeenLastCalledWith("second@example.com", expect.anything()),
    );
  });

  it("shows a failed resend in an alert and keeps the resend button", async () => {
    state.login.mockRejectedValue(notVerified());
    state.resendVerification.mockRejectedValue(
      new ApiError(429, { title: "Too many requests", detail: "Wait a minute before asking again." }),
    );
    renderPage();

    await submitLogin("owner@example.com");
    await clickResend();

    expect(await screen.findByRole("alert")).toHaveTextContent("Wait a minute before asking again.");
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeInTheDocument();
  });

  it("announces the notice as a status and warns that a resend from another browser drops the sign-up password", async () => {
    state.login.mockRejectedValue(notVerified());
    renderPage();

    await submitLogin("owner@example.com");

    expect(await screen.findByRole("status")).toHaveTextContent("Your email isn't verified yet.");
    expect(screen.getByText(CAVEAT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter your code" })).toHaveAttribute(
      "href",
      "/verify-email?email=owner%40example.com",
    );
  });
});
