import {
  Briefcase,
  Car,
  CreditCard,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { AccountType } from "@/lib/types/account";
import { cn } from "@/lib/utils";

export const ACCOUNT_ICON_OPTIONS: {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "wallet", icon: Wallet },
  { key: "piggy-bank", icon: PiggyBank },
  { key: "home", icon: Home },
  { key: "car", icon: Car },
  { key: "plane", icon: Plane },
  { key: "graduation-cap", icon: GraduationCap },
  { key: "heart", icon: Heart },
  { key: "gift", icon: Gift },
  { key: "briefcase", icon: Briefcase },
  { key: "shopping-bag", icon: ShoppingBag },
  { key: "credit-card", icon: CreditCard },
  { key: "landmark", icon: Landmark },
];

export const ACCOUNT_COLOR_OPTIONS: { key: string; badgeClass: string; swatchClass: string }[] = [
  { key: "sky", badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400", swatchClass: "bg-sky-500" },
  {
    key: "amber",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    swatchClass: "bg-amber-500",
  },
  { key: "rose", badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400", swatchClass: "bg-rose-500" },
  {
    key: "violet",
    badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    swatchClass: "bg-violet-500",
  },
  {
    key: "emerald",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    swatchClass: "bg-emerald-500",
  },
  {
    key: "orange",
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    swatchClass: "bg-orange-500",
  },
  { key: "cyan", badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400", swatchClass: "bg-cyan-500" },
  {
    key: "slate",
    badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    swatchClass: "bg-slate-500",
  },
];

function defaultBadgeClass(type: AccountType): string {
  return type === "Spending"
    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
}

type Props = {
  type: AccountType;
  icon?: string | null;
  color?: string | null;
  className?: string;
};

export function AccountIcon({ type, icon, color, className }: Props) {
  const Icon =
    ACCOUNT_ICON_OPTIONS.find((o) => o.key === icon)?.icon ??
    (type === "Spending" ? Wallet : PiggyBank);
  const colorClass =
    ACCOUNT_COLOR_OPTIONS.find((o) => o.key === color)?.badgeClass ?? defaultBadgeClass(type);

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        colorClass,
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
