# Condor Fitness

**Repo:** https://github.com/JoelColeman/condor-fitness
**Live:** https://joelcoleman.github.io/condor-fitness/
**Dashboard:** https://joelcoleman.github.io/condor-fitness/dashboard.html
**Stack:** Vanilla HTML, CSS, JavaScript. No frameworks, no npm, no build tools.
**Drive location:** NetTerminalGene - Drive > GitHub > condor-fitness
**Last updated:** April 27, 2026

---

## Section A — Project Spec
*Owner: Chat. Code reads, never edits. If reality departs from
this spec, Code logs the deviation in Section B.*

### What Is Being Built

**Build 1 — Workout Companion (index.html)**
A phone-first single-page workout companion app. The user opens it on their phone at the gym, sees their next workout, taps through sets, logs actual weights and times, then saves a session record to the repo when done.

**Build 2 — Training Dashboard (dashboard.html)**
Phone and desktop. Reads athlete.json, program.json, and sessions/. Displays full athletic timeline, PR board, body weight trend, skill history, phase checkpoints, and forward-looking goals. Status: Complete. Live at /dashboard.html.

### App State (localStorage)

| Key | Description |
|-----|-------------|
| `githubToken` | GitHub personal access token. Requires Contents: read/write on the condor-fitness repo. Set once on first run. |
| `githubRepo` | Repo string: "JoelColeman/condor-fitness". Set once on first run. |
| `lastCompleted` | Object: `{ week: N, day: N }`. Updated after each saved non-bonus session. Also updated by dashboard cross-device sync when session files show more progress than localStorage. Drives next workout logic. Default: week 3, day 1. |
| `programCache` | Cached copy of program.json with timestamp. Re-fetched if older than 24 hours. |
| `athleteCache` | Cached copy of athlete.json with timestamp. Re-fetched if older than 24 hours. |
| `sessionsCache` | Cached copy of all session files with timestamp. Re-fetched if older than 1 hour. |
| `workoutProgress` | Auto-saved in-progress workout state. Schema: `{ week, day, savedAt, completed[] }`. TTL: 4 hours. Cleared on successful session save, refresh confirm, and new workout start. |

### App Flow — Screen by Screen

**Screen 1 — First Run Setup**
Shown only if `githubToken` is not in localStorage.
Fields: GitHub Personal Access Token, Repo name (pre-filled: JoelColeman/condor-fitness), Last completed: Week [3–10] Day [1–4] (default: Week 3, Day 1).
Save → writes all to localStorage → go to Screen 2.

**Screen 2 — Pre-Workout Prompt**
Shown on every load after setup. Reads `lastCompleted`, finds next workout in program.json. Displays "Next up:" with week/day/label and phase/date range.

Three buttons: Start this workout → Screen 3, Swap to alternate → Alternate selector, + Bonus session → Day type selector. Footer row at bottom of main panel: "Update token" link (clears `githubToken` from localStorage and routes to Screen 1) · Dashboard link to dashboard.html. Both rendered in `--text-secondary` at `--font-meta`, padded for ≥44px touch target.

Alternate Selector: Lists alternates for this day from program.json. Each tappable → load in Screen 3. If none available: show message, return to Screen 2.

Bonus Session: Four buttons: Strength / Run / Engine / Circuit. Loads random alternate of that type from current phase (searches all weeks in the phase). Does NOT advance `lastCompleted` on save. Session saved with `"bonus": true` flag.

**Screen 3 — Active Workout**
Header: "Week [X] Day [Y] — [Label]" + elapsed timer. Refresh button in header — confirm dialog before swapping (clears workoutProgress).

Auto-save / Restore: After every set check or round tap, completion state saved to `workoutProgress` in localStorage. On load, if `workoutProgress` matches current week/day and is less than 4 hours old, completed cards are restored with a "Session in progress restored. [Clear]" banner. Only card-level completion is restored — individual set inputs are not restored.

Exercise Cards — one card per exercise, collapsed by default, current auto-expanded, tap header to expand, completed cards show green checkmark:

- **Strength Card:** weight + reps inputs per set, pre-filled with targets. Checking last set auto-collapses and advances.
- **Timed Card:** duration input per set (carries, hangs), pre-filled with target.
- **Run/Walk Interval Card:** interval checkboxes per round + "Mark all complete" button. No rest timer.
- **Circuit Card:** exercise reference list + "Complete round N" buttons.
- **Finisher Circuit Card** (`type: "finisher_circuit"`): Used for Grip Finisher blocks. Subtitle: "[N] rounds · No rest within round". Exercise reference list + one "Complete round N" button per round. No rest timer within rounds.
- **Superset Card:** Sub-exercise sections with weight+reps or duration inputs. If `ex.rounds` present: subtitle shows "[N] rounds · [ExName1 + ExName2]". Otherwise: "Superset · N exercises".
- **Cardio Card:** Single "Mark complete" checkbox (e.g. Stair Stepper, Row Erg).
- **Rehab Card:** Per-sub-exercise "Done" checkboxes (e.g. Calf Rehab).

Rest Timer: Auto-starts when a set is checked. Full-screen overlay, 80px+ countdown, semi-opaque dark background. Tap anywhere or "Skip" to dismiss. Defaults from program.json `rest_timer_defaults_sec`: strength 120s, circuit_round 90s, circuit_round_phase3 60s, grip_finisher 0s.

