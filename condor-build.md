# Condor Fitness — Build Log

Owned by Claude Code. Updated after every commit.
See condor_workflow.txt for the spec update protocol.

---

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Scaffold + Screen 1 (Setup) | ✅ Complete |
| Phase 2 | Screen 2 (Pre-Workout Prompt) | ✅ Complete |
| Phase 3 | Screen 3 (Active Workout) | ✅ Complete |
| Phase 4 | Screen 4 (End of Session Summary) | ✅ Complete |
| Phase 5 | GitHub API session write | ✅ Complete |
| Fix: Calf rating scale 0–10 | Screen 4 calf widget + JSON | ✅ Complete |
| Fix: Dynamic skill ratings | Screen 4 grip/shoulder/monkey visibility | ✅ Complete |
| Build 2 Phase 1 | Training Dashboard (dashboard.html) | ✅ Complete |
| Dashboard Task A | Structural redesign — section order, timeline, milestones | ✅ Complete |
| Dashboard Task B | Polish and data fixes — countdown, timeline scroll, sticky column, HTML entity bug, Week 10 calf gate | ✅ Complete |
| Dashboard Task C | Fix Operation Spartan phase session count — two-source completed count, correct remaining | ✅ Complete |
| Dashboard Task D | Countdown banner label — replace phase name/dates with upcoming milestone label | ✅ Complete |
| Dashboard Prompt 3 | Training Log scroll fix + Run Progression consolidation | ✅ Complete |
| Cross-Device Sync | lastCompleted from session files + Skill Trends gate fix | ✅ Complete |
| Cross-Device Sync (Part 2) | sessionMap gate + localStorage sync + Training Log token gates | ✅ Complete |

---

## Completed Tasks

### Cross-Device Sync Fix — Part 2 (remaining Training Log gates)
**Branch:** `claude/fix-cross-device-sync-zVeTa`
**Date:** 2026-04-14

#### What changed:

**dashboard.html — sessionMap now built unconditionally:**
- Removed `if (hasToken)` gate around the `sessionMap` population loop in `renderTrainingLog`.
- Previously, even though sessions were fetched on all devices (Part 1 fix), the map that drives "logged" row state was only built when the device had a local token. Token-less devices therefore showed all rows as future/skipped regardless of session data.
- Now every fetched non-bonus session is inserted into `sessionMap` on all devices.

**dashboard.html — Training Log no-token notice gated on empty sessions:**
- Changed `if (!hasToken)` to `if (!hasToken && !sessions.length)` for the "Connect the companion app" notice.
- A token-less desktop that can read public session files will no longer see the notice.

**dashboard.html — Logged-row feel/calf display no longer gated on hasToken:**
- Changed `else if (isLogged && hasToken && session)` to `else if (isLogged && session)`.
- Feel dots and calf rating now render for any logged row regardless of which device holds the token.

**dashboard.html — init() updates localStorage.lastCompleted when session files show more progress:**
- After `resolveLastCompleted(sessions)` runs, compare `resolvedLc` to the current localStorage value.
- If `resolvedLc` is further ahead (higher week, or same week higher day), write it back to `localStorage.lastCompleted`.
- This ensures the next page load on this device starts with the correct pointer even if `sessionsCache` has not yet expired — the stale cache won't mask the furthest completed day because the pointer is already persisted.

#### Spec Deviations

1. **Training Log renders logged rows and feel/calf data on token-less devices.**
   The original spec says sessions-dependent sections show a friendly notice when no token is present. Now if session files are publicly readable (which they are — public repo), the Training Log renders full logged state including feel dots and calf rating without a local token.

#### Discovered Conventions

- The `sessionMap` gate on `hasToken` was a latent bug introduced in the original Training Log implementation that survived the Part 1 cross-device sync fix. Removing it was the primary reason `resolveLastCompleted` "didn't take effect" — the NEXT pointer was correct but logged rows still appeared as skipped/future.

---

### Cross-Device Sync Fix + Skill Trends Gate
**Branch:** `claude/fix-cross-device-sync-ygNo1`
**Date:** 2026-04-14

#### What changed:

**dashboard.html — `fetchSessions` now works without a token:**
- Changed `var headers = { 'Authorization': 'token ' + token }` to `var headers = token ? { 'Authorization': 'token ' + token } : {}`.
- The sessions/ folder is in a public repo so GitHub Contents API works without auth (60 req/hr per IP).
- `fetchSessions(token, repo)` is now always called in `init()` regardless of `hasToken` (previously gated with `hasToken ? fetchSessions(...) : Promise.resolve(null)`).
- This means a desktop device with no localStorage token can still fetch session files written by a mobile device.

**dashboard.html — `resolveLastCompleted(sessions)` helper added:**
- New module-level function placed before `renderTrainingLog`.
- Reads `lastCompleted` from localStorage (current device pointer).
- Scans all non-bonus session files for the furthest week/day (all-device pointer from GitHub).
- Returns whichever source indicates more progress: higher week wins; tie on week → higher day wins.
- Returns null if both sources are null.

**dashboard.html — `renderTrainingLog` updated:**
- Signature changed from `renderTrainingLog(prog, sessions, hasToken)` to `renderTrainingLog(prog, sessions, hasToken, resolvedLc)`.
- Removed internal localStorage read for `lastCompleted`; uses `resolvedLc` parameter instead.
- Covers both the "next" pointer computation and auto-scroll target.

**dashboard.html — `renderTimeline` / `buildMiniPhaseTimeline` updated:**
- `renderTimeline` signature changed to accept `resolvedLc` parameter.
- `buildMiniPhaseTimeline` (closure inside `renderTimeline`) replaced `JSON.parse(localStorage.getItem('lastCompleted') || 'null')` with `resolvedLc !== undefined ? resolvedLc : null`.
- Phase session completed/remaining counts now reflect all-device progress.

