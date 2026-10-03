# Current canvas architecture — 2026-10-03

- `js/canvas/viewport.js`: logical dimensions, backing-store resolution, draw hooks.
- `js/canvas/renderer.js`: the sole `draw()` entry point and room scene.
- `js/canvas/contour-state.js`: transient curve cleanup and reset.
- `js/rooms/110-aceil-linear-element-v1.js`: linear-element layer, editor and live inputs.
- Input/hit-testing code uses `ACEILCanvas.width/height(canvas)`, never live raster dimensions.
- Exporters may temporarily resize the backing store and must restore it in finally.
- New render layers register by name; never wrap or reassign window.draw.
- CSS: app.css (base), theme.css (UI/theme/admin), layout.css (later layout sections).
  Keep their placement in index.html: runtime-injected styles depend on that cascade order.
- `scripts/runtime-order.json` records the remaining legacy load order. Review dependencies before changing it.

Project persistence remains in `js/projects/project-repository.js`, rooms in `js/rooms/multiroom-lifecycle.js`.
Auth/cloud behavior is unchanged. Never rebuild prices merely when opening a modal or project.
Preserve public report URLs under https://a-ceil.pp.ua/report/<token>.

Older cleanup notes are historical, not a statement of the current file counts.
