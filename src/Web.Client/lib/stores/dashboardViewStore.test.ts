import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardViewStore } from "@/lib/stores/dashboardViewStore";

beforeEach(() => {
  localStorage.clear();
  useDashboardViewStore.setState({
    categoryView: "list",
    accountsView: "list",
    activityView: "list",
  });
});

describe("useDashboardViewStore", () => {
  it("defaults every section to the list view", () => {
    expect(useDashboardViewStore.getState().categoryView).toBe("list");
    expect(useDashboardViewStore.getState().accountsView).toBe("list");
    expect(useDashboardViewStore.getState().activityView).toBe("list");
  });

  it("changes each section independently", () => {
    useDashboardViewStore.getState().setCategoryView("grid");

    expect(useDashboardViewStore.getState().categoryView).toBe("grid");
    expect(useDashboardViewStore.getState().accountsView).toBe("list");

    useDashboardViewStore.getState().setAccountsView("grid");

    expect(useDashboardViewStore.getState().accountsView).toBe("grid");
    expect(useDashboardViewStore.getState().activityView).toBe("list");
  });

  it("persists the chosen views, including recent activity", () => {
    useDashboardViewStore.getState().setCategoryView("grid");
    useDashboardViewStore.getState().setActivityView("grid");

    expect(JSON.parse(localStorage.getItem("tydee-dashboard-view") ?? "{}")).toMatchObject({
      state: { categoryView: "grid", accountsView: "list", activityView: "grid" },
    });
  });
});
