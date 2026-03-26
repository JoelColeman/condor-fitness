# Condor Fitness — Build Spec
Version 1.1 — March 22, 2026
Repo: JoelColeman/condor-fitness

This document is the source of truth for what the app
does and how it works. It is owned by Chat and updated
by Chat whenever design decisions change. Claude Code
reads this but never edits it. See condor_workflow.txt
for the spec update protocol.

---

## What Is Being Built

### Build 1 — Workout Companion (index.html)
A phone-first single-page workout companion app.
Single file: index.html.
Stack: vanilla HTML, CSS, JavaScript. No frameworks.
No npm. No build tools. No API keys of any kind.

The user opens it on their phone at the gym, sees
their next workout, taps through sets, logs actual
weights and times, then saves a session record to
the repo when done.

### Build 2 — Training Dashboard (dashboard.html)
Phone and desktop. Reads athlete.json and sessions/.
Displays full athletic timeline, PR board, body weight
trend, skill history, run progression, and goals.
Status: Planned. Not yet built.

---

## Repo Structure

```
JoelColeman/condor-fitness/
  index.html              ← Build 1 (workout companion)
  dashboard.html          ← Build 2 (not yet built)
  athlete.json            ← READ ONLY. Chat-owned.
  program.json            ← READ ONLY. Chat-owned.
  condor-build-spec.md    ← READ ONLY. Chat-owned. This file.
  condor_workflow.txt     ← READ ONLY. Chat-owned.
  condor-build.md         ← Code-owned. Build log.
  sessions/               ← Written by app via GitHub API.
    .gitkeep
```

GitHub Pages enabled on main branch root.
App URL: https://joelcoleman.github.io/condor-fitness/

---

## App State (localStorage)

| Key | Description |
|-----|-------------|
| `githubToken` | GitHub personal access token (repo scope). Set once on first run. Never shown again. |
| `githubRepo` | Repo string: "JoelColeman/condor-fitness". Set once on first run. |
| `lastCompleted` | Object: `{ week: 3, day: 1 }`. Updated after each saved session. Drives next workout logic. Default: week 3, day 1 (Week 3 Day 1 was completed 3/22/2026). |
| `programCache` | Cached copy of program.json. Re-fetched if older than 24 hours. |

---

## App Flow — Screen by Screen

### Screen 1 — First Run Setup
Shown only if `githubToken` is not in localStorage.

Fields:
- GitHub Personal Access Token
- Repo name (pre-filled: JoelColeman/condor-fitness)
- Last completed: Week [3–10] Day [1–4] (default: Week 3, Day 1)

Instruction shown: "Create a token at github.com/settings/tokens with 'repo' scope selected."

Save → writes all to localStorage → go to Screen 2.

---

### Screen 2 — Pre-Workout Prompt
Shown on every load after setup.
Reads `lastCompleted`, finds next workout in program.json.

Displays:
- "Next up:"
- Week [X] Day [Y] — [Label]
- [Phase] · [Date range]

Three buttons:
- ✓ **Start this workout** → Screen 3
- ↻ **Swap to alternate** → Alternate selector
- **+ Bonus session** → Day type selector

**Alternate Selector:**
Lists alternates for this day from program.json.
Each has a label. Tap → load in Screen 3.
If none available: show message, return to Screen 2.

**Bonus Session:**
Four buttons: Strength / Run / Engine / Circuit.
Loads a random alternate of that type from current phase.
Does NOT advance `lastCompleted` on save.
Session saved with `"bonus": true` flag.

---

### Screen 3 — Active Workout
Header: "Week [X] Day [Y] — [Label]" + elapsed timer.
↻ Refresh button in header — confirm dialog before
swapping (progress will be lost).

#### Exercise Cards
One card per exercise. Cards collapsed by default.
Current card auto-expanded. Tap header to expand any.
Completed cards show a green checkmark in header.

**Strength Card (expanded):**
- Subtitle: target weight and reps
- One row per set: [ ✓ ] [ actual weight ] [ actual reps ]
- Fields pre-filled with targets from program.json
- Checking the last set auto-collapses and advances to next card

**Timed Card (carries, hangs):**
- Subtitle: target duration
- One row per set: [ ✓ ] [ actual duration (sec or mm:ss) ]
- Pre-filled with target duration

**Run/Walk Interval Card:**
- Shows: "1:00 run / 3:00 walk × 8 rounds"
- Options: individual interval checkboxes, OR "Mark all complete" button
- Optional notes field per interval

**Circuit Card:**
- Shows round count
- Grid: exercises as rows, rounds as columns
- Each cell is a checkbox
- OR: per-round "Complete round [N]" button with full exercise list shown for reference

**Finisher Card:**
- Labeled "Grip Finisher"
- Note shown: "Complete after all circuit rounds."
- Per-exercise checkboxes same as strength card

#### Rest Timer
Auto-starts when a set is checked.
Full-screen overlay. Large countdown (80px+ font).
Background: semi-opaque dark.
Tap anywhere to dismiss. "Skip" link also available.

