import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <div className="hero-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white shadow-lg shadow-emerald-600/20">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/5" />

        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Start budgeting the envelope way
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/80 md:text-base">
          Create your accounts, split your first income, and see exactly what you have
          left to spend.
        </p>
        <Button
          render={<Link href="/register" />}
          nativeButton={false}
          size="lg"
          className="mt-8 h-12 rounded-xl px-8 font-semibold shadow-lg"
        >
          Get started free
        </Button>
      </div>
    </section>
  );
}
