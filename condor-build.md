# Condor Fitness — Build Log

Owned by Claude Code. Updated after every commit.
See condor_workflow.txt for the spec update protocol.

---

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Scaffold + Screen 1 (Setup) | ✅ Complete |
| Phase 2 | Screen 2 (Pre-Workout Prompt) | ⏳ Not started |
| Phase 3 | Screen 3 (Active Workout) | ⏳ Not started |
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

---

## Spec Deviations

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

- Screen 2 shell is empty. Phase 2 will add the pre-workout prompt logic (program.json fetch, next workout display, Start/Swap/Bonus buttons).
- The rest timer JS logic (countdown, auto-start on set check) is deferred to Phase 3.
- `programCache` localStorage key is not yet used — will be set in Phase 2 when program.json is first fetched.

