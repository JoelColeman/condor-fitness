# Condor Fitness — Claude Code Reference
Repo: JoelColeman/condor-fitness
App: https://joelcoleman.github.io/condor-fitness/
Dashboard: https://joelcoleman.github.io/condor-fitness/dashboard.html

---

## Before You Start

Read `condor-build.md` in full before doing anything.
Pay attention to: Spec Deviations, Discovered Conventions, Open Tasks.
That file is your ground truth for current build state.

---

## Branch and Push

```
git checkout -b claude/your-description-here
git push -u origin claude/your-description-here
```

One branch per task. Never push to main directly.

## PR Merge Link

After committing, provide this URL so Joel can merge with one click:
```
https://github.com/JoelColeman/condor-fitness/compare/main...claude/YOUR-BRANCH-NAME
```

Replace `YOUR-BRANCH-NAME` with your actual branch name.

---

## File Ownership — Read This Before Touching Any File

| File | Owner | Rule |
|---|---|---|
| `condor-build.md` | Code | Update every commit. Mark tasks complete. Log deviations and conventions. |
| `index.html` | Code | All HTML/CSS/JS. Use bash heredoc for writes — file exceeds 400 lines. |
| `dashboard.html` | Code | All HTML/CSS/JS. Use bash heredoc for writes — file exceeds 400 lines. |
| `athlete.json` | Chat | READ ONLY. Never edit, overwrite, or regenerate. |
| `program.json` | Chat | READ ONLY. Never edit, overwrite, or regenerate. Exceeds token limit — read in 150-line chunks. |
| `condor-build-spec.md` | Chat | READ ONLY. Never edit, overwrite, or regenerate. |
| `condor_workflow.txt` | Chat | READ ONLY. Never edit, overwrite, or regenerate. |
| `CLAUDE.md` | Joel | READ ONLY for Code. Updated by Joel when branch or PR URL changes. |
| `sessions/` | Runtime | Written by the app via GitHub API at workout save time. Never edit directly. |

**The rule that matters most:** If a task would require touching a Chat-owned file,
stop and flag it to Joel instead of proceeding.

---

## Always-Follow Rules

**Large file writes:** Any file over ~400 lines must be written with bash heredoc.
Never use the Write tool on large files — it silently drops content.
```
cat > index.html << 'PYEOF'
...file content...
PYEOF
```

**After every commit:** Run `git diff HEAD~1` and verify the changes match
what you intended before moving to the next task.

**If retrying the same approach more than twice:** Stop. Tell Joel what's
blocking rather than continuing to loop.

**program.json reads:** This file exceeds single-read token limits.
Read in 150-line chunks using offset/limit parameters.

**Session files:** Written by the app via GitHub API at runtime.
Never create or edit session files directly.

---

## After Every Commit

Update `condor-build.md` as part of the same commit — not separately:
- Mark completed tasks with ✅
- Add any spec deviations to the Spec Deviations table
- Add any new technical discoveries to the Discovered Conventions table
- Update Open Tasks list

Then provide the PR merge link.
