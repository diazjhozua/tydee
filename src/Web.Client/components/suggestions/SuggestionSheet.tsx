"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useCreateSuggestion } from "@/lib/hooks/useSuggestions";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Feature", "Bug", "Design", "Other"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SuggestionSheet({ open, onOpenChange }: Props) {
  const createSuggestion = useCreateSuggestion();
  const isOnline = useOnlineStatus();

  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMessage("");
      setCategory(null);
      setRating(null);
    }
  }

  function save() {
    const request = { message: message.trim(), category, rating };

    if (!isOnline) {
      // Queued by the offline replay: the success callback only runs after
      // reconnect, so close now and let the replay toast confirm the send.
      createSuggestion.mutate(request);
      toast.success("Saved. It will send when you're back online.");
      onOpenChange(false);
      return;
    }

    createSuggestion.mutate(request, {
      onSuccess: () => {
        toast.success("Thanks! Your suggestion was sent.");
        onOpenChange(false);
      },
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
    });
  }

  // A mutation paused by the offline queue is not in flight; keep Send usable.
  const sending = createSuggestion.isPending && !createSuggestion.isPaused;

  return (
    <EntrySheet open={open} onOpenChange={onOpenChange} title="Send feedback">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="suggestion-message">Your suggestion</Label>
          <Textarea
            id="suggestion-message"
            placeholder="Tell us what you'd like to see, or what isn't working."
            className="min-h-28 rounded-xl"
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Category (optional)</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? null)}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>How are we doing? (optional)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(rating === value ? null : value)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                  rating === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={save}
          disabled={message.trim() === "" || sending}
        >
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </EntrySheet>
  );
}