# Поточна архітектура A·CEIL

## Карта модулів

Код розкладено за предметною відповідальністю:
`core` (інфраструктура) → `i18n` → `auth` / `admin` → `projects` → `rooms` → `canvas` → `nomenclature` → `reports`.
Це лише групування за змістом: порядок виконання задає префікс `NNN` і `scripts/runtime-order.json`, а не папки.
Нові файли отримують наступний вільний номер і ім'я `NNN-aceil-<призначення>.js`.
Спільні сервіси лежать у `core/`: `A·CEILUtils` (011), `A·CEILGeometry` (098), `A·CEIL.pipeline` (007), `A·CEIL.API` (225), стан (121).

## Canvas

- `js/canvas/viewport.js`: logical dimensions, backing-store resolution, draw hooks.
- `js/canvas/renderer.js`: the sole `draw()` entry point and room scene.
- `js/canvas/contour-state.js`: transient curve cleanup and reset.
- `js/rooms/110-aceil-linear-element.js`: linear-element layer, editor and live inputs.
- Input/hit-testing code uses `ACEILCanvas.width/height(canvas)`, never live raster dimensions.
- Exporters may temporarily resize the backing store and must restore it in finally.
- New render layers register by name; never wrap or reassign window.draw.
- CSS: app.css (base), theme.css (UI/theme/admin), layout.css (later layout sections).
  Keep their placement in index.html: runtime-injected styles depend on that cascade order.
- `scripts/runtime-order.json` records the remaining legacy load order. Review dependencies before changing it.
- Build id із `VERSION` є спільним для локальних asset-запитів, service-worker cache,
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

## Архітектурний запобіжник

- Файли з історичними назвами `*-inline.js` перейменовано за їх реальною відповідальністю; порядок виконання не змінено.
- `js/core/225-aceil-public-api.js` створює `window["A·CEIL"].API` — стабільний вхід для нового коду й тестів. Усередині він поки делегує виклики чинним реалізаціям.
- `scripts/check-architecture.cjs` блокує повернення анонімних назв, дубльованих номерів, динамічного коду, непідключених файлів, нових ланцюгів обгорток і неконтрольованого росту великих файлів.
- `scripts/architecture-baseline.json` фіксує поточний борг: 72 ланцюги обгорток. Цей показник може лише зменшуватись; після перевіреного скорочення базу оновлюють командою `node scripts/check-architecture.cjs --update`.
- `scripts/run-all-tests.sh` запускає статичні, модульні та браузерні перевірки й завершується помилкою при будь-якому падінні. Повідомлення `ALL OK` виводиться тільки після успіху всіх тестів.
- `scripts/prune-superseded-layers.cjs` є лише діагностичним інструментом. Без `--apply` він нічого не змінює; видалення шарів допускається тільки після браузерної регресії.

Безпечний порядок подальшої консолідації: спочатку зафіксувати поведінку golden-тестом, потім злити один ланцюг у файл-власник, виконати `bash scripts/run-all-tests.sh` і лише після успіху оновити архітектурну базу. Перейменування позицій номенклатури не може бути джерелом типу або автопрорахунку — використовуються стабільні ID/source.

## Конвеєр автопрорахунку

- `js/nomenclature/105-aceil-autofill-pipeline.js` є єдиним власником
  `window.autoFillNomenclature`.
- Функціональні шари реєструють етапи замість повторного перевизначення глобальної функції.
  Зафіксований порядок: `linear → universal → colorFix → cornices → insertChoice → filmFix`.
- `tests/verify-autofill.cjs` перевіряє контракт конвеєра, порядок етапів і вимкнений
  автопрорахунок. `scripts/diff-autofill-builds.cjs` порівнює стару й нову збірки
  на відтворюваних сценаріях.
- Необов'язкові «вусаті» роботи та захист підлоги залишаються вимкненими за замовчуванням
  і керуються власним чекбоксом. Автопрорахунок не скидає ручний вибір.
- Подальші ланцюги зливаються лише по одному після окремого порівняння збірок.

`node scripts/diff-global-surface.cjs <baseline-dir> [candidate-dir]`
fails on unexpected function source/type differences, page errors in either
build, or missing JS/CSS/HTML. Intentional function changes require an explicit
`--allow=_loadRS,rwe2Close`; removed functions cannot be allowed. This is a
loaded-global check, not proof of closure/data/event-handler equivalence.

The deploy check always tests the comparison guards. To compare an actual
baseline build as well, set `ACEIL_GLOBAL_BASELINE` and, only for reviewed
merges, `ACEIL_GLOBAL_ALLOW` (comma-separated function names).
