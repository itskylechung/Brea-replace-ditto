# M2 Product Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship milestone M2 core (GitHub issues #46, #47) plus the #53 a11y follow-up: a Profile tab (self-view card + details + edit entry), a Requests unread badge fetched on app load, and a completed TagInput combobox ARIA pattern.

**Architecture:** Pure-frontend. Tasks 1–2 land sequentially on branch `feat/m2-product-surface` (both touch `DiscoveryApp` in `src/App.tsx`). Task 3 is independent (`TagInput.tsx` only) and ships on its own branch `feat/fe-14-combobox-aria` as a separate PR. Backend untouched.

**Tech Stack:** React 19 + TS + Tailwind (existing tokens), `@insforge/sdk` via existing `src/lib/api.ts` (`listConnectionInbox` already exists).

## Global Constraints

- Design system: DESIGN.md + neighboring idioms. Main-surface palette (canvas/ink/steel/hairline/cream) for the Profile tab; PersonCard's exact class strings where the spec says "PersonCard idiom" (its existing arbitrary values like `bg-[#edf7f1]` count as established idiom and may be reused verbatim; no NEW hex values).
- No changes under `insforge/`, `migrations/`, `.github/`; no new env vars; no new client events.
- Verification per task: `npm run typecheck && npm run lint && npm run build && npm run test` all pass (vitest 8/8 baseline).
- Commits: conventional prefix + ticket ref; body ends exactly with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- English copy, existing voice. Exact strings below are binding.

---

### Task 1: FE-10 — Profile tab: self-view card, details, edit entry (#46)

**Files:**
- Create: `src/components/ProfileView.tsx`
- Modify: `src/App.tsx` (DiscoveryApp view type, header nav, avatar click), `src/components/ProfileSetup.tsx` (one string)

**Interfaces:**
- Produces: `export function ProfileView({ profile, onEdit }: { profile: BreaProfile; onEdit: () => void }): JSX.Element` (React 19: `import { type JSX } from "react"` if needed).
- `DiscoveryView` type becomes `"discover" | "requests" | "profile"`.