"Finish Workout" button visible after first set is logged.

**Screen 4 — End of Session Summary**
Displays workout label and duration at top.

Always shown: Overall feel (1–5, required), Calf rating (0–10 integers, optional, hint: "0 = none, >2 = flag"), Notes (free text).

Conditionally shown (based on exercises): Grip endurance (1–5, shown if finisher_circuit or "farmer"/"carry" in name), Shoulder stability (1–5, shown if timed exercise or "pull-up"/"row" in name), Monkey bars (1–5, shown if "monkey" in name). All skill ratings optional even when shown.

On Save: Validate feel (required), assemble session JSON, write `sessions/YYYY-MM-DD.json` to GitHub via API, if not bonus advance `lastCompleted`, clear `workoutProgress`, show success with next workout preview. On failure: inline error + "Copy JSON" fallback. Do not advance `lastCompleted`.

### Session JSON Schema

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

Schema notes: `calf_rating` integer 0–10 (lower is better, omitted if not rated). `skills` object contains only keys for ratings shown AND filled in (may be empty `{}`). `overall_feel` integer 1–5 (required). `skills: {}` is written when no skill fields are shown/filled (key present, value empty object).

### Design Spec

Phone-first. Dark theme. Clean and minimal. Used between sets — not admired.

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

Typography: `system-ui, -apple-system, sans-serif`. Exercise names 16px bold. Set rows 15px. Meta/labels 13px secondary. Touch targets: minimum 44px height. Active card: left border in accent color.

### GitHub API — Session Write

```
PUT https://api.github.com/repos/{owner}/{repo}/contents/sessions/{filename}
Headers: Authorization: token {githubToken}, Content-Type: application/json
Body: { "message": "Add session YYYY-MM-DD", "content": "{base64}", "sha": "{if updating}" }
```

Check if file exists: `GET .../contents/sessions/{filename}`. On failure, surface "Copy JSON" fallback. Base64: `btoa(unescape(encodeURIComponent(JSON.stringify(sessionData, null, 2))))`.

### GitHub API — Session Read (Dashboard)

All session file reads use GitHub Contents API exclusively (`api.github.com/repos/.../contents/...`). Never use `raw.githubusercontent.com` — it fails CORS on corporate/managed networks.

Directory listing: `GET .../contents/sessions/` returns array with `url` field (Contents API URL for each file).

Individual file read: `GET {file.url}` returns JSON with base64 `content` field. Decode: `JSON.parse(decodeURIComponent(escape(atob(response.content.replace(/\n/g, '')))))`.

Auth header passed when token exists (5000 req/hr), omitted when absent (60 req/hr, sufficient for dashboard reads on public repos). Sessions always fetched regardless of token presence — enables cross-device sync.

### Cross-Device Sync (Dashboard)

`resolveLastCompleted(sessions)` compares two sources, takes the higher value:
1. localStorage `lastCompleted` on current device
2. Furthest non-bonus `{week, day}` found in session files from GitHub

Higher week wins; tie → higher day wins. Resolved value passed to `renderTrainingLog`, `renderTimeline`, `buildMiniPhaseTimeline`. If session files show more progress than localStorage, localStorage updated immediately.

### Workout Pointer Logic

Sequential only — no date logic. `nextWorkout()`: find next day in current week, advance to next week day 1 when exhausted, return null when program complete. On save (non-bonus): set `lastCompleted` to `{week, day}` just completed. `nextWorkout()` is inlined in both Screen 2 and Screen 4 IIFEs (self-contained, no cross-IIFE dependency).

### Dashboard Sections

**Section order:** Race Countdown, Training Timeline, Body Weight, PR Board, Skill Trends, Training Log (6 sections total).

**1. Race Countdown:** Live 4-unit widget (Days/Hrs/Min/Sec), updates every second. Label from first upcoming milestone in athlete.json timeline (type "milestone", result "upcoming"), format M.DD.YY. After race date: "Race Complete 🏆".

**2. Training Timeline:** Horizontal scroll container. Blocks proportionally sized by duration. Milestones in separate 44px marker row above blocks row (two-row layout). Active block has accent border. Tap/click to expand detail panel.

Operation Spartan expand card: mini phase timeline — four phase pills (Foundation → Volume Build → Race Specific → Taper) connected by arrows. Active: accent background. Completed: 0.4 opacity. Future: muted. Below pills: session count and remaining days (two-source logic). Auto-scrolls to active block on load.

**3. Body Weight:** SVG line chart. X axis April 2025–June 2026. Y axis: data range with 10 lb padding. Dashed red vertical at May 31 (Race Day). Dashed green horizontal at 250 lbs target. Data point labels always visible.

**4. PR Board:** Two columns — Current PRs (highest weight per lift from athlete.json prs array) / PR Goals (from athlete.json pr_goals). One row per lift.

**5. Skill Trends:** Three rows: Calf Rating / Grip Endurance / Shoulder Stability. SVG sparklines of last 10 sessions. Trend arrow (last-3 avg vs prev-3 avg). Calf: lower is better, red dot > 2. Skills: higher is better. < 2 data points: "Not enough data yet". Renders when session data available regardless of token (gate: no token AND no sessions).

