---
name: add-client-feature
description: Add a screen, sheet, dialog, or form to the Tydee Next client using the existing types, API, TanStack Query, and styling patterns. Use for UI work under src/Web.Client.
---

# Add a client feature

Match the accounts and home screens; read `src/Web.Client/CLAUDE.md` first.

## Steps

1. **Types** — extend or add `src/Web.Client/lib/types/<area>.ts`. Keep the wire shape identical to `src/Contracts`.
2. **API module** — add the call to `lib/api/<area>.ts`. Use `apiClient` for bearer-token calls; surface `ApiError.displayMessage` in the UI. Do not call `fetch` directly outside the auth BFF.
3. **TanStack hook** — add queries and mutations in `lib/hooks/use<Area>.ts`. Use a stable `queryKey`; invalidate the related money keys (`accounts`, `dashboard`, `expenses`, `incomes`) after mutations that change balances.
4. **UI** — build the screen under `app/(app)/<route>/page.tsx` and components under `components/<area>/`. Reuse `components/ui` and `AppShell`. Use `Sheet` for mobile entry forms and `Dialog` for confirmations. Reuse `components/expenses/ExpenseForm` rather than copying expense fields.
5. **Route** — add the page and a nav entry in `lib/navigation.ts` when it is a top-level destination. Both the phone bottom nav and the desktop sidebar read that list.
6. **Styling** — oklch tokens from `app/globals.css` only. No hex colors, no arbitrary color values. Use `Money` for all amounts and `hero-gradient` only for the spend hero and primary add action.
7. **Forms** — React Hook Form with the Zod resolver for auth and settings forms, matching `app/(auth)/login/page.tsx`. Entry sheets and the shared `ExpenseForm` use local state and chip controls; match the existing component instead of forcing RHF. Either way: explicit submit, inline errors, labels associated with inputs, focus ring preserved.
8. **Base UI** — components take a `render` prop instead of `asChild`; pass `nativeButton={false}` when rendering a link through `Button`.
9. **Tests** — colocated `*.test.tsx` next to the component, using React Testing Library. Cover validation, the happy path, and the empty/error state.
10. **Check** — run `npm --prefix src/Web.Client run typecheck`, `npm --prefix src/Web.Client run lint`, `npm --prefix src/Web.Client test`, and confirm no horizontal scroll at 375px.

## Rules

- Server data lives in PostgreSQL and is scoped by the authenticated user; the client persists only local UI state through Zustand (`authStore`, `balanceVisibilityStore`, `consentStore`, `dashboardViewStore`).
- TanStack Query persists paused mutations to localStorage for offline replay; new mutations that should replay offline need `setMutationDefaults` in `providers/QueryProvider.tsx`.
- A paused mutation still reports `isPending`. When a button should stay usable after an offline save, gate it on `isPending && !isPaused` (see `ExpenseForm`).
- Two forms can be mounted at once (a page form plus the edit sheet). Generate field ids with `useId` so labels keep pointing at their own input.
- Autofocus belongs in a sheet the user just opened, not on page load; a page-load focus opens the mobile keyboard over the content.
- Keep amounts as numbers end-to-end; format only through `lib/utils/currency.ts` or `Money`.
- Do not introduce a new styling system, state library, or fetch wrapper.
