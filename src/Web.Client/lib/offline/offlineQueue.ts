// Storage for offline writes waiting to sync. Only paused, replayable mutations are written here (see
// providers/QueryProvider.tsx); query data is never persisted. No React in this module, so the auth layer can call it.

// Key the persister writes to. Renamed from the library default so the old, financial-data-bearing key is not reused.
export const OFFLINE_QUEUE_KEY = "tydee-offline-queue";

// The key the persister used before this change. It held query data and paused auth mutations, so it is removed
// rather than migrated.
export const LEGACY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    // Storage can be blocked (for example, disabled cookies). Nothing is persisted then, so nothing to remove.
    return null;
  }
}

/** Removes queued offline writes. Called when the session ends, so no queued financial data outlives it. */
export function discardOfflineQueue(): void {
  const local = storage();
  local?.removeItem(OFFLINE_QUEUE_KEY);
  local?.removeItem(LEGACY_CACHE_KEY);
}

/** Removes the pre-change cache key on this device. Leaves the current queue alone. */
export function purgeLegacyCache(): void {
  storage()?.removeItem(LEGACY_CACHE_KEY);
}
