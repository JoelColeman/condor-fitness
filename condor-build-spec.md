# Condor Fitness — Build Spec
Version 1.2 — March 27, 2026
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
### Purpose
A read-only training dashboard. Replaces the need to
open the operation_spartan program document to check
progress. Shows where you've been, where you are, and
what's coming. Updates automatically as session files
accumulate in sessions/.

Single file: dashboard.html.
Stack: vanilla HTML, CSS, JavaScript. No frameworks.
No npm. No build tools. No API keys.

Phone and desktop compatible. Not phone-first —
it's a reference view, not a between-sets tool.

---

### Data Sources

**athlete.json** — fetched from raw GitHub URL.
Cached in localStorage as `athleteCache` (24hr TTL).
Contains: timeline blocks, body weight history,
body weight goals, PRs, PR goals, skill status history.

**sessions/** — fetched via GitHub API using the
token stored in localStorage from Build 1.
Lists all files in sessions/, fetches each JSON.
Cached in localStorage as `sessionsCache` (1hr TTL).
Falls back to empty array if no sessions exist yet.

**program.json** — fetched from raw GitHub URL.
Cached in localStorage as `programCache` (24hr TTL).
Used for: phase map, run progression table,
Operation Spartan phase checkpoints.

All three fetches happen on load. Show a loading
state while fetching. Surface fetch errors inline
per section — a failure in one section should not
blank the whole page.

---

### Navigation

Header at top of page:
- Left: "CONDOR" wordmark
- Right: "← Workout" link → index.html

index.html gets a reciprocal link added:
- On Screen 2 (pre-workout), small "Dashboard →"
  link in the footer area below the main buttons.

---

### Sections (top to bottom)

#### 1. Race Countdown
Full-width banner at top.
"X days to race" — computed from today vs May 31, 2026.
Show current phase label and date range below the count.
After race date: replace with "Race Complete 🏆".

#### 2. Operation Spartan Progress
Shows current Operation Spartan block only.
Four phase pills: Foundation / Volume Build /
Race Specific / Taper. Active phase highlighted.
Below: workouts completed this block (count of
non-bonus sessions from sessions/ where phase matches),
and sessions remaining (total scheduled days - completed).

#### 3. Body Weight
Line chart. X axis: dates. Y axis: weight in lbs.
Plot all data points from athlete.json body_weight array.
Plot session data points where body weight was recorded
(sessions do not currently include body weight —
this panel uses athlete.json data only for now).
Draw a horizontal dashed target line at 250 lbs
labeled "Race Day Target".
Draw a vertical dashed line at May 31, 2026.
No charting library — draw with SVG or Canvas.

#### 4. PR Board
Two columns: Current PRs / PR Goals.
Current PRs: read from athlete.json prs array.
Group by lift. Show highest weight per lift.
PR Goals: read from athlete.json pr_goals array.
Simple table layout. No interaction needed.

#### 5. Skill Trends
Three metric rows: Calf Rating / Grip Endurance /
Shoulder Stability.

For each: plot the last 10 sessions that recorded
that skill rating as a small sparkline (SVG).
Show the most recent value as a large number.
Show trend direction (up/flat/down arrow).

Calf: lower is better. Flag any session where
calf_rating > 2 with a red dot on the sparkline.
Skill ratings: higher is better.

If fewer than 2 data points exist: show
"Not enough data yet" instead of a chart.

#### 6. Run Progression
Table sourced from program.json run progression data.
Columns: Week / Protocol / Calf Gate.
Highlight the current week row.
Show a checkmark next to completed run weeks
(cross-reference sessions/ for run day sessions).

#### 7. Training Timeline
Horizontal scrolling timeline.
All blocks from athlete.json timeline array,
ordered chronologically.
Each block: colored bar, label, subtitle, date range.
Milestone entries (type: "milestone"): shown as a
diamond marker with label and date.
Active block (status: "active"): highlighted with
accent color border.
Tap/click a block: expand a details panel below
the timeline showing summary and highlights.
No interaction needed beyond tap-to-expand.

#### 8. Recent Sessions
Last 10 sessions from sessions/ folder, newest first.
Each row: date / day label / duration / overall feel
(shown as 1-5 dots) / calf rating.
Tap a row: expand to show full session detail
including exercises and notes.

---

### Design

Same dark theme as index.html.
Same CSS variables (copy from index.html).
Desktop: max-width 900px centered, generous padding.
Phone: full width, sections stack vertically.

Section headers: uppercase, letter-spaced, accent
color left border — same card style as index.html.

Charts (body weight, sparklines): SVG only.
No external charting libraries.

---

### Data Fetch Pattern
```javascript

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
| `githubToken` | GitHub personal access token. Requires Contents: read/write on the condor-fitness repo. Set once on first run. |
| `githubRepo` | Repo string: "JoelColeman/condor-fitness". Set once on first run. |
| `lastCompleted` | Object: `{ week: 3, day: 1 }`. Updated after each saved non-bonus session. Drives next workout logic. Default: week 3, day 1. |
| `programCache` | Cached copy of program.json with timestamp. Re-fetched if older than 24 hours. |

---

## App Flow — Screen by Screen

### Screen 1 — First Run Setup
Shown only if `githubToken` is not in localStorage.

Fields:
- GitHub Personal Access Token
- Repo name (pre-filled: JoelColeman/condor-fitness)
- Last completed: Week [3–10] Day [1–4] (default: Week 3, Day 1)

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
- Per-round "Complete round [N]" button with full exercise list shown for reference

**Finisher Card:**
- Labeled "Grip Finisher"
- Note shown: "Complete after all circuit rounds."
- Per-exercise checkboxes

**Superset Card:**
- Sub-exercise sections with weight+reps or duration inputs

**Cardio Card:**
- Single "Mark complete" checkbox (e.g. Stair Stepper, Row Erg)

**Rehab Card:**
- Per-sub-exercise "Done" checkboxes (e.g. Calf Rehab)

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
Shown when "Finish Workout" is tapped.

Displays workout label and duration at top.

**Always shown:**
- Overall feel: 1–5 (tap to select, required)
- Calf rating: 0–10 whole numbers (tap to select, optional)
  - 0 = no awareness. >2 = flag per program rules.
  - Hint shown: "(0 = none, >2 = flag)"
- Notes: free text field

**Conditionally shown** (based on exercises in current workout):
- Grip endurance: 1–5 — shown if workout contains a finisher or any exercise with "farmer" or "carry" in the name
- Shoulder stability: 1–5 — shown if workout contains a timed exercise (dead hangs) or any exercise with "pull-up" or "row" in the name
- Monkey bars: 1–5 — shown if any exercise name contains "monkey"

All skill ratings are optional even when shown.

"Save Session" button.

**On Save:**
1. Validate overall feel is set (required — show inline error if missing)
2. Assemble session JSON (schema below)
3. Write `sessions/YYYY-MM-DD.json` to GitHub via API
4. If not bonus: advance `lastCompleted`, write to localStorage
5. Show success screen with green ✓ and next workout preview
6. If GitHub write fails: show inline error + "Copy JSON" button so no data is lost. Do not advance `lastCompleted`.

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
  "calf_rating": 1,
  "overall_feel": 4,
  "skills": {
    "grip_endurance": 3,
    "shoulder_stability": 2,
    "monkey_bars": 3
  },
  "note": "Felt strong. Calf stable throughout."
}
```

**Schema notes:**
- `calf_rating`: integer 0–10. Lower is better. Omitted if not rated.
- `skills`: object containing only keys for ratings that were both shown (exercise matched) and filled in. May be empty `{}`. Keys omitted individually if not rated.
- `overall_feel`: integer 1–5. Required — session will not save without it.

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
| Secondary | `#2E5FA3` | Blue — calf rating selected state |
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

Base64 encoding: `btoa(unescape(encodeURIComponent(JSON.stringify(sessionData, null, 2))))` — handles Unicode in notes field.

---

## program.json Read

Fetch from raw GitHub URL:
```
https://raw.githubusercontent.com/JoelColeman/condor-fitness/main/program.json
```

Cache in localStorage as `programCache`.
Re-fetch if cache is older than 24 hours or on manual refresh.

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

---

## Out of Scope — Build 1

- Dashboard / athletic history visualization (Build 2)
- Oura Ring or Apple Health sync (future)
- Any AI or LLM API calls (none, ever)
- User authentication beyond GitHub token
- Multiple athlete support
- Push notifications

---

## Spec Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-22 | Initial spec created | Build 1 kickoff |
| 2026-03-27 | Phases 4 & 5 built: Screen 4, GitHub API write, success flow | Build complete |
| 2026-03-27 | Calf rating changed from float 0–3 (0.5 steps) to integer 0–10. Hint text added. | Program uses 0–10 pain scale |
| 2026-03-27 | Skill ratings (grip, shoulder, monkey bars) made conditional on workout content | Monkey bars shouldn't appear on days without them |
| 2026-03-27 | Cardio and Rehab card types added to Screen 3 | program.json contains these types |

*This table is updated by Chat whenever the spec changes.*
