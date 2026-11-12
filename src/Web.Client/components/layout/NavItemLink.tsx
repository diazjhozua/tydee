import Link from "next/link";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavItemLinkProps = {
  item: NavItem;
  active: boolean;
  variant: "tab" | "rail";
};

export function NavItemLink({ item, active, variant }: NavItemLinkProps) {
  const Icon = item.icon;
  const isTab = variant === "tab";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isTab
          ? "flex flex-col items-center justify-center gap-1"
          : "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-sidebar-accent",
        isTab && (active ? "text-primary" : "text-muted-foreground"),
        !isTab && (active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground"),
      )}
    >
      <Icon className="size-5" />
      <span className={isTab ? "text-[11px] font-medium" : undefined}>{item.label}</span>
    </Link>
  );
}