**dashboard.html — `renderSkillTrends` token gate fixed:**
- Changed gate from `if (!hasToken)` to `if (!hasToken && !sessions.length)`.
- Skill Trends now renders whenever session files are available, regardless of which device originally set the GitHub token.
- A device with no local token but with publicly-readable session files (via cross-device fetch) will render the section with live data.

**dashboard.html — `init()` wired together:**
- Calls `resolveLastCompleted(sessions)` after fetching to produce `resolvedLc`.
- Passes `resolvedLc` to `renderTimeline(...)` and `renderTrainingLog(...)`.

#### Spec Deviations

1. **Sessions fetched on all devices, not just token-holding devices.**
   The original design fetched sessions only when `hasToken`. Now sessions are always attempted via public GitHub Contents API. No token → no auth header → lower rate limit (60/hr IP) but fully functional for reading.

2. **Skill Trends renders from session data on token-less devices.**
   Previously gated entirely on `hasToken`. Now renders whenever sessions are non-empty. On a desktop with no token but with session files from mobile, Skill Trends will display.

#### Discovered Conventions

- GitHub Contents API (`/repos/{owner}/{repo}/contents/{path}`) works for public repos without an Authorization header. `download_url` values on individual files are raw.githubusercontent.com links, also public. No additional change needed for per-file fetches.
- Sessions cache TTL (1hr) does not cause stale no-data on first load on a new device — cache is absent, so a fresh fetch always occurs.

---

### Prompt 3 — Training Log scroll fix + Run Progression consolidation
**Branch:** `claude/fix-dashboard-autoscroll-Sv9EC`
**Date:** 2026-03-29

#### What changed:

**dashboard.html — Auto-scroll fix:**
- Removed `setTimeout(..., 80)` from inside `renderTrainingLog`.
- `renderTrainingLog` now returns the NEXT row DOM element (or last row if program complete, or null).
- In `init()`, scroll fires after all render functions complete: `setTimeout(..., 150)` on the returned element.
- 150ms delay ensures browser layout is fully painted after all sections render.

**dashboard.html — Run Progression removed:**
- Deleted the `<!-- 6: Run Progression -->` section HTML div (`id="sec-run-body"`).
- Deleted `renderRunProgression()` function entirely.
- Removed `renderRunProgression()` call from `init()`.
- Removed all run-table CSS: `.run-table-wrap`, `.run-table`, `.run-wk`, `.run-phase-tag`, `.run-done`, `.current-week` (run table context).

**dashboard.html — Run protocol + calf gate inline on Day 2 rows:**
- For every Training Log row where `day.day === 2` (Run + Grip day), a second sub-line is appended in `tl-row-left`.
- Format: `[run_protocol] · [calf_gate]` (calf_gate HTML entities decoded via `decodeHtml()`).
- Styled as `.tl-log-sub` with `margin-top: 4px` to separate from exercise preview line.
- Applies to all states: logged, next, future, skipped.

**dashboard.html — Section comments updated:**
- `<!-- 7: Training Log -->` updated to `<!-- 6: Training Log -->`.
- `// ---- Section 7: Training Log ----` updated to `// ---- Section 6: Training Log ----`.
- `// ---- Section 7: Training Timeline ----` updated to `// ---- Section 2: Training Timeline ----`.

#### Spec Deviations

1. **Run Progression section removed.**
   Spec (Section 6) describes a standalone Run Progression table. This section is removed entirely. Run protocol and calf gate are now shown inline on Day 2 Training Log rows.

2. **Run protocol and calf gate now inline on Day 2 Training Log rows.**
   Not described in the spec. Applies to all row states (logged, next, future, skipped).

3. **Section count reduced from 7 to 6.**
   Dashboard now has 6 sections: Race Countdown, Training Timeline, Body Weight, PR Board, Skill Trends, Training Log.

4. **Auto-scroll moved to post-render init() call.**
   Scroll was previously inside `renderTrainingLog` with 80ms delay. Now fires at 150ms after all render functions complete in `init()`.

---

### Prompt 2 — Training Log (replaces Recent Sessions in dashboard.html)
**Branch:** `claude/update-program-json-display-WaCi0`
**Date:** 2026-03-29

#### What changed:

**dashboard.html — Section 7 HTML:**
- Section heading changed from "Recent Sessions" to "Training Log". `id="sec-sessions-body"` retained.

**dashboard.html — CSS additions:**
- Added `.tl-week-header`, `.tl-week-title`, `.tl-phase-pill-sm` (+ `.active`, `.completed` modifiers) for week separator rows.
- Added `.tl-log-row` base + state modifiers: `.tl-log-row-logged`, `.tl-log-row-skipped`, `.tl-log-row-next`, `.tl-log-row-future`.
- Added `.tl-row-header`, `.tl-row-left`, `.tl-row-right`, `.tl-row-label`, `.tl-row-date`, `.tl-log-sub` for row layout.
- Added `.tl-next-badge` for the "NEXT" accent badge.
- Added `.tl-log-detail` for expanded session detail container.
- No existing CSS removed.

