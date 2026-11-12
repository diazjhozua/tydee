import { Bookmark, House, type LucideIcon, PenLine, Settings, Shield, Wallet } from "lucide-react";

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

export const settingsNav: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const adminNav: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
