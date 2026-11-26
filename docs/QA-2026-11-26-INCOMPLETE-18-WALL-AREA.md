# A·CEIL 2026-11-26 — prevent imaginary 58.01 m² on incomplete 18-wall outline

## Report from iPhone

The user entered 18 wall measurements for an irregular ceiling:
`[452,202,242,8,302,355,383,158,19.5,30,289,20,96.5,20,62,187,0,0]` (centimetres).
`QR=0` and `RA=0` are still unmeasured, yet the nomenclature displayed
**58.01 m² × 400 UAH = 23,204 UAH** for automatic M303 film and
**28.26 m** as the partial entered perimeter. An exact area cannot be
inferred from the entered measurements alone.

## Confirmed sources of stale area

1. `190-aceil-honest-geometry.js` early-returned when any wall was zero,
   leaving the previous value in DOM `#area`.
2. `025-aceil-state-persistence-nomenclature.js` trusted the old displayed
   `#area` first and otherwise calculated an area using old `realPts`.
3. `135-aceil-curve-fixed-ends.js` could rewrite area to the old polygon
   value during a later draw/stats pass.
4. `184-aceil-estimate-variants-ui.js` trusted cached `room.area`
   ahead of state dimensions, allowing saved variants to quote old film area.

## Changes

- Shared, pure `A·CEILGeometry.dimensionsStatus(state)` identifies missing
  sides without mutating the drawing. A valid diameter-driven circle is allowed.
- On an incomplete or contradictory rebuild, show **—** instead of an
  old area, preserve all entered lengths and points, display a warning with
  missing side names, and trigger a nomenclature recalculation.
- Every automatic price-area reader now returns 0 for such a sketch:
  base calculation, film picker, selected room's estimate and persisted
  multi-room variant calculation. The main film quote is suppressed until
  a complete measured contour is provided.
- Keep any explicitly manual quantity as an intentional user override.
- Prevent the curve-stats module from silently resurrecting the invalid value.
- Do not reassign unknown dimensions, invent diagonals, alter user-defined
  prices, rewrite saved measurements, or change Supabase schema/data.
- Incomplete perimeter may remain visible while measuring but must not be
  treated as evidence of complete area.
- Test fixture reproduces exact 18-side case with QR/RA empty and old DOM area
  of 58.01; also checks valid rectangle after completing all measurements.
- New PWA cache ID forces updated logic on installed iPhone web app.

## QA

Required CI: `tests/incomplete-measurement-no-price.test.cjs`.
On a real iPhone, open a saved copy of the affected room, press
**Розміри → Побудувати** with QR and RA missing: `#area` must be
**—**, M303 automatic quantity **0**, film cost **0** and no measurements
may disappear. Then provide two actual measurements and rebuild; area must
recalculate from the validated geometry. Verify estimates in all variants.

Note: do not assume that the entered partial perimeter of 28.26 m is the
finished perimeter. No mathematically justified final m² is available yet.