**dashboard.html — JS:**
- Replaced `renderRecentSessions(sessions, hasToken)` with `renderTrainingLog(prog, sessions, hasToken)`.
- `feelDots()` helper moved up to a shared section (was inside the old function; now at module level).
- `renderTrainingLog` logic:
  - Reads `lastCompleted` from localStorage to determine next upcoming day.
  - Iterates all `prog.weeks` and their `days[]` in order (32 rows total across weeks 3–10).
  - Emits a week header row before each week showing "Week N — dates" and a phase pill.
  - Phase pill class: `active` (current phase via `getActivePhase`), `completed` (all weeks past currentWeek), `future` otherwise.
  - Each day row classified as: `logged` (non-bonus session file exists for that week/day), `next` (first non-completed upcoming day), `past+skipped` (before next, no session), `future` (after next).
  - Logged rows: show date, feel dots, calf rating; expandable tap to reveal session detail. Expand/collapse with single-open-at-a-time behavior.
  - Next row: left accent border + "NEXT" badge; exercise sub-line (first 3 names, skip "Scapular", join with ·, truncate with … if >3).
  - Future rows: opacity 0.65, exercise sub-line only.
  - Skipped rows: opacity 0.45, label only.
  - Session detail HTML: identical structure to old renderRecentSessions expand view (exercises with sets, skills, notes). Handles `rounds_completed` format from new finisher_circuit sessions.
  - No-token state: shows notice banner above list; all rows render in future/preview style.
  - Auto-scroll: `scrollIntoView` on the NEXT row after 80ms timeout. Falls back to last row if program complete.
- `init()` call updated: `renderRecentSessions(sessions, hasToken)` → `renderTrainingLog(prog, sessions, hasToken)`.

#### Spec Deviations

1. **Recent Sessions replaced by Training Log.**
   The spec (Section 7 — Recent Sessions) describes last 10 sessions newest first. The Training Log replaces this entirely: it shows all 32 program days in chronological order grouped by week. No "last 10" limit. Order is oldest-first (Week 3 top → Week 10 bottom).

2. **Training Log auto-scrolls to next workout.**
   Not described in the spec. On page load the Training Log scrolls the NEXT row into the center of the viewport. This makes the section immediately useful without manual scrolling.

---

### Prompt 1 — program.json Updates + index.html Display Fixes
**Branch:** `claude/update-program-json-display-WaCi0`
**Date:** 2026-03-29

#### What changed:

**program.json — A1: Pull-Up Superset split (Week 4, 5, 7 Day 1)**
- Replaced the single "Pull-Up Superset" block (Pull-Ups + Row + Press) with two sequential entries in each day:
  1. Standalone Pull-Ups (5×5) with note "Comfortable range. No forced extension."
  2. "Row/Press Superset" (`superset: true, rounds: 3`) containing only Chest-Supported Row and Incline DB Press.
- Week 4: Row 65 lbs, Press 65 lbs
- Week 5: Row 67 lbs, Press 65 lbs
- Week 7: Row 70 lbs, Press 67 lbs
- Week 6 Day 1 already has these as separate entries — not changed.
- Week 3 Day 1 is completed — not changed.

**program.json — A2: Farmer Carry weight update**
- Week 4 Day 1 Grip Finisher: Farmer Carry target_weight_lbs 92 → 97 lbs.

**program.json — A3: Grip Finisher restructured as finisher_circuit**
- All Grip Finisher blocks in Weeks 3–7 (Day 1 and Day 4 where present) now use `"type": "finisher_circuit"` with a `"rounds"` field and the `"note"` field describing the no-rest-within-round rule.
- `"finisher": true` and `"type": "finisher"` flags removed from these blocks.
- `"sets"` removed from individual exercises within finishers (rounds drive repetition count).
- Per-week weights and reps per spec: Week 3 Day 1 (3r, PU20, FC97), Week 4 Day 1 (3r, PU20, FC97), Week 4 Day 4 (3r, PU20, FC97, DH20), Week 5 Day 1 (3r, PU25, FC97, DH25), Week 5 Day 4 (3r, PU20, FC92, DH25, MB1), Week 6 Day 1 (2r deload, PU20, FC88), Week 6 Day 4 (3r, PU25, FC92, DH30, MB2), Week 7 Day 1 (3r, PU25, FC95, DH30), Week 7 Day 4 (3r, PU25, FC95, DH35, MB2).
- JSON validated with `python3 -m json.tool`.

**index.html — B1: renderCards dispatch updated**
- Added `ex.type === 'finisher_circuit'` → `buildFinisherCircuitCard` before the existing `ex.finisher || ex.type === 'finisher'` branch.

**index.html — B2: buildFinisherCircuitCard added**
- New card builder modeled on `buildCircuitCard`.
- Subtitle: "[N] rounds · No rest within round"
- Body: exercise reference list (name + reps/duration/weight) + optional note line + one "Complete round N" button per round.
- Last round completion marks card complete and advances.
- No rest timer (restSec = 0, matching grip_finisher default).

**index.html — B3: buildSupersetCard subtitle updated**
- If `ex.rounds` is present, subtitle shows "[N] rounds · [ExName1 + ExName2]" (first word of each exercise name).
- Otherwise falls back to "Superset · N exercises".

**index.html — B4: Auto-save / session restore**
- `saveProgressToStorage()` added: writes `{ week, day, savedAt, completed[] }` to localStorage key `workoutProgress` after every set check / round tap.
- `onSetChecked()` now calls `saveProgressToStorage()` before starting rest timer.
- `initWorkout()` checks `workoutProgress` after rendering cards. If week+day match and savedAt < 4 hours old and any card is completed: shows a "Session in progress restored. [Clear]" banner above the cards and replays completed cards via `markCardComplete`. Reveals Finish Workout button.
- Clear button removes the banner and clears localStorage key.
- Refresh button confirm: clears `workoutProgress` before routing to preworkout.
- Save success (Screen 4): clears `workoutProgress` after successful GitHub write.
- `updateSkillVisibility` and `collectSessionExercises` updated to handle `finisher_circuit` type (grip shown; rounds_completed tracked).

#### Spec Deviations

1. **Pull-Up Superset split into two blocks.**
   The spec (Screen 3, Superset Card) describes the Pull-Up Superset as a single superset entry. Per this prompt, it is split: Pull-Ups becomes a standalone strength card and the Row+Press become "Row/Press Superset". The spec should be updated to reflect this structure.

