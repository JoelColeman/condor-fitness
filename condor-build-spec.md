# Condor Fitness — Build Spec
Version 1.3 — March 28, 2026
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
Phone and desktop. Reads athlete.json, program.json,
and sessions/. Displays full athletic timeline, PR
board, body weight trend, skill history, run
progression, phase checkpoints, and forward-looking
goals.
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
| `lastCompleted` | Object: `{ week: N, day: N }`. Updated after each saved non-bonus session. Drives next workout logic. Default: week 3, day 1. |
| `programCache` | Cached copy of program.json with timestamp. Re-fetched if older than 24 hours. |
| `athleteCache` | Cached copy of athlete.json with timestamp. Re-fetched if older than 24 hours. |
| `sessionsCache` | Cached copy of all session files with timestamp. Re-fetched if older than 1 hour. |

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
- Grip endurance: 1–5 — shown if workout contains a finisher
  or any exercise with "farmer" or "carry" in the name
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
5. Show success screen with green ✓ and next workout preview
6. If GitHub write fails: show inline error + "Copy JSON"
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
A read-only training dashboard. Shows where you've been,
where you are, and what's coming. Updates automatically
as session files accumulate in sessions/.

Single file: dashboard.html.
Stack: vanilla HTML, CSS, JavaScript. No frameworks.
No npm. No build tools. No API keys.

Phone and desktop compatible.

---

### Navigation

dashboard.html header:
- Left: "CONDOR FITNESS" wordmark
- Right: "← Workout" link → index.html

index.html Screen 2: "Dashboard →" link below the
three main buttons.

---

### Sections (top to bottom)

#### 1. Race Countdown
Compact banner at top. Live countdown updating every
second showing days, hours, minutes, and seconds:

  [63]  [14]  [38]  [28]
  DAYS   HRS   MIN   SEC

Below the numbers: a single label sourced from the
first milestone entry in athlete.json where
result === "upcoming". Format:
  {label} — {subtitle} — {M.DD.YY}
Example: "Spartan Super 10K — Colorado Springs, CO — 5.31.26"

After race date passes: clear interval, show
"Race Complete 🏆".

#### 2. Training Timeline
Horizontal scrolling timeline. Two-row layout:
- Marker row (top, ~44px): milestone diamonds positioned
  by date. Each diamond has a label and date below it.
  Gold color for Spartan Super 10K milestone.
- Blocks row (below): colored horizontal block bars
  for each training block, labeled with name and subtitle.

Active block (status: "active"): red accent border.
On load: scrolled so active block is centered.

Tap/click any block or milestone diamond: expand a
details panel below the timeline showing summary and
highlights. Click again to collapse.

For the Operation Spartan block specifically, the
expand panel also shows:
- Mini phase timeline: Foundation → Volume Build →
  Race Specific → Taper (pills connected by arrows)
  Active phase highlighted red. Completed phases dimmed.
- Sessions completed this phase (using higher of:
  session file count OR lastCompleted pointer count)
- Sessions remaining in active phase

#### 3. Body Weight
SVG line chart. No external libraries.
Plots all body_weight entries from athlete.json.
Dashed horizontal line at 250 lbs: "Race Day Target".
Dashed vertical line at 2026-05-31: "Race Day".
Data point labels always visible.
Y axis: data range with 10 lb padding.
X axis: April 2025 through June 2026.

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

#### 6. Run Progression
Table from program.json. Week column is sticky on
mobile scroll. Columns: Week / Protocol / Calf Gate.
Current week highlighted. Completed run weeks marked ✓.
Calf gate values decoded from HTML entities before
display.

#### 7. Recent Sessions
Last 10 sessions from sessions/, newest first.
Each row: date / day_label / duration / overall_feel
(dots) / calf_rating.
Tap to expand full session detail.
If no sessions: "No sessions recorded yet."
If no token: "Open the workout companion app first."

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
| sessions/ | GitHub API | sessionsCache | 1hr |

If token absent: athlete.json sections render normally.
Sessions-dependent sections show a friendly notice.
Section fetch failures are isolated — one failure does
not blank the whole page.

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
| 2026-03-28 | Dashboard: Run progression Week column sticky on mobile | Column was clipping on scroll |
| 2026-03-28 | Dashboard: Week 10 calf gate added to program.json | Missing field causing &mdash; render bug |

*This table is updated by Chat whenever the spec changes.*
