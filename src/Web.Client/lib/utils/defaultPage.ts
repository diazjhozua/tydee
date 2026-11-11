import { DefaultPage } from "@/lib/types/me";

export const DEFAULT_PAGE_OPTIONS = [
  {
    value: "Home",
    label: "Home",
    description: "Your monthly spend, envelopes, and recent activity.",
    href: "/app",
  },
  {
    value: "LogExpense",
    label: "Log expense",
    description: "The expense form and everything you logged today.",
    href: "/log-expense",
  },
] as const satisfies ReadonlyArray<{
  value: DefaultPage;
  label: string;
  description: string;
  href: string;
}>;

export function defaultPagePath(defaultPage: DefaultPage | null | undefined): string {
  return defaultPage === "LogExpense" ? "/log-expense" : "/app";
}

/**
 * Only same-origin relative paths are safe to send a user to. The proxy writes
 * `next` itself, but a hand-crafted `/login?next=...` must not become an open
 * redirect.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  return next === "/" ? null : next;
}
