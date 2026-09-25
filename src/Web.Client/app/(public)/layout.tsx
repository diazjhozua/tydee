import Link from "next/link";
import SiteFooter from "@/components/legal/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-md items-center px-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            Tydee
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}