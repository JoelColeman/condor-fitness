// Pushes the repo's program.json into the active `programs` row in Supabase.
//
// Supabase is the source of truth the app serves; program.json in the repo is
// the reviewable mirror. Run this after editing program.json so both match.
// Refuses to run without --apply. Prints the old and new program identity so a
// wrong-program overwrite is visible before it happens.
//
// Usage: npx tsx scripts/push-program.ts --apply
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

config({ path: '.env.local' });

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');

const sb = createClient(url, key);
const apply = process.argv.includes('--apply');

const main = async () => {
  const next = JSON.parse(readFileSync('program.json', 'utf8'));

  const res = await sb.from('programs').select('id, data').eq('is_active', true);
  if (res.error) throw new Error(res.error.message);
  if (!res.data || res.data.length !== 1) throw new Error('Expected exactly 1 active program, got ' + (res.data?.length ?? 0));
  const row = res.data[0];

  const ident = (d: any) => `${d?.meta?.program} v${d?.meta?.version} (anchor ${d?.meta?.anchor_date})`;
  console.log('Active row :', row.id);
  console.log('Currently  :', ident(row.data));
  console.log('Replacing  :', ident(next));

  if (row.data?.meta?.program !== next?.meta?.program) {
    throw new Error('Program name mismatch — refusing to overwrite a different program.');
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  // Backup the outgoing version before overwriting.
  const backupPath = join(tmpdir(), `condor-program-backup-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(row.data, null, 2), 'utf8');
  console.log('Backup of outgoing version:', backupPath);

  const up = await sb.from('programs').update({ data: next }).eq('id', row.id);
  if (up.error) throw new Error(up.error.message);
  console.log('Updated. Supabase now serves', ident(next));
};
main();
