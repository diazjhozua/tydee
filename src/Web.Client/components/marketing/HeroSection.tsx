import { Coins } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";

const ACCOUNTS = [
  { name: "Budget", balance: 4_250.0, percent: 70 },
  { name: "Savings", balance: 1_750.0, percent: 25 },
  { name: "Emergency Fund", balance: 500.0, percent: 5 },
];

function DashboardMock() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-lg">
      <div className="hero-gradient relative overflow-hidden rounded-t-3xl p-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 size-52 rounded-full bg-white/5" />
        <p className="text-sm font-medium text-white/80">Spent this month</p>
        <Money value={6_750.0} currency="PHP" size="xl" className="mt-1 text-white" />
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
          <p className="money mt-2 text-xs font-medium text-white/80">
            of ₱12,000 spendable
          </p>
        </div>
      </div>
      <div className="space-y-1 p-3">
        {ACCOUNTS.map((account) => (
          <div
            key={account.name}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-accent/50"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{account.name}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${account.percent}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <Money value={account.balance} currency="PHP" size="md" />
              <p className="text-[11px] font-medium text-muted-foreground">left</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-5xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Envelope-style budgeting
        </span>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Split your income.
          <br />
          Know what&apos;s left.
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
          Tydee is a simple envelope-style expense and savings tracker. Create envelopes,
          split every income across them with a template, and log expenses against the
          envelope they came from — so you always know how much you have left.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            render={<Link href="/register" />}
            nativeButton={false}
            className="h-11 rounded-xl px-6 font-semibold"
          >
            Get started free
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="h-11 rounded-xl px-6 font-semibold"
          >
            Log in
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <DashboardMock />
      </div>
    </section>
  );
}
