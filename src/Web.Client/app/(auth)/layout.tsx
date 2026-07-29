import { Coins } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="hero-gradient mb-3 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-emerald-600/25">
          <Coins className="size-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Tydee</h1>
        <p className="mt-1 text-sm text-muted-foreground">Simple envelope budgeting</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
