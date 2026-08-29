# RC10 CLEANUP — 2026-08-29

Base: UI2 RC9.

## Runtime policy

No application runtime code was changed in this cleanup pass. `index.html`, both CSS files,
all 134 local JavaScript files and `vercel.json` are byte-for-byte identical to RC9.

## Removed from deploy package

- `_preview.html` — development preview duplicate of the application shell.
- Historical UI2 RC1–RC9 change logs.
- Historical test notes from older release candidates.
- Old aggregate change logs, including Claude cleanup notes.
- Duplicate/stale `VERSION.txt`.

The maintained project documentation that remains is `README.md`, `ARCHITECTURE.md`,
`FINAL_REGRESSION.md`, this cleanup note, and `VERSION`.

## Claude cleanup review

The safe whole-block cleanup identified in the earlier Claude pass is already represented in
the RC9 lineage. The later AST partial-definition deletion was not imported: static syntax
success is insufficient for this codebase because wrapper chains and load order can make an
earlier definition live at runtime. Known examples found during review included `rwe2Save`
and `wallMarks` dependencies.

Future code cleanup must prove runtime ownership/dependency before deleting definitions from
canonical modules. Do not bulk-apply AST candidates merely because another symbol with the same
name exists elsewhere.
