import Link from "next/link";
import { LEGAL_OPERATOR, LEGAL_LINKS } from "@/lib/legal/constants";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 text-center">
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs">
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-5 text-xs text-muted-foreground">
          Tydee is operated by {LEGAL_OPERATOR.name} ·{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="hover:underline">
            {LEGAL_OPERATOR.email}
          </a>
        </p>
      </div>
    </footer>
  );
}