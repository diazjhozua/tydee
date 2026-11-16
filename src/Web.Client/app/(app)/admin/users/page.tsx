"use client";

import { AdminUserRow } from "@/components/admin/AdminUserRow";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useMe } from "@/lib/hooks/useMe";

export default function AdminUsersPage() {
  const { data: users, isPending, isError } = useAdminUsers();
  const { data: me } = useMe();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Users</h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
      {isError && <p className="text-sm text-destructive">Couldn&apos;t load users.</p>}
      {users?.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}

      <div className="space-y-3">
        {users?.map((user) => (
          <AdminUserRow key={user.id} user={user} isSelf={me?.id === user.id} />
        ))}
      </div>
    </div>
  );
}
