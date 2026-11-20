import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/types/api";
import RegisterPage from "./page";

const state = vi.hoisted(() => ({
  router: { push: vi.fn() },
  register: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => state.router,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/auth", () => ({
  forgotPassword: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: state.register,
  resendVerification: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
}));

vi.mock("@/lib/api/me", () => ({ getMe: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterPage />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email: string) {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("First name"), "Ada");
  await user.type(screen.getByLabelText("Last name"), "Lovelace");
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password", { exact: true }), "secret-password");
  await user.type(screen.getByLabelText("Confirm password", { exact: true }), "secret-password");
  await user.click(screen.getByRole("button", { name: "Sign up" }));
}

describe("RegisterPage", () => {
  beforeEach(() => {
    state.router.push.mockReset();
    state.register.mockReset();
  });

  it("moves on to code entry with the registered address encoded in the URL", async () => {
    state.register.mockResolvedValue({ message: "Registration successful. Enter the 6-digit code we emailed you." });
    renderPage();

    await fillAndSubmit("ada+test@example.com");

    await waitFor(() =>
      expect(state.router.push).toHaveBeenCalledWith("/verify-email?email=ada%2Btest%40example.com"),
    );
    // TanStack also passes its mutation context as the second argument.
    expect(state.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada+test@example.com", password: "secret-password" }),
      expect.anything(),
    );
  });

  it("stays on the form and shows the error when registration fails", async () => {
    state.register.mockRejectedValue(
      new ApiError(400, { title: "Validation", detail: "Password must be at least 8 characters." }),
    );
    renderPage();

    await fillAndSubmit("ada@example.com");

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(state.router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });
});
