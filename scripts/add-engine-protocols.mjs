/**
 * One-shot content pass for Operation Afterburner (2026-09-01, directed by Joel):
 * every circuit gets its work/rest protocol spelled out at the front of `notes`,
 * derived from the block structure + the Chat spec (athletic-cut-v1.md), and the
 * W2D1 EMOM's stations become explicit 60-second minute slots so the interval
 * clock can drive them.
 *
 * Idempotent: notes are SET, not prepended, keyed by (week, day, circuit name).
 *
 *   node scripts/add-engine-protocols.mjs                  # dry run — show planned changes
 *   node scripts/add-engine-protocols.mjs --apply-file     # write program.json
 *   node scripts/add-engine-protocols.mjs --apply-supabase # update active programs row
 *
 * Supabase mode reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local
 * and touches ONLY public.programs (the active Afterburner row), same surgical
 * pattern as PR #26.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROGRAM_PATH = join(REPO_ROOT, 'program.json');
const APPLY_FILE = process.argv.includes('--apply-file');
const APPLY_SUPABASE = process.argv.includes('--apply-supabase');

// (week, day, circuit name) -> full replacement notes
const NOTES = [
  [1, 1, 'Engine — 40/20 Intervals',
    '40s hard / 20s easy, continuous ×14 — row or bike. 14 min. Last 8 rounds in orange (orange = 155–168 bpm). Target ~8 splat min. Week 1 splat target: ~20 min at 155+. Note your actual peak HR — zones assume max 185.'],
  [1, 4, 'Row Block',
    '250m push → 60s base row, straight through ×4 — no rest between rounds. 10 min. Push the 250s into orange (orange = 155–168 bpm).'],
  [1, 4, 'Floor AMRAP',
    'Cycle the four movements continuously — no rest between movements or rounds. 12 min AMRAP — log rounds completed.'],
  [2, 1, 'Engine — EMOM 12',
    'Every minute on the minute ×12: min 1 — bike cals, 40s hard · min 2 — 15 KB swings · min 3 — 30s battle ropes; rest whatever is left of each minute. 4 rounds through. Orange (orange = 155–168 bpm), ~8 splat min. Week 2 splat target: ~22 min at 155+.'],
  [2, 4, 'Row Block',
    '300m push → 45s base row, straight through ×5 — no rest between rounds. 14 min. The main course today — push the 300s to orange (orange = 155–168 bpm).'],
  [2, 4, 'Floor Block',
    '15 swings → 10 push presses → 10 pull-throughs, straight through ×3. 10 min.'],
  [3, 4, 'Row Block',
    '250m push → 45s base row, straight through ×3 — no rest between rounds. 8 min.'],
  [3, 4, 'Floor AMRAP',
    'Cycle the four movements continuously — no rest between movements or rounds. 12 min AMRAP — log rounds completed.'],
  [4, 1, 'Engine — Row Ladder',
    'Row ladder: 250 → 500 → 750 → 500 → 250m; after each rung rest half the time the rung took. Orange (orange = 155–168 bpm) by the 500s. Week 4 splat target: ~28 min at 155+.'],
  [4, 4, 'Tread Block',
    '90s base → 60s push → 30s all-out, straight into the next round — continuous ×4 (12 min). The all-out touches red (168+ bpm). Log a calf rating.'],
  [4, 4, 'Floor Ladder',
    'Rep ladder 21-15-9-15-21 — each round is one rung: swings, push-ups, lunges at the rung count, then row 200m before the next rung. 20 min.'],
  [5, 4, 'Tread Block',
    '90s base → 60s push → 30s all-out, then walk 60s — ×4 (14 min). Log a calf rating.'],
  [5, 4, 'Row Block',
    '300m push → 45s base row, straight through ×4 — no rest between rounds. 10 min.'],
  [5, 4, 'Floor AMRAP',
    'Cycle the four movements continuously — no rest between movements or rounds. 14 min AMRAP — log rounds completed.'],
  [6, 1, 'Engine — 40/20 Intervals',
    '40s moderate / 20s easy, continuous ×12 — bike. 12 min. Green–orange border — do not chase splats. Week 6 splat target: ~18 min at 155+.'],
  [6, 4, 'Light Floor Circuit',
    '10 swings → 8 push-ups → 10 goblet squats, easy pace, straight through ×2. 6 min, light. 30 min continuous green-zone session overall — orange only by drift, do not chase it.'],
  [7, 4, 'Tread — Everest Climbs',
    'Two 8-min climbs, 60s walk between — +1% incline each minute to max sustainable, then drop and rebuild (16 min). Log a calf rating.'],
  [7, 4, 'Row Block',
    '250m sprint → 60s base row, straight through ×3 — no rest between rounds. 8 min. Sprint the 250s — red is fine here.'],
  [7, 4, 'Floor Block',
    '6/side snatches → 15 swings → 10 burpees → 40s ropes, straight through ×3. 12 min.'],
  [8, 1, 'Engine Retest — 40/20 Intervals',
    '40s hard / 20s easy, continuous ×14 — row or bike. Benchmark: identical to Week 1 Day 1. Compare average output and splat minutes. Week 8 splat target: ~34 min at 155+.'],
  [8, 4, 'Row — 2000m for Time',
    'One continuous 2000m effort. Benchmark. Log the time.'],
  [8, 4, 'Floor AMRAP',
    'Cycle the three movements continuously — no rest between movements or rounds. 10 min AMRAP — log rounds completed. End-of-block check-ins: body weight (target ≤251), benchmark deltas vs Week 1, calf status — these inform the fall strength block.'],
];

// W2D1 EMOM stations become explicit 60s minute slots so the interval clock
// (all stations timed -> auto-cycling) can run them: 12 chained minutes.
const EMOM_STATIONS = [
  { name: 'Bike Cals (40s hard)', duration_sec: 60 },
  { name: 'KB Swing', reps: 15, duration_sec: 60, target_weight_lbs: 53 },
  { name: 'Battle Ropes (30s hard)', duration_sec: 60 },
];

function applyEdits(prog) {
  const changes = [];
  const findCircuit = (week, day, name) => {
    const w = prog.weeks.find((w) => w.week === week);
    const d = w?.days.find((d) => d.day === day);
    return d?.exercises.find(
      (ex) => (ex.type === 'circuit' || ex.type === 'finisher_circuit') && ex.name === name,
    );
  };

  for (const [week, day, name, notes] of NOTES) {
    const ex = findCircuit(week, day, name);
    if (!ex) throw new Error(`Circuit not found: W${week}D${day} "${name}"`);
    if (ex.notes !== notes) {
      changes.push(`W${week}D${day} "${name}": notes updated`);
      ex.notes = notes;
    }
  }

  const emom = findCircuit(2, 1, 'Engine — EMOM 12');
  if (JSON.stringify(emom.exercises_in_circuit) !== JSON.stringify(EMOM_STATIONS)) {
    changes.push('W2D1 "Engine — EMOM 12": stations restructured to 60s minute slots');
    emom.exercises_in_circuit = EMOM_STATIONS;
  }

  // Sanity: exactly the circuits in NOTES exist — no circuit missed.
  let circuitCount = 0;
  prog.weeks.forEach((w) => w.days.forEach((d) =>
    d.exercises.forEach((ex) => {
      if (ex.type === 'circuit' || ex.type === 'finisher_circuit') circuitCount++;
    })));
  if (circuitCount !== NOTES.length) {
    throw new Error(`Program has ${circuitCount} circuits but NOTES covers ${NOTES.length}`);
  }

  return changes;
}

const original = JSON.parse(readFileSync(PROGRAM_PATH, 'utf8'));
const edited = JSON.parse(readFileSync(PROGRAM_PATH, 'utf8'));
const changes = applyEdits(edited);

console.log(`Planned changes (${changes.length}):`);
changes.forEach((c) => console.log('  - ' + c));
if (changes.length === 0) console.log('  (file already up to date)');

if (APPLY_FILE) {
  writeFileSync(PROGRAM_PATH, JSON.stringify(edited, null, 2) + '\n', 'utf8');
  console.log('\nprogram.json written.');
}

if (APPLY_SUPABASE) {
  const dotenv = (await import('dotenv')).default;
  dotenv.config({ path: join(REPO_ROOT, '.env.local') });
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: row, error } = await sb
    .from('programs')
    .select('id, key, label, is_active, data')
    .eq('is_active', true)
    .single();
  if (error) throw error;
  if (row.data?.meta?.program !== 'Operation Afterburner') {
    throw new Error(`Active program row is "${row.data?.meta?.program}", not Operation Afterburner — refusing.`);
  }

  // jsonb does not preserve key order, so compare with sorted keys.
  const canon = (o) =>
    Array.isArray(o) ? o.map(canon)
    : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])]))
    : o;
  const rowMatchesOriginal = JSON.stringify(canon(row.data)) === JSON.stringify(canon(original));
  const rowMatchesEdited = JSON.stringify(canon(row.data)) === JSON.stringify(canon(edited));
  console.log(`\nActive row: key=${row.key} label=${row.label}`);
  console.log(`Row deep-equals repo file (pre-edit): ${rowMatchesOriginal}`);
  if (rowMatchesEdited) {
    console.log('Row already matches edited program — nothing to do.');
  } else {
    if (!rowMatchesOriginal && !process.argv.includes('--force')) {
      throw new Error('Active row does not match the repo file — diverged. Re-run with --force only after diffing.');
    }
    const { error: upErr } = await sb.from('programs').update({ data: edited }).eq('id', row.id);
    if (upErr) throw upErr;
    console.log('Supabase programs row updated.');
  }
}