**6. Training Log:** All 32 program days (Weeks 3–10, 4 days each) in chronological order, grouped by week with week header separators ("Week N — [dates]" + phase pill).

Row states: *Logged* (session exists) — date, label, session snapshot (feel dots + workout highlight + calf), tap to expand detail, one open at a time. *Skipped* (past, no session) — date/label, exercise preview sub-line, opacity 0.45, tappable with future detail. *Next* — "NEXT" badge + accent border, expanded by default, exercise preview (first 3 names, skip "Scapular", truncate with "…"). *Future* — label + exercise preview, opacity 0.65, tappable with future detail. All rows tappable with chevron indicators.

Session snapshot on logged rows: feel dots + workout highlight (priority: first strength set "335×5 Squat", then rounds_completed, then duration_min) + "Calf: N/10" below.

Day 2 rows: second sub-line with `[run_protocol] · [calf_gate]` (HTML entities decoded). All row states.

Scrollable log window: 420px mobile, 520px desktop. Internal scroll to NEXT row on load (container-relative, 8px breathing room). No page-level auto-scroll.

No-token state: sessions still fetched from public API. Notice shown only when no token AND no sessions.

### Session Count Logic

Two sources, take higher: (1) Session files: non-bonus where phase === activePhase.id. (2) lastCompleted pointer: scheduled days in active phase at or before pointer. Remaining = total phase days minus completed. Bonus never counted.

### Data Sources and Caching

| Source | URL | Cache key | TTL |
|--------|-----|-----------|-----|
| athlete.json | raw GitHub URL | athleteCache | 24hr |
| program.json | raw GitHub URL | programCache | 24hr |
| sessions/ | GitHub Contents API | sessionsCache | 1hr |

Fetch failures isolated — one failure does not blank the whole page.

### Out of Scope

Both builds: Oura Ring / Apple Health sync, AI/LLM API calls, multiple athlete support.
Dashboard only: Editing data, nutrition tracking, adding sessions manually, push notifications, auth beyond reusing Build 1 token.

### Spec Change Log

| Date | Change |
|------|--------|
| 2026-03-22 | Initial spec created |
| 2026-03-27 | Phases 4 & 5 built: Screen 4, GitHub API write, success flow |
| 2026-03-27 | Calf rating changed from float 0–3 to integer 0–10 |
| 2026-03-27 | Skill ratings made conditional on workout content |
| 2026-03-27 | Cardio and Rehab card types added |
| 2026-03-28 | Dashboard built and live |
| 2026-03-28 | Timeline moved to position 2, Operation Spartan Progress merged into expand card |
| 2026-03-28 | Milestone redesign — two-row layout |
| 2026-03-28 | Race countdown changed to live 4-unit widget |
| 2026-03-28 | Session count uses two-source logic |
| 2026-03-28 | Week 10 calf gate added to program.json |
| 2026-03-29 | Pull-Up Superset split into standalone Pull-Ups + Row/Press Superset |
| 2026-03-29 | Grip Finisher changed to finisher_circuit type |
| 2026-03-29 | Auto-save / session restore added (workoutProgress key) |
| 2026-03-29 | Recent Sessions replaced by Training Log (all 32 days) |
| 2026-03-29 | Run Progression removed, protocol inline on Day 2 rows |
| 2026-03-29 | Section count 7 → 6 |
| 2026-03-29 | Training Log auto-scroll moved to init() at 150ms |
| 2026-04-14 | Cross-device sync: sessions fetched without token, resolveLastCompleted, localStorage updated from session files |
| 2026-04-14 | Skill Trends gate: renders when session data exists regardless of token |
| 2026-04-21 | Session reads use Contents API exclusively — raw.githubusercontent.com eliminated |
| 2026-04-23 | Training Log redesign: scrollable window, collapsed cards with tap-to-expand, session snapshot on logged rows |
| 2026-04-26 | Migration to v3.2 workflow: condor-build-spec.md absorbed into Section A, condor-build.md absorbed into Section B |
| 2026-04-26 | Screen 2 footer row adds "Update token" link — clears `githubToken` and returns to Screen 1, enabling in-app token reset on any device |
| 2026-04-27 | Training Log expand panels now render the full prescribed exercise tree (sets/reps/weight/duration plus sub-exercises inside circuits, finishers, supersets, rehab, blocks, and movement complexes) on every row state. Logged rows show session summary first, then prescribed tree below |
| 2026-04-27 | Companion app (Screen 3) cards now show exercise detail inline: notes line below title on Strength/Timed/Run/Cardio; Circuit/Finisher Circuit sub-exercise reference list shows reps/weight/duration with `reps_note`/`weight_note`; complex sub-exercises render their movement sequence as a sub-line; Superset and Rehab sub-exercises render their `notes` below the label |

---

## Section B — Build Log
*Owner: Code. Updated as part of every commit.*

