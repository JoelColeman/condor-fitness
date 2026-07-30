/**
 * Backfill Supabase from the JSON files in the working tree.
 *
 *   npx tsx scripts/backfill-supabase.ts            # dry run — prints planned counts
 *   npx tsx scripts/backfill-supabase.ts --apply    # writes to Supabase
 *
 * Requires supabase/migrations/001_initial_schema.sql to have been run first.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * --apply deletes every row in the target tables before inserting. In Phase 1
 * these tables are owned entirely by this backfill, so a full replace is what
 * makes the script idempotent.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const CHUNK = 500;

dotenv.config({ path: join(REPO_ROOT, '.env.local') });

// ---------------------------------------------------------------------------
// Value coercion — every field is optional in the source JSON.
// ---------------------------------------------------------------------------

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

// Empty strings are preserved rather than folded to null so the flattened
// columns stay a faithful copy of the source JSON.
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

const bool = (v: unknown): boolean | null =>
  typeof v === 'boolean' ? v : null;

// ---------------------------------------------------------------------------
// Read the working tree
// ---------------------------------------------------------------------------

function readJson(relPath: string): any {
  return JSON.parse(readFileSync(join(REPO_ROOT, relPath), 'utf8'));
}

type SessionRow = {
  session_date: string;
  week: number | null;
  day: number | null;
  day_type: string | null;
  day_label: string | null;
  phase: string | null;
  bonus: boolean;
  alternate_used: string | null;
  duration_min: number | null;
  calf_rating: number | null;
  overall_feel: number | null;
  skills: unknown;
  note: string | null;
  raw: unknown;
};

type SetRow = {
  session_date: string; // resolved to session_id after sessions are inserted
  exercise_name: string;
  exercise_order: number;
  set_number: number | null;
  interval: number | null;
  target_weight_lbs: number | null;
  actual_weight_lbs: number | null;
  target_reps: number | null;
  actual_reps: number | null;
  target_duration_sec: number | null;
  actual_duration_sec: number | null;
  completed: boolean | null;
  raw: unknown;
};

function collectSessions(): { sessions: SessionRow[]; sets: SetRow[] } {
  const files = readdirSync(join(REPO_ROOT, 'sessions'))
    .filter((f) => f.endsWith('.json'))
    .sort();

  const sessions: SessionRow[] = [];
  const sets: SetRow[] = [];

  for (const file of files) {
    const s = readJson(join('sessions', file));
    // The filename is the source of truth for the date; `date` inside the file
    // should match but the filename is what the app guarantees is unique.
    const sessionDate = str(s.date) || file.replace(/\.json$/, '');

    sessions.push({
      session_date: sessionDate,
      week: int(s.week),
      day: int(s.day),
      day_type: str(s.day_type),
      day_label: str(s.day_label),
      phase: str(s.phase),
      bonus: s.bonus === true,
      alternate_used: str(s.alternate_used),
      duration_min: num(s.duration_min),
      calf_rating: int(s.calf_rating),
      overall_feel: int(s.overall_feel),
      skills: s.skills ?? {},
      note: str(s.note),
      raw: s,
    });

    const exercises: any[] = Array.isArray(s.exercises) ? s.exercises : [];
    exercises.forEach((ex, exIdx) => {
      const exSets: any[] = Array.isArray(ex.sets) ? ex.sets : [];
      for (const st of exSets) {
        sets.push({
          session_date: sessionDate,
          exercise_name: str(ex.name) || '(unnamed)',
          exercise_order: exIdx,
          set_number: int(st.set_number),
          interval: int(st.interval),
          target_weight_lbs: num(st.target_weight_lbs),
          actual_weight_lbs: num(st.actual_weight_lbs),
          target_reps: int(st.target_reps),
          actual_reps: int(st.actual_reps),
          target_duration_sec: int(st.target_duration_sec),
          actual_duration_sec: int(st.actual_duration_sec),
          completed: bool(st.completed),
          raw: st,
        });
      }
    });
  }

  return { sessions, sets };
}

function collectAthlete() {
  const a = readJson('athlete.json');

  const bodyWeight = (Array.isArray(a.body_weight) ? a.body_weight : []).map(
    (b: any) => ({
      date: str(b.date),
      weight_lbs: num(b.weight_lbs),
      note: str(b.note),
    })
  );

  const prs = (Array.isArray(a.prs) ? a.prs : []).map((p: any) => ({
    lift: str(p.lift) || '(unnamed)',
    type: str(p.type),
    weight_lbs: num(p.weight_lbs),
    date_approx: str(p.date_approx),
    block: str(p.block),
    note: str(p.note),
  }));

  return { athlete: a, bodyWeight, prs };
}

function collectProgram() {
  const p = readJson('program.json');
  const meta = p.meta ?? {};
  // Same key format index.html uses for its `programKey` localStorage check.
  const key = `${meta.program ?? 'unknown'} v${meta.version ?? '0'}`;
  return {
    key,
    label: str(meta.program),
    meta,
    data: p,
    is_active: true,
  };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

function chunked<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function wipe(db: SupabaseClient, table: string, idColumn = 'id') {
  // Supabase requires a filter on delete; `id is not null` matches everything.
  const { error } = await db.from(table).delete().not(idColumn, 'is', null);
  if (error) throw new Error(`delete ${table}: ${error.message}`);
}

async function insertAll(db: SupabaseClient, table: string, rows: any[]) {
  for (const batch of chunked(rows)) {
    const { error } = await db.from(table).insert(batch);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

async function main() {
  const { sessions, sets } = collectSessions();
  const { athlete, bodyWeight, prs } = collectAthlete();
  const program = collectProgram();

  console.log(`\nCondor Fitness → Supabase backfill  [${APPLY ? 'APPLY' : 'DRY RUN'}]`);
  console.log('─'.repeat(52));
  console.log(`  sessions          ${sessions.length}`);
  console.log(`  session_sets      ${sets.length}`);
  console.log(`  body_weight       ${bodyWeight.length}`);
  console.log(`  prs               ${prs.length}`);
  console.log(`  programs          1  (${program.key}, is_active=true)`);
  console.log(`  athlete_profile   1`);
  console.log('─'.repeat(52));
  if (sessions.length) {
    console.log(`  date range        ${sessions[0].session_date} → ${sessions[sessions.length - 1].session_date}`);
    console.log(`  bonus sessions    ${sessions.filter((s) => s.bonus).length}`);
  }

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to write.\n');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log('\nClearing existing rows…');
  await wipe(db, 'session_sets');
  await wipe(db, 'sessions');
  await wipe(db, 'body_weight');
  await wipe(db, 'prs');
  await wipe(db, 'programs');
  await wipe(db, 'athlete_profile');

  console.log('Inserting sessions…');
  const sessionIdByDate = new Map<string, string>();
  for (const batch of chunked(sessions)) {
    const { data, error } = await db
      .from('sessions')
      .insert(batch)
      .select('id, session_date');
    if (error) throw new Error(`insert sessions: ${error.message}`);
    for (const row of data ?? []) sessionIdByDate.set(row.session_date, row.id);
  }

  console.log('Inserting session_sets…');
  const setRows = sets.map((s) => {
    const { session_date, ...rest } = s;
    const sessionId = sessionIdByDate.get(session_date);
    if (!sessionId) throw new Error(`no session id for ${session_date}`);
    return { session_id: sessionId, ...rest };
  });
  await insertAll(db, 'session_sets', setRows);

  console.log('Inserting body_weight, prs, programs, athlete_profile…');
  await insertAll(db, 'body_weight', bodyWeight);
  await insertAll(db, 'prs', prs);
  await insertAll(db, 'programs', [program]);
  await insertAll(db, 'athlete_profile', [{ id: 1, data: athlete }]);

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error('\nBackfill failed:', err.message, '\n');
  process.exit(1);
});
