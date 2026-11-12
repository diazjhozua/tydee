"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { NavItemLink } from "@/components/layout/NavItemLink";
import { useLogout } from "@/lib/hooks/useAuth";
import { useMe } from "@/lib/hooks/useMe";
import { adminNav, isNavActive, primaryNav, settingsNav } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/app" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {primaryNav.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
            variant="rail"
          />
        ))}

        <div className="my-2 border-t border-sidebar-border" />

        <NavItemLink item={settingsNav} active={isNavActive(pathname, settingsNav.href)} variant="rail" />
        {me?.isAdmin && (
          <NavItemLink item={adminNav} active={isNavActive(pathname, adminNav.href)} variant="rail" />
        )}
      </nav>

      <div className="p-3">
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <LogOut className="size-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
