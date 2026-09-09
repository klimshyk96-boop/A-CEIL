/* aceil: retired 2026-09 — exhaust icon matching now lives inside
   js/canvas/174-aceil-overall-dims-and-light-colors-fix-v1.js, which draws
   exhaust marks directly (via rmDrawExhaustLegendIcon) instead of wrapping
   drawLightMarks a second time. This file's old wrap could be silently
   undone whenever 063-inline.js re-initialized drawLightMarks later, which
   is exactly the bug this consolidation fixes. Kept as an empty stub so
   the existing <script> tag in index.html doesn't 404. */
