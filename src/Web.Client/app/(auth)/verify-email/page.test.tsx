import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/types/api";
import VerifyEmailPage from "./page";

const state = vi.hoisted(() => ({
  router: { push: vi.fn() },
  search: new URLSearchParams(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => state.router,
  useSearchParams: () => state.search,
}));

vi.mock("@/lib/api/auth", () => ({
  forgotPassword: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: state.resendVerification,
  resetPassword: vi.fn(),
  verifyEmail: state.verifyEmail,
}));

vi.mock("@/lib/api/me", () => ({ getMe: vi.fn() }));

const CODE = "246810";
const WRONG_CODE = "000000";
const CODE_ENTRY_DESCRIPTION =
  "If an account is waiting for this email, we sent a 6-digit code. Enter it in the browser you signed up from.";
const INVALID_CODE_HINT =
  "Check the code and try again. It works only in the browser you signed up from. A code requested from another browser drops your sign-up password. After five wrong codes, use Forgot password.";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailPage />
    </QueryClientProvider>,
  );
}

function invalidCode() {
  return new ApiError(404, {
    title: "Users.InvalidVerificationToken",
    detail: "The verification code is invalid or has expired.",
    status: 404,
  });
}

// Lets TanStack Query's scheduled notifications run under fake timers, so the page shows each mutation's result.
async function settle() {
  await act(async () => {
    for (let step = 0; step < 5; step += 1) {
      await vi.advanceTimersByTimeAsync(0);
    }
  });
}

