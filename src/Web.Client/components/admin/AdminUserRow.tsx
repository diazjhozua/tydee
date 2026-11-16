"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateUser } from "@/lib/hooks/useAdmin";
import { AdminUser } from "@/lib/types/admin";
import { ApiError } from "@/lib/types/api";

export function AdminUserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useUpdateUser();
  const [confirmingLock, setConfirmingLock] = useState(false);
  const selfNoteId = useId();

  const fullName = `${user.firstName} ${user.lastName}`;
  const cannotLock = isSelf && !user.isLocked;

  function toggle(changes: { isEmailVerified?: boolean; isLocked?: boolean }) {
    if (update.isPending) {
      return;
    }

    update.mutate(
      { id: user.id, changes },
      {
        onSuccess: () => toast.success("User updated"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
      },
    );
  }

  function confirmLock() {
    setConfirmingLock(false);
    toggle({ isLocked: true });
  }

  // One button for lock and unlock. Keeping the same element means focus is
  // still on it when the confirmation dialog closes.
  function onLockButton() {
    if (cannotLock || update.isPending) {
      return;
    }

    if (user.isLocked) {
      toggle({ isLocked: false });
    } else {
      setConfirmingLock(true);
    }
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {user.isAdmin && <Badge>Admin</Badge>}
            {user.isLocked && <Badge variant="destructive">Locked</Badge>}
            {user.isEmailVerified ? (
              <Badge variant="secondary">Verified</Badge>
            ) : (
              <Badge variant="outline">Unverified</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-xl"
            aria-disabled={update.isPending || undefined}
            onClick={() => {
              if (!update.isPending) {
                toggle({ isEmailVerified: !user.isEmailVerified });
              }
            }}
          >
            {user.isEmailVerified ? "Unverify" : "Verify"}
            <span className="sr-only"> {fullName}</span>
          </Button>

          <Button
            variant={user.isLocked ? "outline" : "destructive"}
            className="h-10 flex-1 rounded-xl"
            disabled={cannotLock}
            aria-disabled={update.isPending || undefined}
            aria-describedby={cannotLock ? selfNoteId : undefined}
            onClick={onLockButton}
          >
            {user.isLocked ? "Unlock" : "Lock"}
            <span className="sr-only"> {fullName}</span>
          </Button>
        </div>

        {cannotLock && (
          <p id={selfNoteId} className="text-xs text-muted-foreground">
            You can&apos;t lock your own account.
          </p>
        )}
      </CardContent>

      <Dialog open={confirmingLock} onOpenChange={setConfirmingLock}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Lock {fullName}?</DialogTitle>
            <DialogDescription>
              Their sessions end now and they cannot log in until you unlock them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-10" onClick={() => setConfirmingLock(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-10"
              disabled={update.isPending}
              onClick={confirmLock}
            >
              Lock account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
