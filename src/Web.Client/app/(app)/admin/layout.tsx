"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/lib/hooks/useMe";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isPending } = useMe();

  useEffect(() => {
    // The API enforces the Admin policy; this only keeps non-admins out of the
    // empty shell. Wait for a settled fetch so we don't bounce mid-load.
    if (!isPending && me && !me.isAdmin) {
      router.replace("/app");
    }
  }, [isPending, me, router]);

  if (isPending || !me?.isAdmin) {
    return null;
  }

  return <>{children}</>;
}