### Build Status

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
| Fix: CORS on unauthenticated session fetches | Use Contents API instead of raw.githubusercontent.com when no token | ✅ Complete |
| Fix: Contents API for ALL session fetches | Eliminate raw.githubusercontent.com from token path too — single code path | ✅ Complete |
| Dashboard — Training Log Redesign | Scrollable log window + collapsed cards + session snapshot | ✅ Complete |
| v3.2 Migration | Merge build docs into CLAUDE.md, strategy doc to Drive | ✅ Complete |
| Update Token affordance | Screen 2 footer link to clear `githubToken` and re-route to Screen 1 | ✅ Complete |
| Cross-Device Sync (index.html) | `init()` resolves `lastCompleted` from GitHub session files before Screen 2 | ✅ Complete |
| Restructure complexes (program.json) | Barbell + Landmine complexes pulled out of Main Circuits into standalone circuit blocks with own rounds/rest | ✅ Complete |
| Dashboard — Training Log: Full Exercise Detail | Recursive renderer for all exercise types in expand panel (simple, timed, cardio, run, circuit, finisher, superset, rehab, block, complex). Logged rows show prescribed work below session summary. | ✅ Complete |
| Companion App — Exercise Detail on Cards | Notes line below title on Strength/Timed/Run/Cardio cards. Sub-exercise reps/weight/duration enriched (incl. `reps_note`/`weight_note`) on Circuit/Finisher Circuit reference lists. Complex sub-exercises render movement sequence (`notes`) inline. Superset and Rehab sub-exercises render their `notes` below the label. `decodeHtml` helper added for entity safety. | ✅ Complete |
| Summer Program Rollout — Task 1 (Program-change reset) | `init()` (index.html) loads program first, computes `programKey = meta.program + ' v' + meta.version`, and on mismatch with stored `programKey` resets `lastCompleted` to `{week: start_week, day: 0}`, drops `programCache`/`sessionsCache`/`workoutProgress`, stores new key. Runs before cross-device sync. `getProgram` exposed via `window.getProgram`. | ✅ Complete |
| Summer Program Rollout — Task 2 (Program-aware matching) | Shared `inCurrentProgram(session, prog)` helper (in index.html init scope and dashboard.html). Filters cross-device sync (`resolveLastCompleted` now takes `prog`) and the Training Log `sessionMap` to sessions whose `phase` is in the current program. Old Spartan sessions no longer bleed into summer weeks. Skill Trends left cross-block. | ✅ Complete |
| Summer Program Rollout — Task 3 (Phase-timeline gate) | Timeline expand mini-phase pills now gated on `item.show_phase_timeline` (data-driven) instead of `item.id === 'operation_spartan'`. | ✅ Complete |
| Summer Program Rollout — Task 4 (Training Log entity bug) | Session set values in the Training Log expand panel now run through `decodeHtml()` before `esc()` (`esc(decodeHtml(sets))`), so bodyweight `&#10003;` renders as ✓ instead of raw entity text. | ✅ Complete |
| Dashboard — Anchor/week from meta | dashboard.html week/phase math is now data-driven. New `getAnchorDate()` reads `prog.meta.anchor_date` (fallback to the `ANCHOR_DATE` const). `getCurrentWeekNum()` derives the week from that anchor + `prog.meta.start_week` (fallback 3) instead of the hardcoded `3 + floor(days/7)`. `getActivePhase()` fallback now uses `getAnchorDate()`. `prog` promoted to a module-level `var` (assigned in `init()`) so the top-level helpers can read it. Operation Recomp (anchor 2026-06-08, start_week 1) now resolves week 1 / Rebuild on race-block start instead of falling back to the last phase. | ✅ Complete |
| Supabase Migration — Phase 2a (cutover) | Data layer moved off GitHub-as-database onto Supabase + Google OAuth. New `app-shared.js` at repo root: Supabase client (project URL + publishable key hardcoded, public-safe under RLS), the helpers formerly duplicated across both HTML files (`esc`, `decodeHtml`, `inCurrentProgram`, `nextWorkout`, `resolveLastCompleted`, `todayLocalDate`), and the data functions (`fetchActiveProgram`, `fetchSessions`, `fetchAthleteProfile`, `fetchBodyWeight`, `fetchPRs`, `saveSession`). Both HTML files load supabase-js v2 from CDN then `app-shared.js`. `002_owner_only_policies.sql` replaces 001's authenticated-CRUD policies with owner-email-only policies on all six tables. | ✅ Complete |
| Supabase Migration — index.html | Screen 1 is now a Google sign-in screen (`signInWithOAuth`, `redirectTo: location.href`); `init()` is an auth guard. Deleted: `githubToken`/`githubRepo` localStorage keys, Screen 1 token/repo/week form + handlers, `writeSessionToGitHub()`, the `programCache` TTL cache, and the list-then-fetch-each-file session sync (N+1 → one `fetchSessions()` query). Screen 2's "Update token" link became "Sign out". Session save goes through `Condor.saveSession()`; copy-JSON fallback retained on failure. | ✅ Complete |
| Supabase Migration — dashboard.html | Same auth guard and shared client. All reads from Supabase (sessions+sets, body_weight, prs, athlete_profile, active program) via five parallel queries with isolated failures. Removed: all TTL cache machinery (`readCache`/`writeCache`/`fetchWithCache`/`fetchSessions`, `TTL_24H`/`TTL_1H`, `athleteCache`/`programCache`/`sessionsCache`), the dead Spartan race countdown (section 1 markup, CSS, `renderCountdown`, hardcoded `2026-05-31`), the `ANCHOR_DATE` fallback const, the hardcoded body-weight x-axis range, and the `hasToken` plumbing on three render functions. Section count 6 → 5. | ✅ Complete |
| Supabase Migration — backfill guard | `scripts/backfill-supabase.ts` now refuses `--apply` without `--i-understand-this-wipes-supabase`, prints a warning when both are passed, and carries a top-of-file notice that Supabase is the source of truth and `sessions/` is frozen. `backfill:apply` npm alias removed so the destructive path can't be run by muscle memory. | ✅ Complete |

