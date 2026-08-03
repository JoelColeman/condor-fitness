/* ==========================================================================
   app-shared.js — Condor Fitness shared data layer

   Loaded by both index.html (workout companion) and dashboard.html.
   Replaces the old "GitHub-as-database" layer: no personal access token, no
   Contents API, no raw.githubusercontent.com, no TTL caches.

   Auth model: Google OAuth via Supabase. RLS restricts every table to the
   owner's email, so the URL and publishable key below are safe to ship in
   client code — they grant nothing on their own.

   Requires @supabase/supabase-js v2 to be loaded first (UMD build exposes
   window.supabase.createClient).

   Everything is hung off window.Condor to avoid clobbering window.supabase,
   which is the supabase-js library namespace, not our client.
   ========================================================================== */

(function (global) {
  'use strict';

  // ── Client ───────────────────────────────────────────────────────────────

  var SUPABASE_URL = 'https://qyjvnrfevmisbrzshuyu.supabase.co';
  // Publishable (anon) key. Public by design — RLS is the access control.
  // The secret/service-role key must NEVER appear in client code.
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iMP-7CcdlVo4LXwAifRkpg_lMWnkFnw';

  if (!global.supabase || !global.supabase.createClient) {
    throw new Error('app-shared.js: supabase-js v2 must be loaded before this script.');
  }

  var sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The OAuth callback comes back with the token in the URL fragment;
      // supabase-js consumes it and then cleans the URL.
      detectSessionInUrl: true
    }
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  function signInWithGoogle() {
    return sb.auth.signInWithOAuth({
      provider: 'google',
      // Return to whichever page initiated sign-in (index or dashboard).
      // Both URLs must be registered under Supabase Auth → URL Configuration.
      options: { redirectTo: location.href }
    });
  }

  function signOut() {
    return sb.auth.signOut();
  }

  // Resolves to the Supabase session object, or null when signed out.
  async function getSession() {
    var res = await sb.auth.getSession();
    return (res && res.data && res.data.session) || null;
  }

  // ── Shared helpers (previously duplicated in both HTML files) ────────────

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Decodes HTML entities (e.g. &#10003; → ✓) so content authored with
  // entities renders as text. Always decode BEFORE esc(): esc() escapes the
  // leading '&' first, which would otherwise turn &#10003; into literal
  // "&amp;#10003;" on screen.
  var __decodeEl = null;
  function decodeHtml(str) {
    if (str == null) return '';
    if (!__decodeEl) __decodeEl = document.createElement('textarea');
    __decodeEl.innerHTML = String(str);
    return __decodeEl.value;
  }

  // True when a session belongs to the currently loaded program (its phase id
  // is one of the program's phases). Stops an old program's sessions from
  // bleeding into the new program's week/day numbering.
  function inCurrentProgram(session, prog) {
    if (!session || !prog || !prog.meta || !prog.meta.phases) return false;
    return prog.meta.phases.some(function (p) { return p.id === session.phase; });
  }

  // Sequential pointer logic — no date math.
  function nextWorkout(prog, lastCompleted) {
    var weeks = prog.weeks;
    var lc = lastCompleted || { week: prog.meta.start_week, day: 0 };

    var cwIdx = -1;
    for (var i = 0; i < weeks.length; i++) {
      if (weeks[i].week === lc.week) { cwIdx = i; break; }
    }

    // Week not found — start at the very first week, day 1
    if (cwIdx === -1) {
      return { weekData: weeks[0], dayData: weeks[0].days[0] };
    }

    var wk = weeks[cwIdx];

    // Next day number greater than lc.day within this week
    for (var d = 0; d < wk.days.length; d++) {
      if (wk.days[d].day > lc.day) {
        return { weekData: wk, dayData: wk.days[d] };
      }
    }

    // Week exhausted — advance to next week, day 1
    var nextWkIdx = cwIdx + 1;
    if (nextWkIdx < weeks.length) {
      var nw = weeks[nextWkIdx];
      return { weekData: nw, dayData: nw.days[0] };
    }

    // Program complete
    return null;
  }

  // Compares the local pointer against the furthest in-program, non-bonus
  // session and returns whichever shows more progress. With Supabase this is
  // now cross-device by construction — every device reads the same rows.
  function resolveLastCompleted(sessions, prog) {
    var localLc = null;
    try { localLc = JSON.parse(localStorage.getItem('lastCompleted')); } catch (e) {}

    var sessionLc = null;
    (sessions || [])
      .filter(function (s) { return s && !s.bonus && s.week && s.day && inCurrentProgram(s, prog); })
      .forEach(function (s) {
        if (!sessionLc ||
            s.week > sessionLc.week ||
            (s.week === sessionLc.week && s.day > sessionLc.day)) {
          sessionLc = { week: s.week, day: s.day };
        }
      });

    if (!localLc && !sessionLc) return null;
    if (!localLc) return sessionLc;
    if (!sessionLc) return localLc;
    if (sessionLc.week > localLc.week) return sessionLc;
    if (sessionLc.week === localLc.week && sessionLc.day > localLc.day) return sessionLc;
    return localLc;
  }

  // Session date = the device's LOCAL calendar date, deliberately.
  //
  // A workout finished at 22:30 on Aug 3 local is an Aug 3 workout, even
  // though it is already Aug 4 in UTC. Using toISOString() here would file
  // late-evening sessions under the next day, which then collides with the
  // *next* workout's row (session_date is unique) and shifts the training log.
  // So: build the string from local getFullYear/getMonth/getDate, never UTC.
  function todayLocalDate(d) {
    var now = d || new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }

  // ── Value coercion (mirrors scripts/backfill-supabase.ts) ────────────────

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function int(v) { var n = num(v); return n === null ? null : Math.round(n); }
  function str(v) { return typeof v === 'string' ? v : null; }
  function bool(v) { return typeof v === 'boolean' ? v : null; }

  // ── Reads ────────────────────────────────────────────────────────────────

  // The single active program (programs.is_active = true).
  async function fetchActiveProgram() {
    var res = await sb
      .from('programs')
      .select('data')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (res.error) throw new Error('fetchActiveProgram: ' + res.error.message);
    return res.data ? res.data.data : null;
  }

  // All sessions, oldest first.
  //
  // Returns the `raw` jsonb — the exact session JSON shape the render code in
  // both files already expects (exercises[].sets[], skills, calf_rating, …).
  // This keeps one query instead of the old list-then-N+1-fetch, and means the
  // render path did not have to be rewritten around the flattened columns.
  // session_sets is still written on save, for querying/analytics later.
  async function fetchSessions() {
    var res = await sb
      .from('sessions')
      .select('session_date, raw')
      .order('session_date', { ascending: true });
    if (res.error) throw new Error('fetchSessions: ' + res.error.message);
    return (res.data || []).map(function (row) {
      var s = row.raw || {};
      // Guarantee `date` is present even if an older row's raw lacked it.
      if (!s.date) s.date = row.session_date;
      return s;
    });
  }

  async function fetchAthleteProfile() {
    var res = await sb.from('athlete_profile').select('data').eq('id', 1).maybeSingle();
    if (res.error) throw new Error('fetchAthleteProfile: ' + res.error.message);
    return res.data ? res.data.data : null;
  }

  async function fetchBodyWeight() {
    var res = await sb
      .from('body_weight')
      .select('date, weight_lbs, note')
      .order('date', { ascending: true });
    if (res.error) throw new Error('fetchBodyWeight: ' + res.error.message);
    return res.data || [];
  }

  async function fetchPRs() {
    var res = await sb.from('prs').select('lift, type, weight_lbs, date_approx, block, note');
    if (res.error) throw new Error('fetchPRs: ' + res.error.message);
    return res.data || [];
  }

  // ── Write ────────────────────────────────────────────────────────────────

  // Flattens a session's exercises into session_sets rows.
  function buildSetRows(sessionId, sessionObj) {
    var rows = [];
    var exercises = Array.isArray(sessionObj.exercises) ? sessionObj.exercises : [];
    exercises.forEach(function (ex, exIdx) {
      var exSets = Array.isArray(ex.sets) ? ex.sets : [];
      exSets.forEach(function (st) {
        rows.push({
          session_id:          sessionId,
          exercise_name:       str(ex.name) || '(unnamed)',
          exercise_order:      exIdx,
          set_number:          int(st.set_number),
          interval:            int(st.interval),
          target_weight_lbs:   num(st.target_weight_lbs),
          actual_weight_lbs:   num(st.actual_weight_lbs),
          target_reps:         int(st.target_reps),
          actual_reps:         int(st.actual_reps),
          target_duration_sec: int(st.target_duration_sec),
          actual_duration_sec: int(st.actual_duration_sec),
          completed:           bool(st.completed),
          raw:                 st
        });
      });
    });
    return rows;
  }

  // Upserts the sessions row on session_date, then replaces its session_sets.
  //
  // Re-saving the same date overwrites rather than duplicating — session_date
  // is unique, which is what makes a same-day re-save idempotent. Sets are
  // deleted and re-inserted rather than diffed; a session is small enough that
  // replace-in-full is simpler and cannot leave orphans behind.
  async function saveSession(obj) {
    var sessionRow = {
      session_date:   obj.date,
      week:           int(obj.week),
      day:            int(obj.day),
      day_type:       str(obj.day_type),
      day_label:      str(obj.day_label),
      phase:          str(obj.phase),
      bonus:          obj.bonus === true,
      alternate_used: str(obj.alternate_used),
      duration_min:   num(obj.duration_min),
      calf_rating:    int(obj.calf_rating),
      overall_feel:   int(obj.overall_feel),
      skills:         obj.skills || {},
      note:           str(obj.note),
      raw:            obj
    };

    var up = await sb
      .from('sessions')
      .upsert(sessionRow, { onConflict: 'session_date' })
      .select('id')
      .single();
    if (up.error) throw new Error('saveSession (sessions): ' + up.error.message);

    var sessionId = up.data.id;

    var del = await sb.from('session_sets').delete().eq('session_id', sessionId);
    if (del.error) throw new Error('saveSession (clear sets): ' + del.error.message);

    var setRows = buildSetRows(sessionId, obj);
    if (setRows.length) {
      var ins = await sb.from('session_sets').insert(setRows);
      if (ins.error) throw new Error('saveSession (insert sets): ' + ins.error.message);
    }

    return { id: sessionId, sets: setRows.length };
  }

  // ── Export ───────────────────────────────────────────────────────────────

  global.Condor = {
    sb: sb,
    // auth
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    getSession: getSession,
    // helpers
    esc: esc,
    decodeHtml: decodeHtml,
    inCurrentProgram: inCurrentProgram,
    nextWorkout: nextWorkout,
    resolveLastCompleted: resolveLastCompleted,
    todayLocalDate: todayLocalDate,
    // data
    fetchActiveProgram: fetchActiveProgram,
    fetchSessions: fetchSessions,
    fetchAthleteProfile: fetchAthleteProfile,
    fetchBodyWeight: fetchBodyWeight,
    fetchPRs: fetchPRs,
    saveSession: saveSession
  };

})(window);
