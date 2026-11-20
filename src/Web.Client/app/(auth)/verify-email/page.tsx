"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendVerification, useVerifyEmail } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/types/api";

const REDIRECT_DELAY_MS = 2000;
const RESEND_COOLDOWN_SECONDS = 60;
const INVALID_CODE_TITLE = "Users.InvalidVerificationToken";
const INVALID_CODE_HINT =
  "Check the code and try again. It works only in the browser you signed up from. A code requested from another browser drops your sign-up password. After five wrong codes, use Forgot password.";

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

const emailSchema = z.string().trim().email("Enter a valid email");

type CodeValues = z.infer<typeof codeSchema>;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<CodeValues>({
    resolver: zodResolver(codeSchema) as Resolver<CodeValues>,
    defaultValues: { code: "" },
  });

  const hasPassword = verify.data?.hasPassword;
  // Resend stays focusable while it is busy (aria-disabled, not disabled), so keyboard focus is not lost.
  const resendBusy = resend.isPending || cooldown > 0;

  // Only an account that can log in goes on to /login. The timer is cleared on unmount, so leaving the page cancels it.
  useEffect(() => {
    if (hasPassword !== true) {
      return;
    }

    const timer = setTimeout(() => router.push("/login"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasPassword, router]);

  // The resend cooldown counts down one second at a time. Its timer is cleared on unmount too.
  useEffect(() => {
    if (cooldown === 0) {
      return;
    }

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function onVerify(values: CodeValues) {
    verify.mutate(values.code, {
      // The verify button is disabled while the request runs, which drops focus. Return it to the code field.
      onError: () => setFocus("code", { shouldSelect: true }),
    });
  }

  function onResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (resendBusy) {
      return;
    }

    const parsed = emailSchema.safeParse(resendEmail);
    if (!parsed.success) {
      setResendError(parsed.error.issues[0].message);
      return;
    }

    setResendError(null);
    resend.mutate(parsed.data, {
      onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
      onError: (error) =>
        setResendError(
          error instanceof ApiError ? error.displayMessage : "Couldn't send a new code. Try again.",
        ),
    });
  }

  if (verify.isSuccess) {
    return (
      <Card className="rounded-3xl" role="status">
        <CardHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-5" />
          </div>
          <CardTitle>Email verified</CardTitle>
          <CardDescription className="break-words">
            {hasPassword ? (
              "Taking you to login..."
            ) : (
              <>
                The password you chose at sign-up was discarded because this code was requested from another
                browser. Use{" "}
                <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                  Forgot password
                </Link>{" "}
                to choose one.
              </>
            )}
          </CardDescription>
        </CardHeader>
        {hasPassword && (
          <CardContent>
            <Button render={<Link href="/login" />} nativeButton={false} variant="outline" className="w-full">
              Go to login
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  const verifyError =
    verify.error instanceof ApiError
      ? verify.error.displayMessage
      : verify.error
        ? "Verification failed. Try again."
        : null;
  const invalidCode = verify.error instanceof ApiError && verify.error.title === INVALID_CODE_TITLE;
  const codeDescribedBy =
    [errors.code ? "code-error" : "", verifyError ? "verify-error" : ""].filter(Boolean).join(" ") ||
    undefined;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Enter your code</CardTitle>
        <CardDescription className="break-words">
          If an account is waiting for this email, we sent a 6-digit code. Enter it in the browser you signed up
          from.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-11 text-center text-lg tracking-widest"
              aria-invalid={Boolean(errors.code) || Boolean(verifyError)}
              aria-describedby={codeDescribedBy}
              {...register("code")}
            />
            {errors.code && (
              <p id="code-error" role="alert" className="text-sm text-destructive">
                {errors.code.message}
              </p>
            )}
          </div>

          {verifyError && (
            <div id="verify-error" role="alert" className="space-y-1">
              <p className="text-sm text-destructive">{verifyError}</p>
              {invalidCode && <p className="text-sm text-muted-foreground">{INVALID_CODE_HINT}</p>}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={verify.isPending}>
            {verify.isPending ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        {/* noValidate: the zod message below is the one shown, not the browser's native email check. */}
        <form noValidate onSubmit={onResend} className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="resend-email">Email</Label>
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              aria-invalid={Boolean(resendError)}
              aria-describedby={resendError ? "resend-error" : undefined}
            />
            {resendError && (
              <p id="resend-error" role="alert" className="text-sm text-destructive">
                {resendError}
              </p>
            )}
          </div>

          {resend.isSuccess && (
            <p role="status" className="text-sm text-muted-foreground">
              If that email needs verifying, we sent a new code.
            </p>
          )}

          <Button
            type="submit"
            variant="outline"
            className="w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={resendBusy}
            aria-describedby={cooldown > 0 ? "resend-cooldown" : undefined}
          >
            {resend.isPending ? "Sending..." : "Resend code"}
          </Button>

          {cooldown > 0 && (
            <p id="resend-cooldown" className="text-center text-sm text-muted-foreground">
              You can request another code in {cooldown} {cooldown === 1 ? "second" : "seconds"}.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
