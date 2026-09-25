import { Wallet, Percent, ReceiptText } from "lucide-react";

const STEPS = [
  {
    icon: Wallet,
    step: "1",
    title: "Create your envelopes",
    body: "Budget, Savings, Emergency Fund — or your own names. Each account is its own envelope.",
  },
  {
    icon: Percent,
    step: "2",
    title: "Set your income split",
    body: "Choose how every income gets divided, e.g. 70% budget / 20% savings / 10% emergency. Set once, it auto-fills forever.",
  },
  {
    icon: ReceiptText,
    step: "3",
    title: "Log expenses and always know what's left",
    body: "Tag each expense to the envelope it came from and watch balances update instantly.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/60 bg-accent/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-20">
        <h2 className="text-3xl font-bold tracking-tight">Get set up in minutes</h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          A two-step wizard walks you through it on your first login. No spreadsheets, no
          configuration files.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.step} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </span>
                <span className="money text-3xl font-bold text-muted-foreground/30">{step.step}</span>
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
