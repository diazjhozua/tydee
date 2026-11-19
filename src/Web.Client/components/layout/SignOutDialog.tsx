"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SignOutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  pending: boolean;
  onConfirm: () => void;
};

function discardCopy(count: number): string {
  return count === 1
    ? "1 change has not synced yet. Signing out discards it. Reconnect and wait for it to sync to keep it."
    : `${count} changes have not synced yet. Signing out discards them. Reconnect and wait for them to sync to keep them.`;
}

/**
 * Asks before signing out when unsynced offline changes would be discarded. Cancel comes first, so it takes focus.
 * The dialog stays up while the logout request runs, with the discard button disabled, until the page leaves.
 */
export function SignOutDialog({ open, onOpenChange, count, pending, onConfirm }: SignOutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No max-width here: the base class keeps a gutter on phones and caps width from sm up. */}
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Discard unsynced changes?</DialogTitle>
          <DialogDescription>{discardCopy(count)}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            Discard and sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
