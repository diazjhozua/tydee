"use client";

import { useMutationState } from "@tanstack/react-query";

/**
 * How many changes are queued offline and not yet synced. Signing out discards all of them, replayable or not, so
 * this counts every paused mutation.
 */
export function useUnsyncedCount(): number {
  return useMutationState({ select: (mutation) => mutation.state.isPaused }).filter(Boolean).length;
}
