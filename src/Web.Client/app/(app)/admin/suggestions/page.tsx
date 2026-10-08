"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSuggestions, useUpdateSuggestionStatus } from "@/lib/hooks/useSuggestions";
import { ApiError } from "@/lib/types/api";
import { AdminSuggestion, SuggestionStatus } from "@/lib/types/suggestion";

const STATUSES: SuggestionStatus[] = ["Open", "Done", "Dismissed"];

function statusVariant(status: SuggestionStatus) {
  if (status === "Done") return "default" as const;
  if (status === "Dismissed") return "secondary" as const;
  return "outline" as const;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function SuggestionCard({ suggestion }: { suggestion: AdminSuggestion }) {
  const update = useUpdateSuggestionStatus();
  const [status, setStatus] = useState<SuggestionStatus>(suggestion.status);
  const [note, setNote] = useState(suggestion.adminNote ?? "");

  const dirty = status !== suggestion.status || note !== (suggestion.adminNote ?? "");

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{suggestion.userEmail}</p>
            <p className="text-xs text-muted-foreground">{formatWhen(suggestion.createdAtUtc)}</p>
          </div>
          <Badge variant={statusVariant(suggestion.status)}>{suggestion.status}</Badge>
        </div>

        <p className="whitespace-pre-wrap text-sm">{suggestion.message}</p>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {suggestion.category && <span>Category: {suggestion.category}</span>}
          {suggestion.rating !== null && <span>Rating: {suggestion.rating}/5</span>}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as SuggestionStatus)}>
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Note (optional)</Label>
          <Textarea
            className="min-h-20 rounded-xl"
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button
          className="h-11 w-full rounded-xl"
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate(
              { id: suggestion.id, status, adminNote: note.trim() === "" ? null : note.trim() },
              {
                onSuccess: () => toast.success("Suggestion updated"),
                onError: (err) =>
                  toast.error(
                    err instanceof ApiError ? err.displayMessage : "Something went wrong.",
                  ),
              },
            )
          }
        >
          {update.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminSuggestionsPage() {
  const [filter, setFilter] = useState<SuggestionStatus | "any">("any");
  const { data: suggestions, isPending } = useSuggestions(filter === "any" ? undefined : filter);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Suggestions</h1>

      <Select value={filter} onValueChange={(v) => setFilter(v as SuggestionStatus | "any")}>
        <SelectTrigger className="h-10 w-full rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All statuses</SelectItem>
          {STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isPending && suggestions?.length === 0 && (
        <p className="text-sm text-muted-foreground">No suggestions yet.</p>
      )}

      <div className="space-y-3">
        {suggestions?.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
    </div>
  );
}