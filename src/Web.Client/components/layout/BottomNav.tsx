"use client";

import { usePathname } from "next/navigation";
import { NavItemLink } from "@/components/layout/NavItemLink";
import { isNavActive, type NavItem, primaryNav } from "@/lib/navigation";

export function BottomNav({ items = primaryNav }: { items?: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-border/50 bg-background/90 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {items.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
            variant="tab"
          />
        ))}
      </div>
    </nav>
  );
}
