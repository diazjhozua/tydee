"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { AccountActionsMenu } from "@/components/accounts/AccountActionsMenu";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { Money } from "@/components/shared/Money";
import { Account } from "@/lib/types/account";
import { cn } from "@/lib/utils";

// "row" is the phone list (one account per line). "card" is the desktop grid
// tile. Both share the same sortable id and the same actions, so drag order
// and menus behave identically across layouts.
export function SortableAccountRow({
  account,
  currency,
  variant = "row",
  onEdit,
  onSetBalance,
  onArchive,
  archiveDisabled = false,
}: {
  account: Account;
  currency: string;
  variant?: "row" | "card";
  onEdit: () => void;
  onSetBalance: () => void;
  onArchive: () => void;
  archiveDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <GripVertical className="size-4" />
    </button>
  );

  const menu = (
    <AccountActionsMenu
      onEdit={onEdit}
      onSetBalance={onSetBalance}
      onArchive={onArchive}
      archiveDisabled={archiveDisabled}
    />
  );

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (variant === "card") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm",
          isDragging && "z-10 opacity-90",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <AccountIcon
            type={account.type}
            icon={account.icon}
            color={account.color}
            className="size-9 rounded-lg"
          />
          <div className="flex items-center gap-1">
            {handle}
            {menu}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.name}</p>
          <p className="text-xs text-muted-foreground">{account.type}</p>
        </div>
        <Money value={account.balance} currency={currency} size="sm" hideable />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 py-1.5", isDragging && "z-10 opacity-90")}
    >
      {handle}
      <AccountIcon
        type={account.type}
        icon={account.icon}
        color={account.color}
        className="size-9 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{account.name}</p>
        <p className="text-xs text-muted-foreground">{account.type}</p>
      </div>
      <Money value={account.balance} currency={currency} size="sm" hideable />
      {menu}
    </div>
  );
}
