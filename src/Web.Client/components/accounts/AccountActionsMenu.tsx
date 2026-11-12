"use client";

import { Archive, MoreVertical, Pencil, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountActionsMenu({
  onEdit,
  onSetBalance,
  onArchive,
  archiveDisabled = false,
}: {
  onEdit: () => void;
  onSetBalance: () => void;
  onArchive: () => void;
  archiveDisabled?: boolean;
}) {
  return (
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
  );
}
