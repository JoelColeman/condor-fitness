# Condor Fitness — Build Spec
Version 1.5 — April 21, 2026
Repo: JoelColeman/condor-fitness

This document is the source of truth for what the app
does and how it works. It is owned by Chat and updated
by Chat whenever design decisions change. Claude Code
reads this but never edits it. See CLAUDE.md
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
Phone and desktop. Reads athlete.json, program.json,
and sessions/. Displays full athletic timeline, PR
board, body weight trend, skill history, phase
checkpoints, and forward-looking goals.
Status: Complete. Live at /dashboard.html.

---

## Repo Structure

```
JoelColeman/condor-fitness/
  index.html              ← Build 1 (workout companion)
  dashboard.html          ← Build 2 (training dashboard)
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
Dashboard URL: https://joelcoleman.github.io/condor-fitness/dashboard.html

---

## App State (localStorage)

| Key | Description |
|-----|-------------|
| `githubToken` | GitHub personal access token. Requires Contents: read/write on the condor-fitness repo. Set once on first run. |
| `githubRepo` | Repo string: "JoelColeman/condor-fitness". Set once on first run. |
| `lastCompleted` | Object: `{ week: N, day: N }`. Updated after each saved non-bonus session. Also updated by dashboard cross-device sync when session files show more progress than localStorage. Drives next workout logic. Default: week 3, day 1. |
| `programCache` | Cached copy of program.json with timestamp. Re-fetched if older than 24 hours. |
| `athleteCache` | Cached copy of athlete.json with timestamp. Re-fetched if older than 24 hours. |
| `sessionsCache` | Cached copy of all session files with timestamp. Re-fetched if older than 1 hour. |
| `workoutProgress` | Auto-saved in-progress workout state. Schema: `{ week, day, savedAt, completed[] }`. TTL: 4 hours. Cleared on successful session save, refresh confirm, and new workout start. |

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
- Dashboard → link to dashboard.html

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
swapping (clears workoutProgress, progress will be lost).

**Auto-save / Restore:**
After every set check or round tap, completion state is
saved to `workoutProgress` in localStorage. On load,
if `workoutProgress` matches the current week/day and
is less than 4 hours old, completed cards are restored
and a banner is shown: "Session in progress restored.
[Clear]". Clear button removes the banner and clears
the key. On successful session save, workoutProgress
is cleared. Only card-level completion is restored —
individual set inputs are not restored.

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

**Finisher Circuit Card** (`type: "finisher_circuit"`):
- Used for Grip Finisher blocks.
- Subtitle: "[N] rounds · No rest within round"
- Body: exercise reference list (name + reps/duration/weight)
  + optional note line + one "Complete round N" button per round.
- No rest timer between exercises within a round (grip_finisher
  default = 0 sec). Rest between rounds at discretion.
- Last round completion marks card complete and advances.

**Superset Card:**
- Sub-exercise sections with weight+reps or duration inputs.
- If `ex.rounds` is present: subtitle shows
  "[N] rounds · [ExName1 + ExName2]".
- Otherwise: subtitle shows "Superset · N exercises".

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
- Grip endurance: 1–5 — shown if workout contains a
  finisher_circuit or any exercise with "farmer" or "carry"
  in the name
- Shoulder stability: 1–5 — shown if workout contains a timed
  exercise (dead hangs) or any exercise with "pull-up" or
  "row" in the name
- Monkey bars: 1–5 — shown if any exercise name contains
  "monkey"

All skill ratings are optional even when shown.

"Save Session" button.

**On Save:**
1. Validate overall feel is set (required — show inline error
   if missing)
2. Assemble session JSON (schema below)
3. Write `sessions/YYYY-MM-DD.json` to GitHub via API
4. If not bonus: advance `lastCompleted`, write to localStorage
5. Clear `workoutProgress` from localStorage
6. Show success screen with green ✓ and next workout preview
7. If GitHub write fails: show inline error + "Copy JSON"
   button so no data is lost. Do not advance `lastCompleted`.

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
- `calf_rating`: integer 0–10. Lower is better. Omitted if
  not rated.
- `skills`: object containing only keys for ratings that were
  both shown (exercise matched) and filled in. May be empty
  `{}`. Keys omitted individually if not rated.
- `overall_feel`: integer 1–5. Required — session will not
  save without it.

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

Base64 encoding: `btoa(unescape(encodeURIComponent(
JSON.stringify(sessionData, null, 2))))` — handles
Unicode in notes field.

---

## GitHub API — Session Read (Dashboard)

**All session file reads use the GitHub Contents API
exclusively** (`api.github.com/repos/.../contents/...`).
Never use `raw.githubusercontent.com` — it fails CORS
on corporate/managed networks.

**Directory listing:**
```
GET https://api.github.com/repos/{owner}/{repo}/contents/sessions/
```
Returns array of file metadata including `url` field
(the Contents API URL for each file).

**Individual file read:**
```
GET {file.url}
```
Returns JSON with base64-encoded `content` field.
Decode: `JSON.parse(decodeURIComponent(escape(
atob(response.content.replace(/\n/g, '')))))`

**Auth header:** Passed when token exists (5000 req/hr),
omitted when no token (60 req/hr, sufficient for
dashboard reads on public repos).

Sessions are always fetched regardless of token presence.
This enables cross-device sync.

---

## Cross-Device Sync (Dashboard)

The dashboard resolves `lastCompleted` from two sources
and takes the higher value:

1. localStorage `lastCompleted` on the current device
2. The furthest non-bonus `{week, day}` found in session
   files fetched from GitHub

`resolveLastCompleted(sessions)` compares both sources.
Higher week wins; on tie, higher day wins. The resolved
value is passed to `renderTrainingLog`, `renderTimeline`,
and `buildMiniPhaseTimeline`.

If session files show more progress than localStorage,
localStorage is updated immediately so subsequent page
loads are correct even if `sessionsCache` hasn't expired.

This means: log a workout on your phone, open the
dashboard on desktop, and it shows the correct next
workout — no manual sync needed.

---

## program.json Read

Fetch from raw GitHub URL:
```
https://raw.githubusercontent.com/JoelColeman/condor-fitness/main/program.json
```

Cache in localStorage as `programCache`.
Re-fetch if cache is older than 24 hours or on manual
refresh.

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

## Build 2 — Training Dashboard (dashboard.html)

### Purpose
A read-only training dashboard. Reads athlete.json,
program.json, and sessions/. No editing from dashboard.

### Section Order
1. Race Countdown
2. Training Timeline
3. Body Weight
4. PR Board
5. Skill Trends
6. Training Log

---

### Dashboard Sections

#### 1. Race Countdown
Live 4-unit widget: Days / Hrs / Min / Sec.
Updates every second via setInterval.
Label sourced from first upcoming milestone in
athlete.json timeline (type === "milestone",
result === "upcoming"). Format: M.DD.YY.
After race date: shows "Race Complete 🏆".

#### 2. Training Timeline
Horizontal scroll container. Blocks proportionally
sized by duration. Milestones rendered in a separate
44px marker row above the blocks row (two-row layout).
Active block has accent border.
Tap/click any block to expand a detail panel with
summary and highlights.

Operation Spartan block expand card includes a mini
phase timeline: four phase pills (Foundation → Volume
Build → Race Specific → Taper) connected by arrows.
Active phase: accent background. Completed: 0.4 opacity.
Future: muted. Below pills: session count and remaining
days for the active phase (two-source logic — see
Session Count Logic below).

Auto-scrolls to active block on load.

#### 3. Body Weight
SVG line chart. X axis April 2025 – June 2026.
Y axis: data range with 10 lb padding.
Dashed red vertical line at May 31 (Race Day).
Dashed green horizontal line at 250 lbs target.
Data point labels always visible.

#### 4. PR Board
Two columns: Current PRs / PR Goals.
Current PRs: highest weight per lift from athlete.json
prs array, with type label.
PR Goals: from athlete.json pr_goals array.

#### 5. Skill Trends
Three rows: Calf Rating / Grip Endurance /
Shoulder Stability.
Data sourced from session files.
Each row: most recent value, SVG sparkline of last 10
sessions, trend arrow (▲/▼/→).
Calf: lower is better, red dot on any value > 2.
Skills: higher is better.
If fewer than 2 data points: "Not enough data yet".
Renders when session data is available regardless of
token presence (gate: no token AND no sessions).

#### 6. Training Log
Replaces the former "Recent Sessions" section.
Shows all 32 program days (Weeks 3–10, 4 days each)
in chronological order, grouped by week with week
header separators.

**Week header row:**
"Week N — [dates]" + phase pill (active/completed/future).

**Row states:**

*Logged* — non-bonus session file exists for that week/day:
  Date, day label, feel dots, calf rating.
  Tap to expand full session detail (exercises, skills,
  notes). One expanded row at a time.

*Skipped* — past day with no session file:
  Date and day label only. Opacity 0.45. No interaction.

*Next* — first upcoming non-logged day:
  Day label + "NEXT" accent badge + left accent border.
  Exercise preview sub-line: first 3 exercise names
  (skip "Scapular" warm-up), joined with " · ", truncated
  with "…" if more. No interaction.

*Future* — all days after Next:
  Day label. Opacity 0.65. Exercise preview sub-line.
  No interaction.

**Run protocol on Day 2 rows:**
For all Day 2 rows (Run + Grip) in all states, a second
sub-line appears below the exercise preview line at the
same font size: "[run_protocol] · [calf_gate]".
HTML entities in calf_gate are decoded before display.

**Auto-scroll:**
On load, the NEXT row scrolls into view (block: center)
at 150ms after all render functions complete in init().
Falls back to last row if all days are complete.

**No-token state:**
Sessions are still fetched from the public GitHub API
(no token needed for reads on public repos). All rows
render with session data when available. Notice shown
only when no token AND no sessions exist:
"Connect the workout companion app to see logged sessions."

---

### Session Count Logic

Completed sessions for a phase uses two sources and
takes the higher value:
1. Session files: non-bonus sessions where
   phase === activePhase.id
2. lastCompleted pointer: count of scheduled days in
   the active phase at or before lastCompleted week/day

Remaining = total scheduled days in active phase minus
completed count. Bonus sessions are never counted.

---

### Data Sources and Caching

| Source | URL | Cache key | TTL |
|--------|-----|-----------|-----|
| athlete.json | raw GitHub URL | athleteCache | 24hr |
| program.json | raw GitHub URL | programCache | 24hr |
| sessions/ | GitHub Contents API | sessionsCache | 1hr |

If token absent: athlete.json and program.json sections
render normally. Sessions are fetched from the public
Contents API without auth. Section fetch failures are
isolated — one failure does not blank the whole page.

---

### Out of Scope — Build 2

- Editing any data from the dashboard
- Nutrition tracking
- Adding sessions manually
- Push notifications
- Authentication beyond reusing Build 1 token

---

## Out of Scope — Both Builds

- Oura Ring or Apple Health sync (future)
- Any AI or LLM API calls (none, ever)
- Multiple athlete support

---

## Spec Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-22 | Initial spec created | Build 1 kickoff |
| 2026-03-27 | Phases 4 & 5 built: Screen 4, GitHub API write, success flow | Build complete |
| 2026-03-27 | Calf rating changed from float 0–3 (0.5 steps) to integer 0–10. Hint text added. | Program uses 0–10 pain scale |
| 2026-03-27 | Skill ratings (grip, shoulder, monkey bars) made conditional on workout content | Monkey bars shouldn't appear on days without them |
| 2026-03-27 | Cardio and Rehab card types added to Screen 3 | program.json contains these types |
| 2026-03-28 | Build 2 dashboard.html built and live | Build 2 complete |
| 2026-03-28 | Dashboard: Training Timeline moved to position 2, Operation Spartan Progress merged into timeline expand card | Timeline is the centerpiece |
| 2026-03-28 | Dashboard: Milestone redesign — two-row layout (marker row + blocks row), tappable expand cards | Milestones were overlapping blocks |
| 2026-03-28 | Dashboard: Race countdown changed to live 4-unit widget (days/hrs/min/sec), label sourced from upcoming milestone in athlete.json | More motivating than static day count |
| 2026-03-28 | Dashboard: Session count uses two-source logic (file count vs lastCompleted pointer, take higher) | App had no session history before Build 1 |
| 2026-03-28 | Dashboard: Week 10 calf gate added to program.json | Missing field causing &mdash; render bug |
| 2026-03-29 | Pull-Up Superset split into two blocks: standalone Pull-Ups 5×5 + Row/Press Superset 3 rounds | Clearer structure in app and training log |
| 2026-03-29 | Grip Finisher changed to finisher_circuit type with round-based UI | Flat checklist didn't communicate circuit intent |
| 2026-03-29 | Auto-save / session restore added to Screen 3 (workoutProgress localStorage key) | Accidental navigation was wiping in-progress data |
| 2026-03-29 | Dashboard: Recent Sessions replaced by Training Log (all 32 days, chronological) | User wants to scroll ahead and see upcoming workouts |
| 2026-03-29 | Dashboard: Run Progression table removed; run protocol + calf gate inline on Day 2 Training Log rows | Consolidation — same data, fewer sections |
| 2026-03-29 | Dashboard: Section count reduced from 7 to 6 | Run Progression removed |
| 2026-03-29 | Dashboard: Training Log auto-scroll moved to post-render init() call at 150ms | Previous 80ms scroll fired before layout painted |
| 2026-04-14 | Cross-device sync: sessions fetched without token via public GitHub Contents API; resolveLastCompleted derives pointer from session files + localStorage (higher wins); localStorage updated when session files show more progress | Desktop wasn't seeing workouts logged on mobile |
| 2026-04-14 | Skill Trends gate changed from hasToken to hasToken && sessions.length — renders when session data exists regardless of token | Skill Trends was blank on token-less devices with available session data |
| 2026-04-21 | Session file fetches use GitHub Contents API exclusively (api.github.com) — raw.githubusercontent.com eliminated | CORS failures on corporate/managed networks (Imprivata endpoint security) |

*This table is updated by Chat whenever the spec changes.*
