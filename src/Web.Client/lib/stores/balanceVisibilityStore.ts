import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BalanceVisibilityState = {
  hideBalances: boolean;
  toggle: () => void;
  setHidden: (value: boolean) => void;
};

export const useBalanceVisibilityStore = create<BalanceVisibilityState>()(
  persist(
    (set) => ({
      hideBalances: false,
      toggle: () => set((state) => ({ hideBalances: !state.hideBalances })),
      setHidden: (value) => set({ hideBalances: value }),
    }),
    {
      name: "tydee-balance-visibility",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hideBalances: state.hideBalances }),
    },
  ),
);