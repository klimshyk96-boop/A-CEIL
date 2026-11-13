# A·CEIL report UX and A4 PDF regression — 2026-11-13

## User observation
Two phone screenshots show an in-app report with a measured red CE diagonal,
followed by a PDF of two portrait A4 pages with substantial empty space at the
bottom of both. The previous page-slicer balanced content across sheets instead
of filling each one. It also relied on a separate checkbox to hide diagonals.

## Changes
1. The report-settings diagonal selector now presents three direct options:
   **Без діагоналей**, **Тільки виміряні**, **Усі можливі**. Selecting none
   disables diagonal rendering; selecting the other modes re-enables it.
   This changes the report configuration, never the measured values saved in
   the room. The old checkbox and values remain supported for backward
   compatibility; choices are localized into uk/en/pl/ru.
2. The shared PDF pagination helper (mobile report, public report, desktop
   report) fills a sheet up to the available A4 height before starting the
   next one. Room boundaries are preserved, mild (up to ~18%) uniform fit
   remains available for marginal page overflow, and horizontal whitespace
   near an A4 cut can be used to avoid cutting lines.
3. Regression tests cover the half-empty two-page case, small overflow,
   multi-room boundaries, and one-tap diagonal choice/persistence. The
   browser-only narrow-viewport test also covers the new third button.

## Constraints / acceptance
- Never distort drawing proportions (page scaling is uniform).
- Never discard, duplicate, or reorder image rows.
- Do not modify project state, price calculations, cloud database, or
  original measured diagonals.
- Verify a newly generated PDF on a real iPhone. A final short page is still
  normal if a tall report cannot fit into one A4 without making its text
  unreadably small. The algorithm reduces redundant empty space on earlier
  sheets, not the number of mandatory pages at any cost.
