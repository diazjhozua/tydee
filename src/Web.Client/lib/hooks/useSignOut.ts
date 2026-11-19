"use client";

import { useState } from "react";
import { useLogout } from "@/lib/hooks/useAuth";
import { useUnsyncedCount } from "@/lib/hooks/useUnsyncedCount";

/**
 * Sign-out for the logout buttons. With unsynced offline changes it asks first, because signing out discards them.
 * Pair it with `SignOutDialog`: `askOpen` and `setAskOpen` drive the dialog, `count` is the number it shows.
 */
export function useSignOut() {
  const logout = useLogout();
  const unsynced = useUnsyncedCount();
  const [askOpen, setAskOpen] = useState(false);
  // The count the question shows. It is kept while the dialog animates closed, so the copy never reads "0 changes".
  const [askCount, setAskCount] = useState(0);

  // The queue drained while the question was open: nothing is left to discard, so close it. Adjusting state during
  // render, not in an effect, keeps the question from reopening by itself when a change queues later.
  if (askOpen && unsynced === 0) {
    setAskOpen(false);
  }

  // The count changed while the question was open.
  if (askOpen && unsynced > 0 && unsynced !== askCount) {
    setAskCount(unsynced);
  }

  function requestSignOut() {
    if (unsynced > 0) {
      setAskCount(unsynced);
      setAskOpen(true);
    } else {
      logout.mutate();
    }
  }

  function confirm() {
    logout.mutate();
  }

  return {
    requestSignOut,
    confirm,
    askOpen,
    setAskOpen,
    count: askCount,
    isPending: logout.isPending,
  };
}
