/* js/canvas/220-aceil-canvas-hidpi-v1.js
   Виправлення розмитого канвасу й тексту на ПК (Retina/HiDPI-екрани
   і широкий десктопний layout).

   ==================== ПРИЧИНА ПРОБЛЕМИ ====================
   <canvas id="cv" width="750" height="750"> — растр (буфер
   пікселів) завжди фіксовано 750×750, незалежно від фактичного
   розміру, яким його показує CSS (`canvas{width:100%}`). На
   десктопі (@media min-width:1024px) контейнер канвасу
   розтягується аж до ~1100+ CSS-пікселів завширшки — тобто
   браузер розтягує растр 750px на ~1100+ px, звідси розмиття.
   Додатково, жоден з наявних DPI-множників (devicePixelRatio)
   не враховувався взагалі при рендері (лише в діагностичному
   логуванні) — тому й на Retina/4K моніторах текст і лінії
   виглядають м'якими навіть без розтягування.

   ==================== ЯК ПРАЦЮЄ ВИПРАВЛЕННЯ ====================
   Це "supersampling": реальний растр канвасу робиться в SS разів
   більшим (SS обчислюється з фактичної ширини канвасу на екрані
   й devicePixelRatio), а функція draw() обгортається так, щоб
   домальовувати картинку в SS разів "щільніше", НЕ змінюючи
   жодного числа в самій draw()/019-inline.js — вся внутрішня
   математика (точки кімнати, магічні числа 580/85 в applyRect,
   розміри шрифтів) продовжує працювати в тій самій "номінальній"
   750-одиничній системі координат, як і раніше. Growth відбувається
   ТІЛЬКИ на рівні фінальної растеризації (ctx.setTransform).

   Це той самий прийом, який у вашому коді вже застосовується для
   HD-знімків при генерації звіту (js/reports/077-inline.js,
   captureCanvasHD, ×4) — тут він робиться ПОСТІЙНИМ для живого
   редагування, а не лише для експорту, і множник підбирається
   під конкретний екран замість жорсткого ×4.

   Клік/дотик у канвас (js/nomenclature/019-inline.js:getCanvasPoint,
   findWallSideHit) вже рахує координати через співвідношення
   cv.width/rect.width — тобто ВЖЕ підтримує будь-який множник
   растру автоматично, нічого додатково чіпати не треба.

   ==================== ЩО ПЕРЕВІРИВ, А ЩО НІ ====================
   Перевірив (читанням коду): математику centering (circleMode),
   click/touch-хіттест, HD-знімок звіту (077), перемикання кімнат
   у звіті (104-aceil-multiroom-report-sandbox-fix-v30.js) — усі
   три коректно читають cv.width ДИНАМІЧНО в момент виклику, а не
   покладаються на жорстко зашите число 750, тож мають продовжити
   працювати без змін.

   НЕ зміг перевірити (немає браузера/мережі в моєму середовищі):
   як це виглядає й поводиться в реальному живому редакторі —
   перетягування точок, зум колесом миші, малювання на слабких
   пристроях (супersampling ×2/×3 підвищує навантаження на
   відеопам'ять і швидкість перемальовки). Це найризикованіша
   правка з усіх, які я робив у цьому проєкті — протестуйте
   уважно на тестовому деплої перед продом: намалювати кімнату,
   поставити світло/елементи, змінити розмір вікна браузера,
   згенерувати звіт/PDF, перемкнутись між кількома кімнатами.

   Підключати ПІСЛЯ js/nomenclature/019-inline.js (де визначені
   cv, ctx, draw) — у самому кінці списку canvas-скриптів:
   <script src="js/canvas/220-aceil-canvas-hidpi-v1.js"></script>
*/
(function () {
  "use strict";

  var BASE = 750; // має співпадати з початковим width/height у index.html
  var MAX_SS = 3;  // стеля множника — щоб не перевантажити слабкі пристрої/пам'ять
  var currentSS = 1;
  var resizeTimer = null;

  function computeIdealSS() {
    if (typeof cv === "undefined" || !cv) return 1;
    var dpr = window.devicePixelRatio || 1;
    var cssWidth = cv.getBoundingClientRect().width || BASE;
    var ideal = Math.ceil((cssWidth * dpr) / BASE);
    return Math.max(1, Math.min(MAX_SS, ideal));
  }

  function isCanvasAtOurBaseline() {
    // Розрізняємо "наш" звичайний живий растр від тимчасових станів,
    // які виставляють 077-inline.js (HD-знімок, ×4) чи
    // 104-aceil-multiroom-report-sandbox-fix-v30.js (перемикання
    // кімнат у звіті) — в такі моменти supersample-трансформацію
    // застосовувати НЕ треба, вони мають власну логіку масштабу.
    return cv.width === BASE * currentSS && cv.height === BASE * currentSS;
  }

  function applyResolution(newSS) {
    if (typeof cv === "undefined" || !cv) return;
    currentSS = newSS;
    cv.width = BASE * newSS;
    cv.height = BASE * newSS;
    if (typeof draw === "function") {
      try { draw(); } catch (e) {}
    }
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var ideal = computeIdealSS();
      if (ideal !== currentSS) applyResolution(ideal);
    }, 200);
  }

  function init() {
    if (typeof cv === "undefined" || !cv || typeof ctx === "undefined") {
      // DOM/скрипти ще не готові — спробувати трохи пізніше
      setTimeout(init, 100);
      return;
    }
    applyResolution(computeIdealSS());
    window.addEventListener("resize", onResize);

    var previousDraw = window.draw;
    if (typeof previousDraw !== "function") return;
    window.draw = function () {
      var applySS = isCanvasAtOurBaseline();
      if (applySS) {
        ctx.save();
        ctx.setTransform(currentSS, 0, 0, currentSS, 0, 0);
      }
      var r = previousDraw.apply(this, arguments);
      if (applySS) {
        ctx.restore();
      }
      return r;
    };
    try { draw = window.draw; } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