2. **Grip Finisher now uses `finisher_circuit` type with round buttons.**
   The spec (Screen 3, Finisher Card) describes the Grip Finisher as a flat checklist with per-exercise checkboxes. The new `finisher_circuit` type renders it as a round-based circuit (same UI as Circuit card). The spec should document `finisher_circuit` as a new card type.

3. **Auto-save / session restore is a new feature not currently in spec.**
   The spec has no auto-save behavior. The implementation stores only completion state (not input values) in localStorage and restores completed cards only. Partial-set restoration is not attempted. The spec should document `workoutProgress` as a new localStorage key with its schema and 4-hour TTL.

---

### Phase 1 — Scaffold and Setup Screen
**Branch:** `claude/setup-screen-scaffold-EjE4G`
**Date:** 2026-03-27

Built `index.html` as a single-file vanilla HTML/CSS/JS app.

#### What was built:
- Full CSS with all design tokens (colors, typography, touch targets, borders)
- Layout styles (screen, card, set rows)
- Card styles (`.card`, `.card.active`, `.card-header`, `.card-body`)
- Form element styles (`.form-input`, `.form-select`, `.form-row`, `.form-hint`)
- Button styles (`.btn-primary`, `.btn-secondary`, `.btn-success`)
- Rating widget CSS: 1–5 tap-to-select (`.rating-5`) and calf 0–3 in 0.5 steps (`.rating-calf`)
- Rest timer overlay CSS (full-screen, 96px countdown, semi-opaque dark background)
- Workout header, set row, and alert styles
- `showScreen(id)` — screen router function
- Screen 1 (First Run Setup) — fully functional:
  - GitHub token field (password input)
  - Repo field (pre-filled "JoelColeman/condor-fitness")
  - Last completed dropdowns: Week 3–10 / Day 1–4 (default Week 3, Day 1)
  - Validation: token required, repo must contain "/"
  - On save: writes `githubToken`, `githubRepo`, `lastCompleted` to localStorage, routes to Screen 2
- Screen 2 shell — container div only, no logic
- Rest timer overlay HTML structure (used in Phase 3)
- `init()` — reads `githubToken` from localStorage; routes to Screen 1 if absent, Screen 2 if present

### Phase 2 — Pre-Workout Prompt (Screen 2)
**Branch:** `claude/build-screen-2-workout-USvDL`
**Date:** 2026-03-27

#### What was built:
- `getProgram()` — fetches `program.json` from raw GitHub URL; caches in `programCache` localStorage with timestamp; re-fetches if older than 24 hours or on manual retry
- `nextWorkout(prog, lastCompleted)` — sequential pointer logic: finds next day in current week, advances to next week day 1 when week is exhausted, returns null when program is complete
- `getPhaseInfo(prog, phaseId)` — looks up phase label and date range from `program.meta.phases`
- `getRandomBonusAlt(prog, phaseId, type)` — collects all alternates of a given type from the current phase across all weeks; returns a random pick
- Screen 2 sub-panel system (six panels controlled by `showPanel(id)`):
  - `pw-panel-loading` — spinner shown while program.json fetches
  - `pw-panel-error` — shows fetch error + Retry button (clears cache and re-fetches)
  - `pw-panel-complete` — shown when `nextWorkout()` returns null
  - `pw-panel-main` — "Next up" label, "Week X Day Y — Label", phase + date range, three buttons
  - `pw-panel-alternates` — lists alternates for the next workout day; each tappable; shows message if none exist
  - `pw-panel-bonus` — 2×2 grid of type buttons (Strength / Run / Engine / Circuit); picks random alt; shows error if none in phase
- `window.pendingWorkout` — set on any "proceed" action; carries `{ weekData, dayData, alt, altUsed, isBonus }` for Screen 3 to consume
- Screen 3 shell added (`screen-workout`) — empty container, ready for Phase 3
- `init()` updated to call `window.initPreworkout()` after routing to Screen 2
- Setup save handler updated to call `window.initPreworkout()` after first-run save

### Phase 3 — Active Workout Screen (Screen 3)
**Branch:** `claude/active-workout-screen-pjFNf`
**Date:** 2026-03-27

#### What was built:
- Screen 3 HTML (`screen-workout`): workout header (title + elapsed timer + refresh button), `#wo-cards` container, `#wo-finish-wrap` with Finish Workout button
- `showScreen` updated to call `window.initWorkout()` when routing to `'workout'`
- Screen 3 IIFE (`window.initWorkout`): reads `window.pendingWorkout`, pulls `restDefaults` from cached `programCache`, renders cards, starts elapsed timer
- `esc()` HTML escape helper
- `addHeaderToggle()` shared card header click handler (expand/collapse)
- `expandCard(idx)` — collapses all cards, expands target, smooth scroll into view
- `advanceCard()` — finds next uncompleted card after current; collapses all if none
- `markCardComplete(idx)` — sets `completed = true`, shows green ✓ in card header
- `onSetChecked(cardIdx, restSec)` — reveals Finish Workout button on first call, starts rest timer
- `startRest(sec)` / `dismissRest()` — rest timer overlay with countdown; tap overlay or Skip to dismiss
- Card builders:
  - `buildStrengthCard` — weight + reps inputs per set, rest timer on check
  - `buildTimedCard` — duration input per set (carries, hangs), rest timer on check
  - `buildRunCard` — interval checkboxes per round + "Mark all complete" button, no rest timer
  - `buildCircuitCard` — exercise reference list + "Complete round N" buttons, circuit rest timer
  - `buildFinisherCard` — sub-exercise section labels + set checkboxes, no rest timer
  - `buildSupersetCard` — sub-exercise sections with weight+reps or duration inputs, rest timer
  - `buildCardioCard` — single "Mark complete" checkbox, no rest timer
  - `buildRehabCard` — per-sub-exercise "Done" checkboxes, no rest timer
