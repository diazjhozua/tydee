"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/constants";

type LegalPageProps = {
  title: string;
  children: React.ReactNode;
};

export default function LegalPage({ title, children }: LegalPageProps) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.history.length > 1);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">Last updated {LEGAL_EFFECTIVE_DATE}</p>
      <div className="prose space-y-4 text-sm leading-relaxed text-muted-foreground mt-6">
        {children}
      </div>
      <button
        type="button"
        onClick={() => (hasHistory ? router.back() : router.replace("/login"))}
        className="mt-8 inline-block cursor-pointer text-sm font-medium text-primary hover:underline"
      >
        Back to app
      </button>
    </div>
  );
}