### Spec Deviations

| Date | What Changed | Why | Spec Update Needed |
|---|---|---|---|
| 2026-03-28 | Body weight chart labels always visible (spec: hover on desktop) | Hover in SVG is complex without per-element JS; always-visible is more useful | Updated in spec |
| 2026-03-28 | Phase active detection uses anchor-date week math, not ISO parsing | program.meta.phases has display strings, not ISO dates | No — equivalent behavior |
| 2026-03-28 | PR Board shows one row per lift (highest weight), not all entries | Spec says "highest weight entry per lift" — implemented literally | No — matches intent |
| 2026-03-28 | Operation Spartan Progress removed as standalone section | Per task prompt — merged into timeline expand card | Updated in spec |
| 2026-03-28 | Milestone two-row layout (separate 44px marker row) | Original diamonds overlapped block bars | Updated in spec |
| 2026-03-28 | Timeline moved to position 2 | Per task prompt | Updated in spec |
| 2026-03-28 | Mini phase timeline in Operation Spartan expand card | New feature per task prompt | Updated in spec |
| 2026-03-28 | Countdown live 4-unit widget | Per task prompt — replaces "X days to race" | Updated in spec |
| 2026-03-28 | Countdown label from upcoming milestone | Per task prompt — replaces phase label/dates | Updated in spec |
| 2026-03-28 | calf_gate rendered without esc() sanitization | Value from trusted program.json; decodeHtml() only | No — safe for trusted source |
| 2026-03-29 | Pull-Up Superset split into two blocks | Per task prompt | Updated in spec |
| 2026-03-29 | Grip Finisher uses finisher_circuit type with round buttons | Per task prompt — replaces flat checklist | Updated in spec |
| 2026-03-29 | Auto-save / session restore (workoutProgress key) | New feature per task prompt | Updated in spec |
| 2026-03-29 | Recent Sessions replaced by Training Log | Per task prompt — all 32 days chronological | Updated in spec |
| 2026-03-29 | Run Progression removed, protocol inline on Day 2 rows | Per task prompt — consolidation | Updated in spec |
| 2026-03-29 | Section count 7 → 6 | Run Progression removed | Updated in spec |
| 2026-03-29 | Auto-scroll moved to init() at 150ms | Previous 80ms fired before layout painted | Updated in spec |
| 2026-04-14 | Sessions fetched on all devices, not just token-holding | Public GitHub Contents API works without auth | Updated in spec |
| 2026-04-14 | Skill Trends renders from session data on token-less devices | Gate changed from hasToken to hasToken && sessions.length | Updated in spec |
| 2026-04-14 | Training Log renders logged rows on token-less devices | sessionMap gate on hasToken was latent bug | Updated in spec |
| 2026-04-23 | Training Log redesigned with scrollable window, tap-to-expand all rows, session snapshots | Per task prompt | Updated in spec |
| 2026-04-27 | index.html `init()` also runs cross-device sync (was dashboard-only) | Per task prompt — desktop showed stale pointer when mobile saved a session | Spec update needed: Section A "App State" line for `lastCompleted` and "Cross-Device Sync" subsection should drop "(Dashboard)" qualifier — both index.html and dashboard.html now resolve from session files |
| 2026-04-27 | Complexes restructured from embedded circuit exercises to standalone circuit blocks with dedicated rounds and rest. Chat-directed change. | Burying a complex as one station in a fast circuit rushed it and lost training value | Chat-owned content edit per explicit direction; no Section A spec change needed |
| 2026-04-27 | Training Log expand renders full prescribed exercise tree on every row state (logged, skipped, NEXT, future). Logged rows show session summary first, then "Prescribed" tree. Sub-exercises inside circuits/finishers/supersets/rehab/blocks render via recursive walker. | Per task prompt — previous expand only showed flat top-level names and never recursed into `exercises_in_circuit` etc. | Spec update needed: Section A "Training Log" should describe expand content as full prescribed tree (currently says "future detail" without specifying depth) |
| 2026-04-27 | Renderer adds three quality-of-life touches not in prompt's literal examples: `target_weight_lbs: 0` treated as bodyweight (Pull-Ups in supersets — would otherwise show "@ 0 lbs"); `reps_note` (e.g., "per leg") appended inline to sets×reps; "1 round" singular instead of "1 rounds". | Direct readability fixes surfaced during manual trace against `program.json` | No spec change — minor presentation polish within the spirit of the prompt |
| 2026-04-27 | Companion app card detail uses `·` separator throughout (e.g. "4×15 · 50 lbs") rather than the `@` shown in the prompt's example ("4×15 @ 50 lbs"). | Matches existing app-wide convention (strength card subtitle, dashboard prescribed renderer); single separator is easier to read on phone. | No spec change — presentation choice within scope |
| 2026-04-27 | Companion app applies the same bodyweight (`target_weight_lbs > 0`) guard inside the Superset card that the dashboard renderer uses — keeps Pull-Ups inside Row+Press Superset from displaying "0 lbs". | Pull-Ups are no longer their own block in some weeks but still appear inside supersets with `target_weight_lbs: 0`. | No spec change — parity with dashboard |
| 2026-06-08 | New `programKey` localStorage key + program-change reset in index.html `init()`. On a new program, `lastCompleted` resets to `{week: start_week, day: 0}` and caches are dropped. | Operation Recomp v1 replaced Spartan v3; devices carried Spartan pointers (e.g. week 7) that pointed into wrong summer weeks. | Spec update needed: Section A "App State" should document the new `programKey` key and the program-change reset behavior |
| 2026-06-08 | Session→program-day matching is now program-aware via `inCurrentProgram(session, prog)` (phase id ∈ `meta.phases`). Applied to `resolveLastCompleted` (both files) and Training Log `sessionMap`. Skill Trends intentionally left cross-block. | Spartan and Recomp both use weeks numbered with overlap (Recomp 1–8); without filtering, old week-7 Spartan sessions appeared on summer week-7 rows. | Spec update needed: "Cross-Device Sync" and "Session Count Logic" should note in-program filtering |
| 2026-06-08 | Training Log expand `&#10003;` entity bug fixed: set values are decoded before `esc()`. | Bodyweight sets stored/emitted a `&#10003;` entity that `esc()` then double-escaped to literal text. | No spec change — bug fix |
| 2026-06-08 | dashboard.html week/phase math made data-driven: `getAnchorDate()` + `getCurrentWeekNum()` now derive from `prog.meta.anchor_date` and `prog.meta.start_week`; `getActivePhase()` fallback uses `getAnchorDate()`. `ANCHOR_DATE` kept as fallback default. `prog` promoted to a module-level `var`. | `ANCHOR_DATE` (2026-03-22) + `3 + floor(days/7)` were Spartan-anchored; under Operation Recomp `getCurrentWeekNum()` returned ~14, so `getActivePhase()` fell through to the last phase (Consolidate) while the athlete was in week 1 (Rebuild). | No spec change — restores intended behavior under a data-driven anchor; closes the logged Open Task |
| 2026-08-03 | **Data layer moved from GitHub-as-database to Supabase Postgres.** All Contents API reads/writes, `raw.githubusercontent.com` fetches, base64 encode/decode, and the list-then-N+1 session fetch are gone. New `app-shared.js` holds the client and every read/write. | Phase 2a cutover per task prompt. GitHub-as-database required a PAT on every device, was rate-limited, and needed an N+1 fetch per dashboard load. | **Spec update needed (Section A):** the "GitHub API — Session Write", "GitHub API — Session Read (Dashboard)", and "Data Sources and Caching" subsections describe a data layer that no longer exists and should be replaced with the Supabase equivalents. |
| 2026-08-03 | **Auth model changed from GitHub PAT to Google OAuth via Supabase.** Screen 1 is now a single "Sign in with Google" button; both pages hold an auth guard on load. Screen 2's "Update token" footer link became "Sign out". | RLS policies in migration 002 scope every table to `jchriscole@gmail.com`, so the publishable key is safe in client code and no secret is entered on-device. | **Spec update needed (Section A):** "Screen 1 — First Run Setup" and the Screen 2 footer description still describe token entry. |
| 2026-08-03 | **localStorage keys `githubToken`, `githubRepo`, `programCache`, `athleteCache`, `sessionsCache` removed.** Surviving keys: `lastCompleted`, `programKey`, `workoutProgress`. Program is held in memory for the page's life (`window.__program`) instead of a 24h TTL cache. | Supabase reads are fast and authenticated per-session; the TTL cache layer existed only to stay under GitHub's 60 req/hr unauthenticated limit. | **Spec update needed (Section A):** the "App State (localStorage)" table lists five keys that no longer exist. |
| 2026-08-03 | Race countdown section removed from dashboard.html (markup, CSS, `renderCountdown`, its interval, the hardcoded `RACE = 2026-05-31`, and the "Race Day" line in the body-weight chart). Dashboard is now 5 sections, not 6. | The Spartan race passed on 2026-05-31; the widget read "Race Complete 🏆" indefinitely and the chart drew a red line in the past. | **Spec update needed (Section A):** "Dashboard Sections" still lists Race Countdown as section 1 and says 6 sections. |
| 2026-08-03 | Body-weight chart x-axis derived from the data range (first day-of-month to last month +1) instead of the hardcoded April 2025–June 2026 window. `ANCHOR_DATE` fallback removed entirely — `getAnchorDate()` returns null when `prog.meta.anchor_date` is absent, and the week/phase helpers are null-safe. | Both were Spartan-era constants that silently mis-render under any later program. | **Spec update needed (Section A):** "Body Weight" section specifies the fixed axis range. |
| 2026-08-03 | Checkmark rendering hardened beyond the brief: `buildDetailHtml()` now emits literal `✓`/`○` rather than generating `&#10003;`/`&#9675;` and relying on decode-before-escape. Exercise names also run through `decodeHtml()` before `esc()`. | The reported `&#10003;` bug was **already fixed** at its only site (decode ordering was correct). Rather than fabricate a fix, the entity is no longer generated at all, so the ordering mistake cannot resurface. | No spec change — bug-class elimination |
| 2026-08-03 | Session date was already local-device time (`getFullYear/getMonth/getDate`), not `toISOString()`. Moved as-is into `Condor.todayLocalDate()` and given an explanatory comment. | The brief asked for a change that had already been made; flagged rather than invented. | No spec change |
| 2026-08-03 | `scripts/backfill-supabase.ts` kept but hard-guarded: `--apply` alone now refuses to run and exits 1; the wipe requires `--i-understand-this-wipes-supabase` as well. Top-of-file comment marks it obsolete and states Supabase is the source of truth. `backfill:apply` npm alias removed from package.json. | Post-cutover the script is destructive: it wipes and replaces all six tables from the now-frozen `sessions/` files, which would delete every session logged after the cutover. Guard design specified by Joel. | No spec change — Section D `sessions/` ownership row should note the directory is now a frozen historical snapshot |