- `renderCards(exercises, dayData)` — dispatches to correct builder by exercise type flags; shows calf note if present
- Refresh button: `confirm()` dialog before routing back to pre-workout
- Finish Workout button: stops elapsed timer, sets `window.workoutElapsedSec`, routes to `screen-summary` (Screen 4 — not yet built)
- CSS additions: `.interval-row`, `.btn-round-done`, `.card-section-lbl`

---

### Phase 4 — End of Session Summary (Screen 4)
**Branch:** `claude/condor-fitness-phases-4-5-L89la`
**Date:** 2026-03-27

#### What was built:
- `screen-summary` HTML: two sub-panels (`sum-panel-form` and `sum-panel-success`)
- **Form panel** contains: workout label + duration header, Overall Feel (1–5, required), Calf Rating (0–3 in 0.5 steps), Grip Endurance (1–5), Shoulder Stability (1–5), Monkey Bars (1–5), Notes textarea, Save Session button, Copy JSON button (hidden until write failure), inline error div
- All rating widgets use existing `.rating-5` and `.rating-calf` CSS classes with static radio input + label pairs
- New CSS: `textarea.form-input` override, `.sum-icon-success`, `.sum-success-title`, `.sum-next-label`, `.sum-next-value`, `.sum-workout-meta`
- `showScreen` updated to call `window.initSummary()` when routing to `'summary'`
- `window.initSummary()` — resets all radios, clears textarea, shows form panel, renders workout label and elapsed time from `window.workoutElapsedSec` / `window.pendingWorkout`

### Calf Rating + Dynamic Skills Fix
**Branch:** `claude/calf-skills-fix-mK7wP`
**Date:** 2026-03-27

#### What was built:
- **Calf rating widget:** Changed from 0–3 in 0.5 steps (7 buttons) to 0–10 in whole numbers (11 buttons). CSS `min-width` reduced from 38px to 28px so all 11 buttons fit in one row on a 480px screen. Label updated with "(0 = none, >2 = flag)" hint.
- **Dynamic skill ratings:** Grip Endurance, Shoulder Stability, and Monkey Bars fields now start hidden and are shown/hidden by `updateSkillVisibility(exercises)` called from `initSummary()`.
  - Grip: shown if any exercise has `type: "finisher"`, `ex.finisher`, or name contains "farmer"/"carry"
  - Shoulder: shown if any exercise has `type: "timed"` or name contains "pull-up"/"row"
  - Monkey Bars: shown if any exercise name contains "monkey"
- **`skillVisibility` module variable:** Tracks which skill fields are visible at save time; used by `assembleSession()` to conditionally include skill keys in the JSON.
- **Session JSON:** `skills` object now only contains keys for ratings that were both shown AND filled in. Hidden fields are omitted entirely (not written as null). Empty `skills: {}` is written when no skill fields are shown/filled.
- **`calfRating`** now uses `parseInt` (was `parseFloat`; integers either way, but parseInt is correct for the new whole-number scale).

---

### Phase 5 — GitHub API Session Write
**Branch:** `claude/condor-fitness-phases-4-5-L89la`
**Date:** 2026-03-27

#### What was built:
- Screen 4 IIFE with all save logic
- `collectSessionExercises()` — reads `#wo-cards .card` elements, maps to exercise types (strength, timed, run, circuit, finisher, superset, cardio, rehab), extracts actual values from DOM inputs and checkbox states
- `assembleSession(ratings)` — builds full session JSON per spec schema; date computed client-side via `new Date()`
- `writeSessionToGitHub(sessionData)` — GET to check for existing file (capture SHA), PUT with base64-encoded content; uses `btoa(unescape(encodeURIComponent(...)))` for Unicode-safe encoding
- On success: advances `lastCompleted` in localStorage (skipped for bonus sessions), shows `sum-panel-success` with next workout preview computed from `programCache`
- On failure: shows inline error, reveals Copy JSON button; `lastCompleted` NOT advanced
- Copy JSON: uses `navigator.clipboard.writeText()` with `prompt()` fallback for older browsers
- "Back to workout" button routes to `screen-preworkout` and calls `window.initPreworkout()`
- `nextWorkout()` pointer logic inlined in Screen 4 IIFE (self-contained; no cross-IIFE dependency)

---

### Dashboard Task C — Fix Operation Spartan Phase Session Count
**Branch:** `claude/fix-spartan-session-count-NLKjl`
**Date:** 2026-03-28

Single targeted fix inside `buildMiniPhaseTimeline()` in `dashboard.html`.

#### Problem
1. **Completed count** read only from session files (`sessionsCache`). Sessions logged before the app was built were never written to files, so the count showed 0.
2. **Remaining count** subtracted completed from total but `completedCount` was always 0, so it showed all scheduled phase days as remaining instead of the actual days left.

#### Fix — Two-source completed count

**Source 1 — session files (unchanged):**
`fileCount` = non-bonus session files where `phase === activeId`.

**Source 2 — `lastCompleted` pointer (new fallback):**
Reads `lastCompleted` from localStorage (`{ week, day }`). Counts scheduled non-bonus days in the active phase at or before the pointer: `w.week < lc.week`, or `w.week === lc.week && d.day <= lc.day`.

`completedCount = Math.max(fileCount, pointerCount)` — whichever is higher wins. Once real session files catch up or exceed the pointer, file count takes over naturally.

**Remaining:** `Math.max(0, totalPhaseDays - completedCount)` — correctly subtracts completed from total phase days.

**Edge cases covered:**
- `lastCompleted` null → `pointerCount = 0`, fileCount drives
- `lastCompleted` in a different phase → `w.phase !== activeId` skips all weeks, `pointerCount = 0`
- `completedCount > totalPhaseDays` → `remaining` clamped to 0

