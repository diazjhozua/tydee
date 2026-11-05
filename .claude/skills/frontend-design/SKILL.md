---
name: frontend-design
description: Visual and interaction design for new or reshaped Tydee UI, inside the existing design system. Use when designing a screen, sheet, empty state, or layout, or when a UI change needs a design decision before code.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Adapted from the `frontend-design` plugin (Apache-2.0, see `LICENSE.txt`). The plugin's goal is a distinctive identity for a new brief; Tydee already has one, so the goal here is a design that is intentional and unmistakably part of the same product. Consistency wins over novelty. Read `src/Web.Client/CLAUDE.md` before designing.

## The existing system

Tydee is a calm, mobile-first money tracker: envelopes, a monthly spend hero, and bottom-sheet entry forms. It should feel quick and legible one-handed, not like a desktop dashboard.

- **Color** — oklch tokens in `src/Web.Client/app/globals.css` only: `background`, `foreground`, `card`, `popover`, `primary` / `primary-foreground` (emerald), `secondary`, `muted` / `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`. The `hero-gradient` utility is the single gradient; use it only for the monthly spend card and the primary add action. Never add hex values to components.
- **Type** — Inter (`font-sans`, also `font-heading`) for everything; Geist Mono only for code-like text. Use weight and size for hierarchy.
- **Shape** — the radius scale is large and soft (`radius` 1rem; `rounded-2xl` for cards, `rounded-3xl` for the hero, `rounded-xl` for inputs). Use the existing scale; do not mix in sharp corners.
- **Primitives** — `components/ui` (button, card, dialog, sheet, input, label, select, badge, skeleton, separator, dropdown-menu) and `components/layout/AppShell`. Compose these before writing new ones. Base UI components take a `render` prop instead of `asChild`.
- **Money** — always render amounts through `components/shared/Money` so tabular numerals and balance hiding stay consistent. Never hand-format currency.

If a design truly needs a new token, propose it as an addition to `globals.css` with its role and contrast ratio, and get approval first.

## Principles

- **Structure is information.** Borders, dividers, and labels must encode something. Do not decorate.
- **One hero per screen.** The spend summary or the primary action carries emphasis; everything around it stays quiet.
- **Motion answers actions.** Sheets, dialogs, saving, and syncing may animate to show what changed. Respect `prefers-reduced-motion`.
- **Thumb-first.** Primary actions sit within reach at 375px; destructive actions need a confirmation step.
- **Line length under ~80 characters** for prose.

Avoid generated-UI tells: identical rounded cards for everything, all-caps eyebrow labels, accenting a single word in a headline, `A · B · C` meta strings, `→` appended to buttons, gradient washes, and a monospace face for small labels.

## Process

1. **Brief** — state the screen's user, primary job, and the data it shows, using real Tydee content (accounts, income allocations, expenses, categories, balances).
2. **Plan** — which existing tokens and primitives it uses, a short layout description with an ASCII wireframe for desktop and 375px, the one element that carries emphasis, and the empty, loading, and error states.
3. **Check the plan** against the home and accounts screens. If any part looks like it came from a different product, or like a generic default, revise it and say what changed.
4. **Build** following the `add-client-feature` skill.
5. **Critique** — run the app (`npm --prefix src/Web.Client run dev` against the API) and screenshot desktop and 375px. Remove one thing that does not earn its place. Then hand off to `ui-reviewer`.

## Quality floor

Responsive to 375px with no horizontal scroll, visible `:focus-visible` ring, labels associated with inputs, Base UI dialogs and sheets that restore focus, keyboard reachable controls, and AA contrast.

## Writing

Words are design content. Write for the user, not the system: "Add expense", not "Submit transaction record".

- Active voice, sentence case, plain verbs. A button says what happens ("Save account", not "Submit"), and the confirmation uses the same verb ("Account saved").
- Errors say what went wrong and how to fix it, mapped from `ApiError.displayMessage`; they never apologize and never leak technical detail.
- Empty states invite the next action ("Add your first expense").
- Match the existing vocabulary: account, envelope, income, expense, transfer, adjustment, allocation, balance, setup.
