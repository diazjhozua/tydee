import { PiggyBank, Wallet } from "lucide-react";
import { AccountType } from "@/lib/types/account";
import { cn } from "@/lib/utils";

type Props = {
  type: AccountType;
  className?: string;
};

export function AccountIcon({ type, className }: Props) {
  const spending = type === "Spending";

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        spending
          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      {spending ? <Wallet className="size-5" /> : <PiggyBank className="size-5" />}
    </span>
  );
}
