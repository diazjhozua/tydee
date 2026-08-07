import {
  Car,
  Gamepad2,
  Home,
  Receipt,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bills: Receipt,
  groceries: ShoppingCart,
  food: UtensilsCrossed,
  transport: Car,
  house: Home,
  fun: Gamepad2,
};

// Rotates a fixed palette so any category (preset or custom) gets a stable
// color derived from its name, without a color-management screen.
const PALETTE = [
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function categoryColorClass(category: string | null): string {
  if (!category) {
    return "bg-muted text-muted-foreground";
  }
  return PALETTE[hashString(category.toLowerCase()) % PALETTE.length];
}

export function categoryBarColorClass(category: string | null): string {
  if (!category) {
    return "bg-muted-foreground/40";
  }
  const index = hashString(category.toLowerCase()) % PALETTE.length;
  return [
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-cyan-500",
  ][index];
}

type Props = {
  category: string | null;
  className?: string;
};

export function CategoryIcon({ category, className }: Props) {
  const Icon = category ? PRESET_ICONS[category.toLowerCase()] ?? Tag : Tag;

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        categoryColorClass(category),
        className,
      )}
    >
      <Icon className="size-4.5" />
    </span>
  );
}
