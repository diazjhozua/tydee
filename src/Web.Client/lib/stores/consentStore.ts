import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ConsentChoice = "all" | "necessary";

type ConsentState = {
  choice: ConsentChoice | undefined;
  setChoice: (choice: ConsentChoice) => void;
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      choice: undefined,
      setChoice: (choice) => set({ choice }),
    }),
    {
      name: "tydee-consent",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ choice: state.choice }),
    },
  ),
);