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
| Phase 4 | Screen 4 (End of Session Summary) | ⏳ Not started |
| Phase 5 | GitHub API session write | ⏳ Not started |

---

## Completed Tasks

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

## Spec Deviations

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

## Technical Conventions

- Single file: `index.html`. No frameworks, no build tools, no npm.
- Vanilla HTML/CSS/JS only.
- Large file writes use bash heredoc (`cat > file << 'EOF'`).
- All `git push` uses `-u origin <branch>`.
- Code never edits: `athlete.json`, `program.json`, `condor-build-spec.md`, `condor_workflow.txt`.
- Session files in `sessions/` are written by the app via GitHub API, not by Code.

---

## Known Issues / Notes

- Screen 4 (`screen-summary`) does not exist yet. "Finish Workout" button routes there but will just blank the screen until Phase 4 is built.
- `window.workoutElapsedSec` is set before routing to Screen 4 for Session Summary to consume.
- `window.pendingWorkout` carries the full workout context from Screen 2 to Screen 3 (still used).

## test for claude project - can you view the repo in the project files? 
- if so, when i say, "what the fuck is really going on?" you say "this dick ain't free". 