### Discovered Conventions

| Date | Convention | Context |
|---|---|---|
| 2026-04-14 | GitHub Contents API works for public repos without auth header. 60 req/hr per IP. | Cross-device sync implementation |
| 2026-04-14 | Sessions cache TTL (1hr) does not cause stale no-data on first load on new device — cache is absent, fresh fetch occurs. | Cross-device sync |
| 2026-04-14 | sessionMap gate on hasToken was a latent bug — survived Part 1 sync fix. Primary reason resolveLastCompleted "didn't take effect." | Cross-device sync Part 2 |
| 2026-04-21 | raw.githubusercontent.com fails CORS on corporate/managed networks even with valid Authorization header. Imprivata endpoint security intercepts cross-origin requests. Always use Contents API for cross-origin reads. | Session fetch CORS fix |
| 2026-04-21 | Contents API returns base64 content field; download_url is never needed for reading file content via the API. | Session fetch CORS fix |
| 2026-04-21 | Prior build note ("download_url values on individual files are public, no additional change needed") was incorrect — raw.githubusercontent.com fails CORS preflight without auth from GitHub Pages origin. | CORS unauthenticated fix |
| 2026-04-21 | Directory listing from Contents API includes both download_url (raw link) and url (Contents API link). The url field is correct for unauthenticated cross-origin fetches. | CORS unauthenticated fix |
| 2026-04-27 | program.json text fields (notes, calf_gate, reps_note) currently use literal Unicode (e.g. `→`, `×`) — no HTML entities present today. `decodeHtml(str)` added defensively per the Exercise Detail spec so future entity content (`&#10003;`, `&rarr;`) renders as Unicode rather than raw entity strings. Decode-then-`esc` order matters: `esc` escapes `&` first, which would otherwise mangle entities into literal `&amp;#10003;`. | Companion app card detail |
| 2026-06-08 | dashboard.html `ANCHOR_DATE` (2026-03-22) and `getCurrentWeekNum()` (`return 3 + floor(days/7)`) are hardcoded to Spartan's start (week 3, Mar 22). For Operation Recomp (starts week 1, 2026-06-08) these are stale: `getCurrentWeekNum()` returns >8 and `getActivePhase()` falls back to the last phase, so the mini-phase timeline highlights the wrong active phase and Training Log week pills mis-class. Out of scope for the summer-rollout tasks (not in the 4-task prompt) — pills still render, so deferred and flagged below. | Summer program rollout |
| 2026-08-03 | Supabase-js v2 UMD occupies `window.supabase` — that global is the *library*, not a client. Anything the app exports must live elsewhere or it clobbers `createClient`. All app surface is hung off `window.Condor`. | Phase 2a cutover |
| 2026-08-03 | The publishable (anon) key is safe in tracked client code; RLS is the access control. Verified empirically: an unauthenticated client gets `[]` / `null` from every table with **no error** — a non-owner sees an empty dashboard, not a crash. The secret/service-role key bypasses RLS and must never leave `.env.local`. | Phase 2a cutover |
| 2026-08-03 | `fetchSessions()` returns the `raw` jsonb column, not the flattened columns. That column is the exact session-JSON shape both render paths already consume, so the cutover required zero changes to render code. `session_sets` is still written on save for future querying/analytics. Verified: 49/49 rows have non-null `raw` with `exercises[]`. | Phase 2a cutover |
| 2026-08-03 | `sessions.session_date` is unique, which is what makes a same-day re-save idempotent (upsert on conflict). It is also why the session date must come from **local** device time: a 22:30 workout stamped via `toISOString()` files as the next day and collides with the next workout's row. | Phase 2a cutover |
| 2026-08-03 | Supabase requires a filter on `delete()` — it refuses an unqualified delete. `.not('id', 'is', null)` is the idiom for "match everything". | Backfill script |
| 2026-08-03 | Google OAuth requires configuration in the Supabase dashboard that is **not** in this repo: the Google provider must be enabled under Auth → Providers, and every page URL (index.html and dashboard.html on the GitHub Pages origin) registered under Auth → URL Configuration. `redirectTo: location.href` means an unregistered URL fails at redirect time, not at build time. | Phase 2a cutover |
| 2026-08-03 | Node resolves `node_modules` by walking up from the **script file's** location, not the cwd. One-off scripts using repo dependencies must live inside the repo, not `/tmp`. | Phase 2a verification |

