import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  kind: "income" | "expense" | "adjustment" | "transfer";
  className?: string;
};

export function ActivityIcon({ kind, className }: Props) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        kind === "income" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        kind === "expense" && "bg-red-500/12 text-red-500 dark:text-red-400",
        kind === "adjustment" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        kind === "transfer" && "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        className,
      )}
    >
      {kind === "income" && <ArrowUpRight className="size-4.5" />}
      {kind === "expense" && <ArrowDownRight className="size-4.5" />}
      {kind === "adjustment" && <Scale className="size-4.5" />}
      {kind === "transfer" && <ArrowLeftRight className="size-4.5" />}
    </span>
  );
}
