"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats } from "@/lib/hooks/useAdmin";

export default function AdminPage() {
  const { data: stats, isPending } = useAdminStats();

  const tiles: { label: string; value: number | undefined }[] = [
    { label: "Users", value: stats?.users },
    { label: "Verified", value: stats?.verifiedUsers },
    { label: "Accounts", value: stats?.accounts },
    { label: "Expenses", value: stats?.expenses },
    { label: "Open suggestions", value: stats?.openSuggestions },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Admin</h1>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {isPending || tile.value === undefined ? "—" : tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase text-muted-foreground">Manage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Button
            render={<Link href="/admin/suggestions" />}
            nativeButton={false}
            variant="ghost"
            className="w-full justify-between rounded-xl px-2"
          >
            <span className="text-sm font-medium">Suggestions</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
          <Button
            render={<Link href="/admin/users" />}
            nativeButton={false}
            variant="ghost"
            className="w-full justify-between rounded-xl px-2"
          >
            <span className="text-sm font-medium">Users</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}