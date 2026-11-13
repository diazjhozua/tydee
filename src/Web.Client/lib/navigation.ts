import { Bookmark, House, type LucideIcon, PenLine, Settings, Shield, Wallet } from "lucide-react";
import type { DefaultPage } from "@/lib/types/me";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Single source for the app's destinations. BottomNav (phone) and Sidebar
// (md and up) both render from these lists so labels cannot drift.
export const primaryNav: NavItem[] = [
  { href: "/app", label: "Home", icon: House },
  { href: "/log-expense", label: "Log", icon: PenLine },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/recurring", label: "Saved", icon: Bookmark },
];

// Log expense as the default page moves Log to the front; Home and Log swap, and
// the other items keep their positions. Null, undefined, and Home keep the order above.
// For LogExpense it returns a new array, so primaryNav itself is never mutated.
export function primaryNavFor(defaultPage: DefaultPage | null | undefined): NavItem[] {
  if (defaultPage !== "LogExpense") {
    return primaryNav;
  }
  const home = primaryNav.findIndex((item) => item.href === "/app");
  const log = primaryNav.findIndex((item) => item.href === "/log-expense");
  const ordered = [...primaryNav];
  [ordered[home], ordered[log]] = [ordered[log], ordered[home]];
  return ordered;
}

export const settingsNav: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const adminNav: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
