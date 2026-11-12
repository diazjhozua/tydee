import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DashboardView = "list" | "grid";

type DashboardViewState = {
  categoryView: DashboardView;
  accountsView: DashboardView;
  activityView: DashboardView;
  setCategoryView: (view: DashboardView) => void;
  setAccountsView: (view: DashboardView) => void;
  setActivityView: (view: DashboardView) => void;
};

export const useDashboardViewStore = create<DashboardViewState>()(
  persist(
    (set) => ({
      categoryView: "list",
      accountsView: "list",
      activityView: "list",
      setCategoryView: (categoryView) => set({ categoryView }),
      setAccountsView: (accountsView) => set({ accountsView }),
      setActivityView: (activityView) => set({ activityView }),
    }),
    {
      name: "tydee-dashboard-view",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        categoryView: state.categoryView,
        accountsView: state.accountsView,
        activityView: state.activityView,
      }),
    },
  ),
);
