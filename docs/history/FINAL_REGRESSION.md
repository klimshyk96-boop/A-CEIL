# Перевірки — 2026-10-15

## Додаткова стабілізація — 2026-10-16

- Новий `tests/stability-regression.test.cjs` перевіряє короткий маршрут `/r/` і сумісність старого `/report/`.
- Safari на телефоні та встановлена PWA використовують один вбудований перегляд і однакове структуроване креслення.
- Хмарна публікація має обмеження часу та не очікує кадр анімації у фоновій вкладці.
- Service worker наперед кешує лише оболонку; версійні локальні JS/CSS після першого відкриття працюють cache-first.
- Статичний набір для 159 runtime-скриптів проходить. Повторний браузерний прогін потребує встановленого Chromium для Playwright.
- Перевірка дублювання підтверджує: однакових або відмінних лише пробілами JS-файлів немає;
  прибрано три порожні повторні обгортки відкриття модалей/звіту.
- Геометричний solver і перевірка замірів використовують спільні distance/area з `A·CEILGeometry`.
- Назви чотирьох типів лінійного освітлення беруться зі спільного реєстру, а джерела
  автопрорахунку залишаються прив'язаними до незмінних ID.

48 браузерних перевірок пройшли у Chromium 134 в ізольованому локальному середовищі.
Окремо пройдено 44 варіанти голосового розбору чисел і 6 голосових команд.
Supabase замінений тестовим адаптером лише у tests/browser-review.cjs; зовнішні запити заблоковані.
Цей адаптер не підключений у застосунку.

- Порівняно обчислені властивості стилів елементів з id на ширинах 390/1440/2560 px: відмінностей немає.
- Немає відсутніх локальних ресурсів або необроблених JS-помилок.
- Перерахунок координат із зумом/зсувом перевірений для 390px DPR1, 390px DPR3, 1440px DPR2.
- Малювання не змінює геометрію, ціни чи кількості в тестовому стані.
- Експорт поточної та окремої кімнати: прямокутник/коло, PNG 3000×3000,
  відновлення геометрії, позиції камери, номенклатури та розміру канвасу.
- Режим «пальцем» записується в localStorage.
- A → B → A зберігає розміри; збережені кімнати переживають перезавантаження.
- Видалення кімнати оновлює rooms і state.rooms, кімната не повертається після перезавантаження.
- Відкриття номенклатури зберігає поточні qty/price у тестовому наборі.
- Живе редагування сторони ромба; розгортання/згортання полотна не псує координати чи геометрію.
- Світлова лінія, накладний, вмонтований і магнітний шинопроводи мають окремі стабільні джерела
  довжини, кутів та обривів; світильники кожного шинопроводу також не змішуються.
- Окремий unit-тест відтворює пізній хибний запис усіх ліній у світлову лінію та перевіряє його виправлення за стабільним ID.
- Окремий unit-тест перевіряє, що обрана біла вставка не замінюється чорною під час автопрорахунку, а біла лишається стандартною без явного вибору.
- Перевірено часткову заміну контуру профілем: 12 м периметра з однією тіньовою стіною 3 м дає 9 м базового профілю, 3 м тіньового, 9 м вставки та по 2 кути кожного профілю.
- Повторний рендер кокпіта не створює другого `rmAppLangSheet`.
- Візуально переглянуто креслення складної кімнати на мобільному Retina.

Не перевірено: реальний вхід/синхронізація Supabase, Google OAuth, Safari на фізичному iPhone,
публікація звітів у хмару, оновлення встановленої PWA на реальному пристрої.
Результати локальних тестів не означають перевірку цих зовнішніх сценаріїв.

## Insert choice isolation — 2026-10-18

- Catalog saves (automatic and manual sync) normalize insert selection to white without changing the room snapshot.
- All four cloud/offline merge paths preserve the room's insert choice and ignore a stale black catalog default on a cold load.
- New room/project resets restore white and clear manual quantity overrides. Existing black room snapshots remain black.
- Delayed insert autofill cannot overwrite a newer manual quantity choice; previews establish the chosen insert before calculating its remainder.
- Added `verify-insert-isolation.cjs` to the full test runner. Phone (390px) and desktop (1440px) scenarios pass, including cloud payloads, offline capture/restore, room switching and reload persistence.
- The new regression test fails against the original `a11fe484` build (new project retains black selection/manual overrides).
- Pre-deploy checks pass (162 JS files), as do verify-aceil (30), verify-state (18), verify-golden, verify-autofill (9), verify-pipelines (13), and verify-pwa (6).
- The full runner stops at the existing verify-storage assertion `local cache keeps unsynced + 2 synced`: it stores 7 entries instead of 3. The exact same failure was reproduced on unmodified `a11fe484`; it is outside this insert fix. Remaining suites were run separately as listed above.
