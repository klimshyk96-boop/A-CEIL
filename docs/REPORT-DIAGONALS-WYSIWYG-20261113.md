# A·CEIL — diagonal WYSIWYG report correction (2026-11-13)

## Observed on iPhone
Editor showed six selected diagonal measurements/estimates (including **EB 320 cm**),
but the generated report showed only one diagonal with the different label
**CE 320 cm**. The PDF layout itself was accepted.

## Root causes in source
1. The editor draws the selected `diagonals` pairs, including calculated
   lengths. The report's `manual` mode intentionally retained only a pair
   with an explicit `diagonalOverrides` value, explaining the one-versus-six
   mismatch.
2. The existing `all` mode enumerated possible internal diagonals in a
   text table and deliberately returned no plan-overlay pairs; it could not
   reproduce what was selected on the editor canvas.
3. Pair normalization for reporting used ascending vertex indexes; that can
   change the displayed label's endpoint order (EB -> BE). A saved-room
   snapshot older than the canvas can additionally change the letter mapping.
4. The multiroom report action started a pre-save without waiting for it and
   waited on cloud I/O; now the latest local room save is awaited independently
   of cloud sync before the report is built.

## Implementation
- New report-settings mode **Як на кресленні** (`diagMode:visible`) in
  Ukrainian, English, Polish and Russian.
- `none`: no diagonal lines/list; `manual`: confirmed measurements only;
  `visible`: exactly the pairs selected in the editor, on the plan and in the
  report list; `all`: old full possible-pairs list, still excluded from plan
  for readability.
- Unconfirmed lengths in visible mode carry a **≈** marker in the report,
  avoiding a false claim that they were measured on site.
- Original endpoint order (EB vs BE) is preserved for selected and confirmed
  pairs in the list and plan. Numeric vertex IDs and measurements are not
  modified.
- Report generation refreshes the active-room local snapshot without waiting
  for Supabase; on a failure, it will not silently substitute an old drawing.
- CI checks source syntax, the setting choices, the six-diagonal case,
  measured vs computed values, endpoint order, and planned drawing pairs.

## Safety
No changes to Supabase schema, existing saved project records, measured values,
or pricing. Tests use synthetic offline room data. iPhone UI and the original
object shown in the screenshot should be rechecked after the deployment.