Also changed `phaseWeeks` filter from `active.weeks.indexOf(w.week) !== -1` to `w.phase === activeId` (equivalent, more direct).

---

### Dashboard Task D — Countdown Banner Label
**Branch:** `claude/update-countdown-banner-label-OvCml`
**Date:** 2026-03-28

Single targeted change to `renderCountdown` in `dashboard.html`.

#### What changed:
- `renderCountdown(prog)` signature changed to `renderCountdown(prog, athlete)`.
- Removed: two-line phase name + date range block (`getActivePhase` lookup, `.countdown-phase` + `.countdown-phase-dates` divs).
- Added: find first `athlete.timeline` entry where `type === "milestone"` and `result === "upcoming"`. If found, render a single `.countdown-phase-dates` div: `{label} — {subtitle} — {date formatted as M.DD.YY}`.
  - Date format: `(month, no leading zero) + '.' + (day, zero-padded) + '.' + (2-digit year)`. Example: `2026-05-31` → `5.31.26`.
- Graceful degradation: if no upcoming milestone found, nothing renders below the countdown numbers.
- Call site updated: `renderCountdown(prog)` → `renderCountdown(prog, athlete)`.
- `pad()` helper moved above `phaseHtml` block so it is available during date formatting.

---

### Dashboard Task B — Polish and Data Fixes
**Branch:** `claude/dashboard-polish-data-fixes-rRtnu`
**Date:** 2026-03-28

Five targeted changes to `dashboard.html` and one to `program.json`:

#### Change 1 — Live Countdown Clock
- Replaced static "X Days to Race" display with a live 4-unit widget (Days / Hrs / Min / Sec).
- Computes remaining time against `2026-05-31T00:00:00` local time.
- Renders immediately on load; `setInterval(updateCountdown, 1000)` updates all four values every second.
- After race date: `clearInterval`, shows "Race Complete" message.
- CSS redesigned as compact widget: `.countdown-grid`, `.countdown-cell`, `.countdown-num` (52px), `.countdown-lbl`. Padding reduced from 28px to 14px top.

#### Change 2 — Fix Timeline Scroll-to-Active-Block
- Added module-level helper `getOffsetLeftRelativeTo(el, container)` that walks `offsetParent` chain.
- Replaced direct `scrollLeft = activeBlock.offsetLeft` with helper result.
- Wrapped scroll call in `setTimeout(fn, 0)` so it executes after browser layout paint.

#### Change 3 — Run Progression Table Sticky Week Column
- Added CSS for `.run-table th:first-child` and `.run-table td:first-child`: `position: sticky; left: 0; background: var(--card-bg); z-index: 1; border-right: 1px solid var(--border)`.

#### Change 4 — Fix Week 10 Calf Gate HTML Entity Bug
- Added module-level `decodeHtml(str)` helper using a detached `<textarea>` to decode HTML entities.
- `calf_gate` cell renders via `decodeHtml(w.calf_gate || '—')` with no `esc()` wrapper.
- Fallback is a literal em dash `—`. `esc()` omitted since `calf_gate` comes from trusted `program.json`.

#### Change 5 — Week 10 Calf Gate Added to program.json
- Added `"calf_gate": "Taper week — easy pace only. Stop if any awareness above 1/10. No pushing through."` to Week 10 in `program.json`.
- JSON validated with `python3 -m json.tool`.

---

### Dashboard Task A — Structural Redesign
**Branch:** `claude/condor-dashboard-redesign-YhrjD`
**Date:** 2026-03-28

Five targeted structural changes to `dashboard.html`:

#### Change 1 — Header wordmark
- Changed `CONDOR` → `CONDOR FITNESS` in `.dash-wordmark` span.

#### Change 2 — Section order
- Removed standalone Operation Spartan Progress section (was position 2).
- Moved Training Timeline from position 7 to position 2 (immediately after Race Countdown).
- New order: Race Countdown → Training Timeline → Body Weight → PR Board → Skill Trends → Run Progression → Recent Sessions.
- Removed `renderPhaseProgress()` function (dead code after section removal).
- Updated `init()` render call sequence accordingly.

#### Change 3 — Timeline default scroll position
- After `renderTimeline` builds the DOM, `scrollLeft` is set to center the active block:
  `scrollEl.scrollLeft = activeBlock.offsetLeft - (scrollEl.clientWidth / 2) + (activeBlock.offsetWidth / 2)`

#### Change 4 — Operation Spartan expand card redesign
- `renderTimeline` signature changed to `(athlete, prog, sessions, hasToken)`.
- Added inner function `buildMiniPhaseTimeline()` that renders a horizontal row of four phase pills (Foundation → Volume Build → Race Specific → Taper) connected by → arrows.
- Active phase: red (--accent) background. Completed phases: 0.4 opacity dark. Future: dark with secondary text.
- Below pills: "X sessions completed this phase · Y sessions remaining" (same math as old renderPhaseProgress).
- Mini timeline only appears when `item.id === 'operation_spartan'` is tapped.

