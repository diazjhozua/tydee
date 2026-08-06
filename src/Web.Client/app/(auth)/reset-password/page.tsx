"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/types/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");

  if (!token) {
    return (
      <StatusCard
        title="Missing token"
        description="This reset link is incomplete. Use the link from your email, or request a new one."
      />
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <StatusCard
        title="Password updated"
        description="You can log in with your new password now. All other sessions were signed out."
      />
    );
  }

  const errorMessage =
    resetPassword.error instanceof ApiError ? resetPassword.error.displayMessage : null;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>At least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length >= 8) {
              resetPassword.mutate(
                { token, newPassword: password },
                { onSuccess: () => setTimeout(() => router.push("/login"), 2500) },
              );
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password !== "" && password.length < 8 && (
              <p className="text-sm text-destructive">Must be at least 8 characters.</p>
            )}
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={password.length < 8 || resetPassword.isPending}
          >
            {resetPassword.isPending ? "Saving..." : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          Go to login
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
