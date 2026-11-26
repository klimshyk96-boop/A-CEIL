# A·CEIL — hidden cornice 10 cm inset draws outside a concave wall (2026-11-26)

## Reproduction on iPhone

In an irregular 18-side ceiling drawing, open the wall element editor for
**HI (158 cm)**, select **Карниз прихований**, **Відступ від стіни: 10 см**,
**Вся сторона**, then apply. The horizontal green mark appeared below/outside
the HI wall although the room's interior lies above it.

## Root cause

`js/canvas/wall-elements-parallel.js` calculated a candidate normal for each
wall and decided which direction was outside by comparing the wall midpoint
to the **arithmetic mean of polygon vertices**. That mean is **not necessarily
inside a concave room**. It may lie in a recess/outside the room or on the wrong
side of an inward-facing edge. A valid positive wall offset can therefore be
drawn outward. This affects every wall type using wallDistanceCm, not only
hidden cornices, and also affects tap-hit geometry and exported plans.

## Minimal fix

- Calculate the room's signed shoelace area from `pts`. For a simple
  closed polygon the area sign expresses its winding, which determines
  consistent inward/outward normals for every boundary edge.
- In the canvas coordinate system (Y down): positive signed area means the
  raw left normal `(-dy,dx)` is inward; negative means it is outward.
  Keep the existing `nx/ny` convention **outward** so the existing
  `-nx * positive distance` still puts marks inside and labels/click
  targets use the same geometry.
- Reverse winding and concave corners are supported. A degenerate area
  preserves the former fallback, but valid geometry no longer guesses from
  the mean vertex.
- No changes to user marks, lengths, offsets, prices, reports, DB or
  project saves. Zero distance remains exactly on the wall.
- The live canvas and report generator share `drawWallMarks`, so fixing the
  drawing geometry updates both without duplicate calculation.

## Regression

`tests/wall-inward-offset-concave.test.cjs` uses a concave U-shaped
polygon with the mean vertex **outside** the region and validates:
- 10 cm inward offset for the recessed horizontal wall;
- same result when reversing the contour point order;
- correct offset on the outer wall with either orientation;
- zero distance stays on the wall; other mark types also move inward;
- report and canvas use the same corrected segment and tap-to-edit.

iPhone visual check: re-open the project, select the HI hidden cornice,
distance 10 cm, apply; the green line should be **above/inside HI**.
Repeat for vertical GH, where the room lies to the left of the wall.
