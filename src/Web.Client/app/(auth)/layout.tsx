import { LogoMark } from "@/components/brand/Logo";
import SiteFooter from "@/components/legal/SiteFooter";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <LogoMark size="lg" className="mb-3" />
          <h1 className="text-3xl font-bold tracking-tight">Tydee</h1>
          <p className="mt-1 text-sm text-muted-foreground">Simple envelope budgeting</p>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
