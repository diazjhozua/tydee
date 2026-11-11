import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DashboardView = "list" | "grid";

type DashboardViewState = {
  categoryView: DashboardView;
  accountsView: DashboardView;
  setCategoryView: (view: DashboardView) => void;
  setAccountsView: (view: DashboardView) => void;
};

export const useDashboardViewStore = create<DashboardViewState>()(
  persist(
    (set) => ({
      categoryView: "list",
      accountsView: "list",
      setCategoryView: (categoryView) => set({ categoryView }),
      setAccountsView: (accountsView) => set({ accountsView }),
    }),
    {
      name: "tydee-dashboard-view",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        categoryView: state.categoryView,
        accountsView: state.accountsView,
      }),
    },
  ),
);
