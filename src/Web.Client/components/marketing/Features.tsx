import {
  CalendarClock,
  LayoutDashboard,
  PiggyBank,
  Percent,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    icon: Wallet,
    title: "Envelope accounts",
    body: "Budgets, savings, and emergency funds as separate envelopes. Archive instead of delete — history stays clean.",
  },
  {
    icon: Percent,
    title: "One-time income split",
    body: "Set an allocation template once (70/20/10), and every income pre-fills the split across your accounts.",
  },
  {
    icon: ShieldCheck,
    title: "Always-correct balances",
    body: "Balances are computed from allocations minus expenses — never stored, so nothing goes stale.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard at a glance",
    body: "See spend this month, what's left per account, and recent activity in one mobile-first view.",
  },
  {
    icon: CalendarClock,
    title: "8 currencies",
    body: "Track in PHP, USD, EUR, GBP, JPY, AUD, CAD, or SGD and switch your display currency anytime.",
  },
  {
    icon: PiggyBank,
    title: "Built for savings",
    body: "Saving envelopes with their own allocation means your savings goal gets funded on every single income.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight">Everything a simple budget needs</h2>
        <p className="mt-3 text-base text-muted-foreground">
          No subscriptions, no bank sync, no clutter. Just the mechanics of envelope
          budgeting, done right.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <feature.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
