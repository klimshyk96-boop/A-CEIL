# Current canvas architecture — 2026-10-16

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
- Build id `20261017-dropin1` is shared by local asset queries, the service-worker cache,
  the PWA reload key and service-worker registration. `scripts/check-before-deploy.sh` enforces this.
- The service worker precaches only the essential shell. Versioned local JS/CSS use cache-first
  runtime caching; a build-id change is the only supported way to publish changed assets.
- `.vercelignore` keeps tests, build scripts and internal documentation outside the public deployment.
- `A·CEILGeometry` is the shared source for distances and polygon area used by the room solver
  and measurement confidence checks; do not add local copies of these calculations.
- `A_CEIL_LinearTypes` is the shared registry for the four linear-lighting stable IDs. User-facing
  names may change, but autocount sources must continue to use the stable keys.
- Three no-op initialization wrappers were removed from the wall/report flow. Remaining wrappers
  contain active compatibility or persistence behavior and must not be deleted without a browser regression run.

Project persistence remains in `js/projects/project-repository.js`, rooms in `js/rooms/multiroom-lifecycle.js`.
Auth/cloud behavior is unchanged. Never rebuild prices merely when opening a modal or project.
Use https://a-ceil.pp.ua/r/<token> for new public report URLs and preserve
https://a-ceil.pp.ua/report/<token> for backward compatibility.
Mobile Safari and the installed PWA use the same in-app report preview. Desktop keeps the popup
preview. Both paths must publish the same structured drawing and stable project reference.

Older cleanup notes are historical, not a statement of the current file counts.

## Архітектурний запобіжник — 2026-10-17

- `js/core/225-aceil-public-api-v1.js` створює `window["A·CEIL"].API` — стабільний вхід для нового коду й тестів. Усередині він поки делегує виклики чинним реалізаціям.
- `scripts/check-architecture.cjs` блокує дубльовані номери, динамічний код, непідключені файли, нові ланцюги обгорток, нові анонімні назви та неконтрольований ріст великих файлів.
- Старі `*-inline.js` тимчасово залишено навмисно: цей пакет можна розпакувати поверх локальної GitHub-папки без ручного видалення. Їхня кількість зафіксована у `scripts/architecture-baseline.json` і може лише зменшуватися.
- `scripts/run-all-tests.sh` завершується помилкою при будь-якому падінні. `ALL OK` з'являється лише після успішного виконання всіх перевірок.
- `scripts/prune-superseded-layers.cjs` без `--apply` лише показує кандидатів і нічого не змінює.

Подальша консолідація: спочатку golden-тест, потім злиття одного ланцюга у файл-власник, повний тест і лише після цього оновлення бази командою `node scripts/check-architecture.cjs --update`. Назва позиції номенклатури не є джерелом типу або автопрорахунку — використовуються стабільні ID/source.
