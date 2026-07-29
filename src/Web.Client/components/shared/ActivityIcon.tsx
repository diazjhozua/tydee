import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  kind: "income" | "expense";
  className?: string;
};

export function ActivityIcon({ kind, className }: Props) {
  const income = kind === "income";

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        income
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/12 text-red-500 dark:text-red-400",
        className,
      )}
    >
      {income ? <ArrowUpRight className="size-4.5" /> : <ArrowDownRight className="size-4.5" />}
    </span>
  );
}
