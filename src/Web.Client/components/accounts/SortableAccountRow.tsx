"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, GripVertical, MoreVertical, Pencil, Scale } from "lucide-react";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Account } from "@/lib/types/account";
import { cn } from "@/lib/utils";

export function SortableAccountRow({
  account,
  currency,
  onEdit,
  onSetBalance,
  onArchive,
  archiveDisabled = false,
}: {
  account: Account;
  currency: string;
  onEdit: () => void;
  onSetBalance: () => void;
  onArchive: () => void;
  archiveDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 py-1.5", isDragging && "z-10 opacity-90")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Account actions"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSetBalance}>
            <Scale className="size-4" /> Set balance
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={archiveDisabled} onClick={onArchive}>
            <Archive className="size-4" /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}