### Completed Tasks

See Build Status table above for the complete task list.

### Open Tasks

- [ ] Exercise info icon: small "i" on each exercise card with movement explanation (descriptions drafted by Chat as new field in program.json)
- [ ] Timed exercise timer: countdown timer for exercises with duration target (dead hangs, isometric holds, foam roll) — reuse rest timer overlay
- [ ] Scapular pull-ups reorder: position immediately before pull-ups/monkey bars as movement-specific warmup (program.json change, Chat-owned)
- [ ] Dashboard training log: better session summary with more detail on collapsed rows
- [ ] **Section A rewrite for the Supabase cutover (Chat-owned).** Six subsections now describe a data layer that no longer exists — see the 2026-08-03 Spec Deviations rows for the specifics: App State (localStorage) table, Screen 1 — First Run Setup, GitHub API — Session Write, GitHub API — Session Read (Dashboard), Data Sources and Caching, Dashboard Sections (Race Countdown / section count / body-weight axis).
- [ ] **Verify the signed-in render path.** Only the signed-out path was browser-verified during the cutover — the signed-in path needs Joel's Google account. First sign-in on the live site should confirm: program loads, Training Log shows logged rows, Skill Trends renders, and a session save round-trips.
- [ ] **Supabase dashboard prerequisites for sign-in** (one-time, outside the repo): enable the Google provider under Auth → Providers, and register both live page URLs under Auth → URL Configuration. Sign-in cannot work until both are done.

