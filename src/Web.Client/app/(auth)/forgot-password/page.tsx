"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/types/api";

const MAX_EMAIL_LENGTH = 256;

const emailSchema = z
  .string()
  .trim()
  .max(MAX_EMAIL_LENGTH, `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`)
  .email("Enter a valid email");

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  if (forgotPassword.isSuccess) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-5" />
          </div>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            If that email has an account, we sent a reset link. It expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="w-full"
          >
            Back to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  const requestError = forgotPassword.isError
    ? forgotPassword.error instanceof ApiError
      ? forgotPassword.error.displayMessage
      : "Something went wrong. Try again."
    : null;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = emailSchema.safeParse(email);
            if (!parsed.success) {
              setEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email");
              return;
            }
            setEmailError(null);
            forgotPassword.mutate(parsed.data);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
            />
            {emailError && (
              <p id="email-error" role="alert" className="text-sm text-destructive">
                {emailError}
              </p>
            )}
          </div>

          {requestError && (
            <p role="alert" className="text-sm text-destructive">
              {requestError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
