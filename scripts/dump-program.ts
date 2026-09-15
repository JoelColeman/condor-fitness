// One-off: dump the live active program row from Supabase to stdout-file.
// Usage: npx tsx scripts/dump-program.ts <outfile>
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config({ path: '.env.local' });

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');

const sb = createClient(url, key);

const main = async () => {
  const res = await sb.from('programs').select('id, is_active, data').eq('is_active', true);
  if (res.error) throw new Error(res.error.message);
  if (!res.data || res.data.length !== 1) throw new Error('Expected exactly 1 active program, got ' + (res.data?.length ?? 0));
  const row = res.data[0];
  console.log('id:', row.id, '| program:', row.data?.meta?.program, 'v' + row.data?.meta?.version, '| anchor:', row.data?.meta?.anchor_date);
  writeFileSync(process.argv[2] ?? 'live-program.json', JSON.stringify(row.data, null, 2) + '\n', 'utf8');
  console.log('written to', process.argv[2] ?? 'live-program.json');
};
main();
