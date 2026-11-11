import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardViewStore } from "@/lib/stores/dashboardViewStore";

beforeEach(() => {
  localStorage.clear();
  useDashboardViewStore.setState({ categoryView: "list", accountsView: "list" });
});

describe("useDashboardViewStore", () => {
  it("defaults both sections to the list view", () => {
    expect(useDashboardViewStore.getState().categoryView).toBe("list");
    expect(useDashboardViewStore.getState().accountsView).toBe("list");
  });

  it("changes each section independently", () => {
    useDashboardViewStore.getState().setCategoryView("grid");

    expect(useDashboardViewStore.getState().categoryView).toBe("grid");
    expect(useDashboardViewStore.getState().accountsView).toBe("list");

    useDashboardViewStore.getState().setAccountsView("grid");

    expect(useDashboardViewStore.getState().accountsView).toBe("grid");
  });

  it("persists the chosen views", () => {
    useDashboardViewStore.getState().setCategoryView("grid");

    expect(JSON.parse(localStorage.getItem("tydee-dashboard-view") ?? "{}")).toMatchObject({
      state: { categoryView: "grid", accountsView: "list" },
    });
  });
});
