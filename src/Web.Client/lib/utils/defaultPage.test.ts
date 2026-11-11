import { describe, expect, it } from "vitest";
import { defaultPagePath, safeNextPath } from "@/lib/utils/defaultPage";

describe("defaultPagePath", () => {
  it("sends LogExpense to the log page", () => {
    expect(defaultPagePath("LogExpense")).toBe("/log-expense");
  });

  it("sends Home and unset preferences to the dashboard", () => {
    expect(defaultPagePath("Home")).toBe("/app");
    expect(defaultPagePath(null)).toBe("/app");
    expect(defaultPagePath(undefined)).toBe("/app");
  });
});

describe("safeNextPath", () => {
  it("accepts a same-origin path", () => {
    expect(safeNextPath("/accounts")).toBe("/accounts");
    expect(safeNextPath("/recurring/abc?tab=1")).toBe("/recurring/abc?tab=1");
  });

  it("rejects empty, root, absolute, protocol-relative, and backslash paths", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("/")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
  });
});
