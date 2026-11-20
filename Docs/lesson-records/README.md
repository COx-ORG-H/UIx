# Lesson records

One file per decision the lesson-capture hook asks for, so two PRs never edit the same file:

- `skip-<sha>.md`: one line, `<sha> routine: <why, a few words>`, for a fix that taught nothing new.
- `<YYYY-MM-DD>-<slug>.md`: one short rule (at most 6 lines, no incident narrative) for a fix that did.

The hook reads this folder because `LESSONS_LEARNED.md` names it on a `lesson-records` line. That file
keeps its earlier entries and takes no new ones.