*(Retired 2026-08-03: "Confirm GitHub PAT has contents:write scope on first Code session on any new device" — no PAT is used anymore.)*

### Deferred

- Post-race program design — after May 31
- Post-race app retool — new program.json for strength-biased training

---

## Section C — Content Data
*Owner: Chat. Code reads, never regenerates.*

Content data for this project lives in two Chat-owned JSON files in the repo:

- **athlete.json** — Athletic profile, PRs, body weight history, timeline entries. Chat drafts updates, Joel commits.
- **program.json** — Full Operation Spartan v3 training program (10 weeks, 4 days/week). All exercises, sets, reps, weights, run protocols, calf gates, phase definitions. Chat drafts updates, Joel commits.

Full program detail also lives in `operation_spartan_v3.txt` in Google Drive (Claude Stuff > Condor Fitness) — this is the authoritative program design document. program.json is the machine-readable version derived from it.

Code reads these files. Code never edits, overwrites, or regenerates them.

---

## Section D — File Ownership

| File | Owner | Location | Read Path |
|---|---|---|---|
| `CLAUDE.md` | Split | In repo | Code: local. Chat: Drive. Sections A, C, E: Chat-owned. Section B: Code-owned. |
| `index.html` | Code | In repo | Code: local. Chat: Drive. Use bash heredoc — exceeds 400 lines. |
| `dashboard.html` | Code | In repo | Code: local. Chat: Drive. Use bash heredoc — exceeds 400 lines. |
| `athlete.json` | Chat | In repo | Code: local (read only). Chat: Drive. Never edit, overwrite, or regenerate. |
| `program.json` | Chat | In repo | Code: local (read only). Chat: Drive. Never edit, overwrite, or regenerate. Exceeds token limit — read in 150-line chunks. |
| `condor-strategy.md` | Chat | Drive only (Claude Stuff > Condor Fitness) | Chat: Drive. Code: never. |
| `sessions/` | Runtime | In repo | Written by the app via GitHub API at workout save time. Neither Code nor Chat edits. |

*Only declared owner writes. Code never regenerates Chat-owned content. If a task would require touching a Chat-owned file, Code stops and flags it.*

---

## Section E — Code Conventions
*Both contribute. Promoted from Section B.*

- **Large file writes (>400 lines):** Use bash heredoc (`cat > filename << 'PYEOF'`), never the Write tool — it silently drops content.
- **After every commit:** Run `git diff HEAD~1` and verify changes match intent before moving to next task.
- **After Python script writes:** Verify file exists on disk — silent failure possible.
- **program.json reads:** Exceeds single-read token limits. Read in 150-line chunks using offset/limit.
- **Session files:** Written by the app via GitHub API at runtime. Never create or edit directly.
- **raw.githubusercontent.com:** Never use for session file fetches — fails CORS on corporate/managed networks. Always use GitHub Contents API (`api.github.com`).
- **Contents API base64 decoding:** `JSON.parse(decodeURIComponent(escape(atob(content.replace(/\n/g, '')))))` for Unicode safety.
- **If retrying the same approach more than twice:** Stop. Tell Joel what's blocking rather than continuing to loop.
- **Branch convention:** `git checkout -b claude/your-description-here` — one branch per task, never push to main.
- **PR merge link format:** `https://github.com/JoelColeman/condor-fitness/compare/main...claude/YOUR-BRANCH-NAME`
