"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's md breakpoint so JS-driven layout choices line up with
// the md: classes. The server snapshot is false (phone layout), which is what
// first paint shows before hydration.
const QUERY = "(min-width: 768px)";

function hasMatchMedia() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void) {
  if (!hasMatchMedia()) {
    return () => {};
  }
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return hasMatchMedia() && window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMdUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