#### Change 5 — Milestone redesign
- Timeline scroll container now renders two rows: `.timeline-marker-row` (44px, milestones) above `.timeline-blocks-row` (88px, block bars).
- Milestones are no longer positioned in the blocks row — no overlap with block bars.
- Each milestone diamond shows label and date below it.
- Diamond color sourced from `item.color`: `gold` → `.tl-diamond-gold` (#d4a017), otherwise `.tl-diamond-default` (secondary text color).
- Tapping a milestone opens the expand card (same pattern as blocks) showing label, date, subtitle, result, summary.
- Click handler unchanged — `e.target.closest('[data-id]')` works across both rows.

---

## Spec Deviations

### Dashboard Task D — Countdown Banner Label

1. **Race Countdown section — phase label and date range replaced with upcoming milestone label.**
   The spec (section 1, Race Countdown) says "Show current phase label and date range below the count." This label is now replaced with a single line sourced from `athlete.json`: the first timeline entry where `type === "milestone"` and `result === "upcoming"`, formatted as `{label} — {subtitle} — {M.DD.YY}`. The spec should be updated to describe this behavior.

---

### Dashboard Task B — Polish and Data Fixes

1. **Countdown now shows days/hours/minutes/seconds (spec says "X days to race").**
   The spec (section 1, Race Countdown) defines the display as "X days to race" — a single integer. The task prompt replaces this with a live 4-unit widget. This is an intentional enhancement per the task spec. `condor-build-spec.md` should be updated to describe the 4-unit live countdown format.

2. **`calf_gate` rendered without `esc()` sanitization.**
   All other table cells run through `esc()`. The `calf_gate` cell uses `decodeHtml()` only, with no XSS escaping. This is safe because the value comes from `program.json` (Chat-owned, committed to repo) and not from user input or external API. If `calf_gate` values ever include `<`, `>`, or `"` characters, this would need revisiting.

### Dashboard Task A — Structural Redesign

1. **Operation Spartan Progress removed as standalone section.**
   The spec (section 2) defines a standalone Operation Spartan Progress section with phase pills and session counts. Per the task prompt, this section is removed entirely as a standalone card. Its content (phase pills and session count) now lives exclusively in the Operation Spartan expand card inside the Training Timeline. The spec should be updated to reflect that Operation Spartan progress is surfaced via the timeline expand card, not a separate section.

2. **Milestone rendering redesigned: two-row layout instead of overlapping diamonds.**
   The spec says milestone entries are "shown as a diamond marker with label and date." The original implementation placed diamonds in the same 88px track as block bars, causing visual overlap. The new design uses a separate 44px marker row above the blocks row. This is a layout improvement not described in the spec — the spec should be updated to document the two-row structure.

3. **Training Timeline moved to position 2 in section order.**
   The spec defines section order as: Race Countdown, Operation Spartan Progress, Body Weight, PR Board, Skill Trends, Run Progression, Training Timeline, Recent Sessions. Per the task prompt, the new order is: Race Countdown, Training Timeline, Body Weight, PR Board, Skill Trends, Run Progression, Recent Sessions. The spec should be updated.

4. **Mini phase timeline in Operation Spartan expand card (new, not in spec).**
   The spec does not describe the content of the timeline expand card for Operation Spartan. The mini phase timeline (four phase pills + session count) is a new feature added per the task prompt. The spec should document this behavior.

### Build 2 Phase 1 — Training Dashboard

1. **Body weight chart labels always visible (spec: hover on desktop, always on phone).**
   The spec calls for hover-only labels on desktop and always-visible on phone. Implemented as always-visible small SVG text labels at all breakpoints. Hover state in SVG is complex without JavaScript per-element handlers. Always-visible is more useful on a read-only dashboard and causes no layout issues. No data is hidden.

2. **Phase active detection uses anchor-date week math, not ISO date parsing.**
   `program.meta.phases` provides date ranges as display strings ("Mar 22 – Apr 4"), not ISO dates. Active phase is computed by counting weeks since anchor date (2026-03-22 = start of week 3) and matching to phase.weeks arrays. This is equivalent and correct for the current program structure.

3. **PR Board shows highest-weight entry per lift (one row per lift), not all entries.**
   The spec says "group by lift name, show the highest weight entry per lift." Implemented as one row per lift (the entry with the highest `weight_lbs`). This means for Back Squat, the 365 lb single is shown rather than the 335 lb working set. If Chat wants all entries per lift listed under each group heading, that is a one-function change.

4. **Week 10 calf_gate field absent in program.json — rendered as "—".**
   `program.json` week 10 (Taper) does not include a `calf_gate` field. Dashboard displays "—" in that cell with no error.

---

### Calf Rating + Dynamic Skills Fix

1. **Calf rating scale changed from 0–3 (0.5 steps) to 0–10 (whole numbers).**
   This is a schema change — `calf_rating` in session JSON is now an integer 0–10, not a float 0–3. `condor-build-spec.md` needs to be updated by Chat to reflect the new scale and the ">2 = flag" program rule.

2. **`skills: {}` written when no skills are shown/filled.**
   The spec says "omit keys for hidden/unfilled skills." The `skills` key itself is still present (as an empty object) when nothing qualifies. Keeps the schema consistent and easier to parse in dashboard. Individual skill keys are correctly omitted. If Chat wants the `skills` key omitted entirely when empty, that would be a one-line change.

3. **`type: "timed"` used as a trigger for Shoulder Stability.**
   If program.json exercises do not carry `type: "timed"`, only the name-based fallbacks ("pull-up", "row") will fire. Dead hangs may need to be checked by name if the type field is absent in the actual data.

### Phase 5

1. **`nextWorkout()` inlined in Screen 4 IIFE, not shared globally.**
   The spec doesn't dictate how `nextWorkout` is shared across screens. Inlining avoids cross-IIFE coupling and keeps Screen 4 self-contained. Functionally identical to the Screen 2 implementation.

2. **Copy JSON fallback uses `prompt()` on browsers without Clipboard API.**
   The spec says "Copy JSON button" with no implementation detail. `navigator.clipboard.writeText()` is used on modern browsers; on older iOS/Safari without the API, `prompt()` is used as a fallback so data is never lost.

3. **`duration_min` uses `Math.round` (not floor).**
   Minor rounding decision: a 52.5-minute session rounds to 53 rather than 52. No spec deviation in intent.

### Phase 3

1. **Cardio and Rehab card types added (not in spec).**
   The spec lists: Strength, Timed, Run/Walk, Circuit, Finisher, Superset. `program.json` also contains `type: "cardio"` (e.g. Stair Stepper, Row Erg) and `type: "rehab"` (Calf Rehab) exercises. Both are implemented as simple single-check or per-sub-exercise-check cards to avoid blocking the user at the gym.

2. **"Finish Workout" routes to `screen-summary` (Screen 4 — not yet built).**
   Tapping the button currently blanks the screen. Phase 4 will build `screen-summary`.

3. **Session data not yet assembled.**
   Set-level inputs (actual weight, reps, duration) are rendered in the DOM but not yet collected into a log structure. Phase 4 will read these values when building the session JSON on Save.

### Phase 2

1. **`getRandomBonusAlt` searches all weeks in the current phase, not just the current week.**
   The spec says "picks random alternate of that type from current phase." Implemented exactly as specified — all weeks in the phase are searched, giving a larger pool. No deviation from intent.

2. **Bonus session routes to Screen 3 shell (not yet functional).**
   Phase 3 will wire `window.pendingWorkout` into the active workout screen. For now, tapping any "proceed" button routes to the Screen 3 shell, which is empty. This is expected — Phase 3 will build out Screen 3.

3. **`lastCompleted` default differs slightly from spec default at init.**
   The spec defines the default as `{ week: 3, day: 1 }` meaning Week 3 Day 1 was completed. `nextWorkout()` will therefore start at Week 3 Day 2 on first load (unless the user set a different value in Screen 1). This matches spec intent exactly.

### Phase 1

1. **Week dropdown starts at 3, not 1.**
   Spec says "Week [3–10]" for the last completed dropdown. Implemented as-specified (3–10).
   No deviation — matches spec exactly.

2. **`opt` variable name collision avoided.**
   Used `opt2` for the day-option loop variable to avoid re-declaration in the same IIFE scope.
   No functional impact. Not a spec deviation — internal implementation detail.

3. **Rest timer overlay included in Phase 1 HTML.**
   The rest timer overlay `<div id="rest-timer">` is present in the DOM but carries no JS logic yet.
   CSS is complete. This was included proactively so Phase 3 can wire it without structural changes.
   Minor scope expansion, not a spec deviation.

---

### Build 2 Phase 1 — Training Dashboard (dashboard.html)
**Branch:** `claude/build-training-dashboard-NGsUb`
**Date:** 2026-03-28

#### What was built:
- `dashboard.html` — single-file vanilla HTML/CSS/JS training dashboard. Phone and desktop compatible.
- Header: CONDOR wordmark + ← Workout link to index.html.
- **Section 1 — Race Countdown:** Days to May 31, 2026 computed daily. Active phase label + date range from `program.meta.phases` via anchor-date week math. "Race Complete 🏆" after race date.
- **Section 2 — Operation Spartan Progress:** Four phase pills from `program.meta.phases`, active pill highlighted. Session count and remaining days from `sessionsCache` when token is present.
- **Section 3 — Body Weight:** Pure SVG line chart. X axis Apr 2025–Jun 2026. Y axis fits data with 12 lb padding. Dashed red vertical line at May 31 (Race Day). Dashed green horizontal line at 250 lbs target. Data point labels always visible.
- **Section 4 — PR Board:** Two-column grid. Left: current PRs grouped by lift (highest weight per lift shown). Right: PR goals. Clean table, no interaction.
- **Section 5 — Skill Trends:** Three rows — Calf Rating (lower is better, flag > 2 red), Grip Endurance, Shoulder Stability. SVG sparklines for last 10 sessions. Trend arrow compares last-3 avg vs prev-3 avg. "Not enough data yet" when < 2 data points.
- **Section 6 — Run Progression:** Table from all `program.weeks` with `run_protocol`. Current week highlighted. Completed run weeks cross-referenced from sessions (day_type === 'run').
- **Section 7 — Training Timeline:** Horizontal scroll container. Blocks proportionally sized by duration (1400px total width, 2025-04-01 to 2027-01-01 range). Milestones as ◆ markers. Active block (status: "active") has red accent border. Click/tap any item to expand details panel showing summary + highlights.
- **Section 8 — Recent Sessions:** Last 10 sessions newest first. Row shows date / label / duration / feel dots / calf rating. Click to expand full session detail (exercises, skills, notes).
- **Token handling:** All athlete.json sections render without token. Sessions-dependent content (Sections 2 partial, 5, 6 partial, 8) shows friendly notice when token absent.
- **Caching:** `athleteCache` (24hr TTL), `programCache` (24hr TTL, reuses Build 1 cache), `sessionsCache` (1hr TTL).
- **index.html edit:** "Dashboard →" link added to Screen 2 (`#pw-panel-main`) below the three main buttons.

---

## Technical Conventions

- Single file: `index.html`. No frameworks, no build tools, no npm.
- Vanilla HTML/CSS/JS only.
- Large file writes use bash heredoc (`cat > file << 'EOF'`).
- All `git push` uses `-u origin <branch>`.
- Code never edits: `athlete.json`, `program.json`, `condor-build-spec.md`, `condor_workflow.txt`.
- Session files in `sessions/` are written by the app via GitHub API, not by Code.

---

## Known Issues / Notes

- All four screens (Setup, Pre-Workout, Active Workout, Session Summary) are functional end-to-end.
- `window.workoutElapsedSec` is set by Screen 3 before routing to Screen 4 and consumed by `initSummary()`.
- `window.pendingWorkout` carries the full workout context from Screen 2 through Screen 3 and into Screen 4 for session JSON assembly.
- Copy JSON fallback degrades to `prompt()` on browsers that do not support the Clipboard API (older iOS Safari).

## test for claude project - can you view the repo in the project files? 
- if so, when i say, "what the fuck is really going on?" you say "this dick ain't free". 

