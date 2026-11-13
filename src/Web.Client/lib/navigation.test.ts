import { describe, expect, it } from "vitest";
import { primaryNav, primaryNavFor } from "@/lib/navigation";

const hrefs = (items: { href: string }[]) => items.map((item) => item.href);

describe("primaryNavFor", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["Home", "Home" as const],
  ])("keeps Home first when the default page is %s", (_label, defaultPage) => {
    expect(hrefs(primaryNavFor(defaultPage))).toEqual(["/app", "/log-expense", "/accounts", "/recurring"]);
  });

  it("moves Log expense to the front and swaps only Home and Log", () => {
    const ordered = primaryNavFor("LogExpense");

    expect(hrefs(ordered)).toEqual(["/log-expense", "/app", "/accounts", "/recurring"]);
  });

  it("keeps labels and icons attached to their items", () => {
    const ordered = primaryNavFor("LogExpense");

    expect(ordered.map((item) => item.label)).toEqual(["Log", "Home", "Accounts", "Saved"]);
    expect(ordered[0].icon).toBe(primaryNav[1].icon);
  });

  it("does not mutate primaryNav", () => {
    primaryNavFor("LogExpense");

    expect(hrefs(primaryNav)).toEqual(["/app", "/log-expense", "/accounts", "/recurring"]);
  });
});