function enterCode(code: string) {
  fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    state.search = new URLSearchParams("email=ada%40example.com");
  });

  describe("code entry", () => {
    it("asks for six digits, marks the field invalid, and never calls the API with anything else", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), "12345");
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      expect(await screen.findByText("Enter the 6-digit code.")).toBeInTheDocument();
      const field = screen.getByLabelText("Verification code");
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription("Enter the 6-digit code.");
      expect(state.verifyEmail).not.toHaveBeenCalled();
    });

    it("offers a numeric one-time-code field at touch height", () => {
      renderPage();

      const field = screen.getByLabelText("Verification code");
      expect(field).toHaveAttribute("inputmode", "numeric");
      expect(field).toHaveAttribute("autocomplete", "one-time-code");
      expect(field).toHaveClass("h-11");
    });

    it("says a code was sent only if an account is waiting, and prefills the resend field from the URL", () => {
      renderPage();

      expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
      expect(screen.getByText(CODE_ENTRY_DESCRIPTION)).toBeInTheDocument();
      expect(screen.queryByText(/We sent a 6-digit code to/)).not.toBeInTheDocument();
    });
  });

  describe("invalid", () => {
    it("shows the server message and the browser hint, and keeps the form open for another try", async () => {
      state.verifyEmail.mockRejectedValue(invalidCode());
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), WRONG_CODE);
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      expect(await screen.findByText("The verification code is invalid or has expired.")).toBeInTheDocument();
      expect(screen.getByText(INVALID_CODE_HINT)).toBeInTheDocument();
      expect(state.verifyEmail).toHaveBeenCalledWith(WRONG_CODE, expect.anything());
      expect(screen.getByRole("button", { name: "Verify email" })).toBeEnabled();
    });

    it("announces the error as an alert and ties it to the code field", async () => {
      state.verifyEmail.mockRejectedValue(invalidCode());
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), WRONG_CODE);
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("The verification code is invalid or has expired.");
      const field = screen.getByLabelText("Verification code");
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(/The verification code is invalid or has expired\./);
    });

    it("returns focus to the code field after a failed verify, since the button was disabled", async () => {
      state.verifyEmail.mockRejectedValue(invalidCode());
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), WRONG_CODE);
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      await screen.findByText("The verification code is invalid or has expired.");
      await waitFor(() => expect(screen.getByLabelText("Verification code")).toHaveFocus());
    });

    it("shows other failures without the browser hint", async () => {
      state.verifyEmail.mockRejectedValue(
        new ApiError(429, { title: "Too many requests", detail: "Slow down for a minute." }),
      );
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), CODE);
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      expect(await screen.findByText("Slow down for a minute.")).toBeInTheDocument();
      expect(screen.queryByText(INVALID_CODE_HINT)).not.toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("says the email is verified in a status region and links to login when the account has a password", async () => {
      state.verifyEmail.mockResolvedValue({ hasPassword: true });
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText("Verification code"), CODE);
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      expect(await screen.findByText("Email verified")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Email verified");
      // Base UI renders a Button that wraps a link as role="button".
      expect(screen.getByRole("button", { name: "Go to login" })).toHaveAttribute("href", "/login");
    });

    it("sends a verified account with a password to login after a short pause", async () => {
      vi.useFakeTimers();
      try {
        state.verifyEmail.mockResolvedValue({ hasPassword: true });
        renderPage();

        enterCode(CODE);
        await settle();

        expect(screen.getByText("Email verified")).toBeInTheDocument();
        expect(state.router.push).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });
        expect(state.router.push).toHaveBeenCalledWith("/login");
      } finally {
        vi.useRealTimers();
      }
    });

    it("explains the discarded sign-up password, links to forgot password, and does not redirect", async () => {
      vi.useFakeTimers();
      try {
        state.verifyEmail.mockResolvedValue({ hasPassword: false });
        renderPage();

        enterCode(CODE);
        await settle();

        expect(screen.getByText("Email verified")).toBeInTheDocument();
        // The link splits the sentence, so match its leading text and check the rest through the link.
        expect(
          screen.getByText(/^The password you chose at sign-up was discarded because this code was requested/),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Forgot password" })).toHaveAttribute(
          "href",
          "/forgot-password",
        );
        expect(screen.queryByRole("button", { name: "Go to login" })).not.toBeInTheDocument();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        expect(state.router.push).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("cancels the pending redirect when the page unmounts first", async () => {
      vi.useFakeTimers();
      try {
        state.verifyEmail.mockResolvedValue({ hasPassword: true });
        const { unmount } = renderPage();

        enterCode(CODE);
        await settle();
        expect(screen.getByText("Email verified")).toBeInTheDocument();

        unmount();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });

        expect(state.router.push).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("resend", () => {
    it("asks for a valid email before it sends anything, and marks the field invalid", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.clear(screen.getByLabelText("Email"));
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.click(screen.getByRole("button", { name: "Resend code" }));

      expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
      const field = screen.getByLabelText("Email");
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription("Enter a valid email");
      expect(state.resendVerification).not.toHaveBeenCalled();
    });

    it("sends a new code to the address and confirms it without naming the account", async () => {
      state.resendVerification.mockResolvedValue({
        message: "If that email needs verifying, we sent a new code.",
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "Resend code" }));

      expect(await screen.findByText("If that email needs verifying, we sent a new code.")).toBeInTheDocument();
      expect(state.resendVerification).toHaveBeenCalledWith("ada@example.com", expect.anything());
    });

    it("shows a failed resend in an alert", async () => {
      state.resendVerification.mockRejectedValue(
        new ApiError(429, { title: "Too many requests", detail: "Wait a minute before asking again." }),
      );
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "Resend code" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Wait a minute before asking again.");
    });

    it("holds the resend button for a 60-second cooldown, then releases it", async () => {
      vi.useFakeTimers();
      try {
        state.resendVerification.mockResolvedValue({ message: "ok" });
        renderPage();

        fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
        await settle();

        const button = screen.getByRole("button", { name: "Resend code" });
        expect(button).toHaveAttribute("aria-disabled", "true");
        expect(button).toHaveAccessibleDescription("You can request another code in 60 seconds.");
        expect(screen.getByText("You can request another code in 60 seconds.")).toBeInTheDocument();

        // A press during the cooldown is ignored, so no second code is requested.
        fireEvent.click(button);
        await settle();
        expect(state.resendVerification).toHaveBeenCalledTimes(1);

        for (let second = 0; second < 59; second += 1) {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
          });
        }
        expect(screen.getByRole("button", { name: "Resend code" })).toHaveAttribute("aria-disabled", "true");
        expect(screen.getByText("You can request another code in 1 second.")).toBeInTheDocument();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        expect(screen.getByRole("button", { name: "Resend code" })).toHaveAttribute("aria-disabled", "false");
        expect(screen.queryByText(/You can request another code/)).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
