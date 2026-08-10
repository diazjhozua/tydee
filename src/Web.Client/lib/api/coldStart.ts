import { toast } from "sonner";
import { ProblemDetails } from "@/lib/types/api";

// Azure's free tier unloads the API after ~20 min idle. The first request
// after that fails while the container boots (~20-30s), so callers retry
// once and tell the user what's happening instead of showing a crash.

export const WAKE_UP_PROBLEM: ProblemDetails = {
  title: "ServiceUnavailable",
  detail: "The server is waking up. Please try again in a moment.",
};

const TOAST_ID = "server-wake-up";

export function showWakeUpNotice() {
  toast.loading("Waking up the server — this can take ~20 seconds on the free tier.", {
    id: TOAST_ID,
  });
}

export function dismissWakeUpNotice() {
  toast.dismiss(TOAST_ID);
}

export function coldStartDelay() {
  return new Promise((resolve) => setTimeout(resolve, 3000));
}
