"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyEmail } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/types/api";

function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const verify = useVerifyEmail();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;

    verify.mutate(token, {
      onSuccess: () => {
        setTimeout(() => router.push("/login"), 2000);
      },
    });
  }, [token, verify, router]);

  if (!token) {
    return (
      <StatusCard title="Missing token" description="This verification link is incomplete. Use the link from your email." />
    );
  }

  if (verify.isSuccess) {
    return (
      <StatusCard
        title="Email verified!"
        description="Your account is active. Taking you to login..."
      />
    );
  }

  if (verify.isError) {
    const message =
      verify.error instanceof ApiError
        ? verify.error.displayMessage
        : "Verification failed. The link may have expired.";
    return <StatusCard title="Verification failed" description={message} />;
  }

  return <StatusCard title="Verifying..." description="Hang tight while we confirm your email." />;
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href="/login" />} variant="outline" className="w-full">
          Go to login
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