**Spec (binding):**
1. Header nav gains a third button `Profile` after `Requests`, identical styling/`aria-current` pattern to the existing two.
2. The avatar/name header button now does `setView("profile")` (was: open edit form); its `aria-label` becomes `View your profile`.
3. `view === "profile"` renders `<ProfileView profile={profile} onEdit={() => setIsEditingProfile(true)} />` inside the same `mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16` wrapper used by the requests view.
4. `ProfileView` layout, top to bottom:
   - Section label (`text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep`): `Your profile`; heading (`mt-2 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl`): `How people find you`; intro (`mt-2 max-w-2xl text-sm leading-6 text-slate`), exact: `This is the card nearby members see when you appear in their search results. Exact location and email are never shown.`
   - **Self card** (max-w-xl), PersonCard idiom: `rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle sm:p-6`. Contents mirror PersonCard: 64px avatar with initials fallback (`bg-cream-deeper text-primary-deep` fallback, `referrerPolicy="no-referrer"` like the header avatar); name `text-lg font-medium text-ink`; headline `text-sm text-slate`; meta row `text-xs text-steel` showing `locationLabel` with the map-pin SVG (copy PersonCard's inline SVG) and, if `availability` set, the green-dot availability span; tag pills = first 6 of `[...skills, ...interests]` deduped, `rounded-full bg-cream-deeper px-2.5 py-1 text-xs font-medium text-slate`; `bio` in `mt-4 line-clamp-2 text-sm leading-5 text-steel` when set. NO distance, NO matchReason, NO Connect button.
   - **Status chips row** under the card (`mt-4 flex flex-wrap gap-2`): chip 1 `Shown in discovery` / `Hidden from discovery`; chip 2 `Open to requests` / `Not accepting requests`. On-state chip classes: `rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-medium text-success` (PersonCard idiom); off-state: `rounded-full bg-cream-light px-2.5 py-1 text-xs font-medium text-steel`.
   - **Details list** (`mt-8 max-w-xl`): `<dl>` rows separated by `divide-y divide-hairline-soft`, each row `py-3 grid grid-cols-[8rem_1fr] gap-3` with `dt` `text-xs font-semibold uppercase tracking-[0.1em] text-steel` and `dd` `text-sm text-ink`. Rows in order: `Headline`, `Bio`, `Skills` (chips as above, or fallback), `Interests` (chips, or fallback), `Availability`, `Location` (= `locationLabel`), `LinkedIn` (when set: `<a>` with `target="_blank" rel="noreferrer"` classed `text-primary-deep underline-offset-2 hover:underline`, text `Open profile ↗`; else fallback), `Private location` (exact text `Added ✓` in `text-success` when both coords set, else `Not added` — NEVER render coordinates). Fallback for any unset optional value: `Not added` in `text-muted`.
   - **Edit button** (`mt-8`): primary `rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`, exact text `Edit profile`, onClick `onEdit`.
5. `src/components/ProfileSetup.tsx`: change the editing-mode cancel button label `Back to discovery` → `Back to your profile` (entry point is now the Profile tab).
6. Editing save keeps existing behavior (`setIsEditingProfile(false)`), which now lands back on the Profile tab — verify by reading the state flow.

**Steps:**
- [ ] **Step 1:** Read src/App.tsx, src/components/PersonCard.tsx, src/components/ConnectionRequests.tsx (section header idiom), DESIGN.md.
- [ ] **Step 2:** Implement per spec.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build && npm run test` — all pass.
- [ ] **Step 4:** Commit: `feat: profile tab with self-view card and details (FE-10, #46)`

---

### Task 2: FE-11 — Requests unread badge on app load (#47)

**Files:**
- Modify: `src/App.tsx` (DiscoveryApp only)

**Interfaces:**
- Consumes: `listConnectionInbox()` from `src/lib/api.ts` (already exists; returns `{ incoming, outgoing }` of `ConnectionItem`s with `status: "pending" | "accepted" | "declined"`).
- Consumes Task 1's three-view nav (badge attaches to the `Requests` button).

**Spec (binding):**
1. State in `DiscoveryApp`: `const [pendingIncoming, setPendingIncoming] = useState<number | null>(null);` (null = unknown/failed → no badge).
2. Fetch once on mount (`useEffect` with cancelled-flag pattern copied from the file's existing effects): `listConnectionInbox()` → `setPendingIncoming(inbox.incoming.filter((item) => item.status === "pending").length)`. On error: leave `null` — the badge is silent, never an error surface.
3. Refresh policy: when `view` changes FROM `"requests"` to any other view, refetch once (same effect, keyed on `view`, tracking previous view via a ref) — so acting on requests updates the count without polling.
4. Badge render on the Requests nav button, after the text, only when `pendingIncoming !== null && pendingIncoming > 0`: `<span>` classed `ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white` showing the count, capped display at `9+` for counts above 9. The badge element is `aria-hidden="true"`; instead set the button's `aria-label` to `` `Requests, ${pendingIncoming} pending` `` when the badge shows (no aria-label otherwise).
5. No other UI changes; ConnectionRequests keeps its own independent fetch.

**Steps:**
- [ ] **Step 1:** Read DiscoveryApp's existing effects and nav (post-Task-1 state).
- [ ] **Step 2:** Implement per spec.
- [ ] **Step 3:** Full verification — all pass.
- [ ] **Step 4:** Commit: `feat: requests tab unread badge fetched on app load (FE-11, #47)`

---

### Task 3: FE-14 — Complete the TagInput combobox ARIA pattern (#53) — SEPARATE BRANCH

**Files:**
- Modify: `src/components/TagInput.tsx` only

**Spec (binding):**
1. Implement the full APG combobox pattern (keep `role="combobox"`):
   - The suggestions `<ul>` gets `role="listbox"` and keeps its `id` (referenced by `aria-controls`); each suggestion becomes `<li role="option">` with a stable `id` (`` `${id}-option-${index}` ``) and `aria-selected` reflecting the active option. Selection still commits on `onMouseDown`.
   - Input gains keyboard navigation: `ArrowDown` opens the dropdown (if closed, with current matches) and moves the active index down; `ArrowUp` moves up (wrapping); `Escape` closes the dropdown (and only if closed, clears nothing else); `Enter` selects the active option when one is active, otherwise keeps the existing commit-typed-text behavior; `preventDefault` on handled keys.
   - Input `aria-activedescendant` points at the active option's id while open and active; removed otherwise. Active option gets a visual highlight class `bg-cream/70` (matching the existing hover class).
   - Active index resets when the query or matches change; mouse hover over an option sets it active (so keyboard/mouse states never disagree).
2. `aria-expanded` continues to reflect open state; `aria-controls` may remain conditional on the list being rendered (APG-compliant) — implementer's choice, but the reference must never dangle while open.
3. No behavior change to chips, dedupe, maxTags, comma/Enter commits, or Backspace removal. No visual redesign — only the highlight class addition.

**Steps:**
- [ ] **Step 1:** Read TagInput.tsx.
- [ ] **Step 2:** Implement per spec.
- [ ] **Step 3:** Full verification — all pass (vitest 8/8; the logic module is untouched).
- [ ] **Step 4:** Commit: `fix: complete TagInput combobox ARIA pattern with keyboard navigation (FE-14, #53)`
