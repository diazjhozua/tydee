import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 text-center">
      <div className="hero-gradient mb-5 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-emerald-600/25">
        <Compass className="size-7" />
      </div>

      <p className="money text-5xl font-bold tracking-tight">404</p>
      <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        That page doesn&apos;t exist or may have moved. Your money is exactly where you left
        it, though.
      </p>

      <Button
        render={<Link href="/" />}
        nativeButton={false}
        className="mt-6 h-11 rounded-xl px-6 font-semibold"
      >
        Back to home
      </Button>
    </div>
  );
}
