export const BASE_URL = "http://localhost:3100";
export const API_URL = "http://localhost:5100";

export const PASSWORD = "Password123!";

/**
 * Zustand persist writes `{ state, version }` JSON under the store name.
 * Pre-seeding the consent choice keeps the cookie banner from covering the
 * bottom navigation and the floating action buttons.
 */
export const consentStorageState = {
  cookies: [],
  origins: [
    {
      origin: BASE_URL,
      localStorage: [
        {
          name: "tydee-consent",
          value: JSON.stringify({ state: { choice: "all" }, version: 0 }),
        },
      ],
    },
  ],
};