Defaults from program.json `rest_timer_defaults_sec`:
- `strength`: 120 sec
- `circuit_round`: 90 sec
- `circuit_round_phase3`: 60 sec
- `grip_finisher`: 0 sec (no timer)

"Finish Workout" button visible after first set is logged.
Tapping it goes to Screen 4 regardless of completion state.

---

### Screen 4 — End of Session Summary
Shown when all exercises checked OR "Finish" tapped.

Fields:
- Overall feel: 1 2 3 4 5 (tap to select)
- Calf rating: 0 to 3 in 0.5 steps (tap or slider)
- Grip endurance: 1 2 3 4 5
- Shoulder stability: 1 2 3 4 5
- Monkey bars: 1 2 3 4 5
- Notes: free text field

"Save Session" button.

**On Save:**
1. Assemble session JSON (schema below)
2. Write `sessions/YYYY-MM-DD.json` to GitHub via API
3. If not bonus: advance `lastCompleted`, write to localStorage
4. Show success screen with green ✓ and next workout preview
5. If GitHub write fails: show error + "Copy JSON" button so no data is lost

---

## Session JSON Schema

```json
{
  "date": "2026-03-22",
  "week": 3,
  "day": 1,
  "day_type": "strength",
  "day_label": "Full Body Strength",
  "phase": "foundation",
  "bonus": false,
  "alternate_used": null,
  "duration_min": 52,
  "exercises": [
    {
      "name": "Back Squat",
      "sets": [
        {
          "set_number": 1,
          "target_weight_lbs": 335,
          "actual_weight_lbs": 335,
          "target_reps": 5,
          "actual_reps": 5,
          "completed": true
        }
      ]
    }
  ],
  "calf_rating": 1.0,
  "overall_feel": 4,
  "skills": {
    "grip_endurance": 3,
    "shoulder_stability": 2,
    "monkey_bars": 3
  },
  "note": "Felt strong. Calf stable throughout."
}
```

---

## Design Spec

Phone-first. Dark theme. Clean and minimal.
This is used between sets — not admired.

### Colors
| Token | Value | Use |
|-------|-------|-----|
| Background | `#0f0f0f` | Page background |
| Card background | `#1a1a1a` | Exercise cards |
| Primary accent | `#e63946` | Red — Spartan/Condor |
| Secondary | `#2E5FA3` | Blue |
| Text primary | `#f0f0f0` | Main text |
| Text secondary | `#888888` | Labels, meta |
| Success | `#2a9d5c` | Save confirmation |
| Border | `#2a2a2a` | Card borders |

### Typography
- Font: `system-ui, -apple-system, sans-serif`
- Exercise names: 16px bold
- Set rows: 15px
- Meta/labels: 13px in secondary color

### Touch Targets
- Minimum 44px height on all interactive elements
- No hover states needed — touch only

### Active Card
Left border in accent color (`#e63946`) when expanded.

### Rest Timer Overlay
Full screen. Countdown number 80px+ centered.
Semi-opaque dark background (`#0f0f0fCC`).
Tap anywhere dismisses.

---

## GitHub API — Session Write

**Write a session file:**
```
PUT https://api.github.com/repos/{owner}/{repo}/contents/sessions/{filename}

Headers:
  Authorization: token {githubToken}
  Content-Type: application/json

Body:
  {
    "message": "Add session YYYY-MM-DD",
    "content": "{base64 encoded session JSON}",
    "sha": "{existing file sha — only if updating}"
  }
```

**Check if file exists (get sha for updates):**
```
GET https://api.github.com/repos/{owner}/{repo}/contents/sessions/{filename}
```

Handle errors gracefully. If write fails, do not lose
the data — surface a "Copy JSON" fallback.

---

## program.json Read

Fetch from raw GitHub URL:
```
https://raw.githubusercontent.com/JoelColeman/condor-fitness/main/program.json
```

Cache in localStorage as `programCache`.
Re-fetch if cache is older than 24 hours or on manual refresh.

Used to:
1. Determine next workout from `lastCompleted` pointer
2. Render exercise cards with targets
3. Source alternate workouts
4. Get rest timer defaults per exercise type

---

## Workout Pointer Logic

```
lastCompleted = { week: 3, day: 1 }

nextWorkout():
  Find current week in program.json
  Find next day number within that week
  If no more days in week → advance to next week, day 1
  If no more weeks → show "Program complete — race week!"
  Return the workout object

On save (non-bonus):
  Set lastCompleted to { week, day } just completed
  Write to localStorage
```

Sequential only — no date logic. If Joel skips a day,
the app shows the same next workout whenever he opens it.
If he wants to skip ahead, the pre-workout prompt has
an alternate/bonus selector.

---

## Out of Scope — Build 1

Explicitly deferred to later builds or future phases:
- Dashboard / athletic history visualization (Build 2)
- Oura Ring or Apple Health sync (future — requires desktop Claude Code)
- Any AI or LLM API calls (none, ever)
- User authentication beyond GitHub token
- Multiple athlete support
- Push notifications

---

## Spec Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-22 | Initial spec created | Build 1 kickoff |

*This table is updated by Chat whenever the spec changes.
Code notes deviations in condor-build.md; Chat updates
this table and the relevant sections above.*
