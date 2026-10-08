"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminUsers, useUpdateUser } from "@/lib/hooks/useAdmin";
import { ApiError } from "@/lib/types/api";
import { AdminUser } from "@/lib/types/admin";

function UserRow({ user }: { user: AdminUser }) {
  const update = useUpdateUser();

  function toggle(changes: { isEmailVerified?: boolean; isLocked?: boolean }) {
    update.mutate(
      { id: user.id, changes },
      {
        onSuccess: () => toast.success("User updated"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex shrink-0 gap-1">
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
            disabled={update.isPending}
            onClick={() => toggle({ isEmailVerified: !user.isEmailVerified })}
          >
            {user.isEmailVerified ? "Unverify" : "Verify"}
          </Button>
          <Button
            variant={user.isLocked ? "outline" : "destructive"}
            className="h-10 flex-1 rounded-xl"
            disabled={update.isPending}
            onClick={() => toggle({ isLocked: !user.isLocked })}
          >
            {user.isLocked ? "Unlock" : "Lock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const { data: users, isPending } = useAdminUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Users</h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="space-y-3">
        {users?.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}