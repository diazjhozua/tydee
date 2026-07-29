import { create } from "zustand";

type AuthState = {
  accessToken: string | null;
  expiresAt: string | null;
  setTokens: (accessToken: string, expiresAt: string) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  expiresAt: null,
  setTokens: (accessToken, expiresAt) => set({ accessToken, expiresAt }),
  clear: () => set({ accessToken: null, expiresAt: null }),
  isAuthenticated: () => get().accessToken !== null,
}));
