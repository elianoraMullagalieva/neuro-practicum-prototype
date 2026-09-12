/* ============================================================
   NEURO — многоступенчатая анимация на GSAP.

   Четыре ступени, каждая со своим смыслом:
     1. BOOT   — система просыпается: сканирующая линия, техно-лог.
     2. INGEST — портрет проявляется, по нему проходит красный свет.
     3. OUTPUT — гигантские литеры выезжают по диагоналям макета.
     4. LIVE   — выноски прочерчиваются, счётчики тикают,
                 сцена дышит и реагирует на курсор.

   Движение только по диагоналям композиции (45° и −39°) —
   тем же, что нарисованы в макете.
   ============================================================ */

(function () {
  "use strict";

  var root = document.querySelector("[data-neuro]");
  if (!root) return;

  // Без GSAP показываем статичную композицию — она самодостаточна.
  if (typeof window.gsap === "undefined") {
    root.classList.add("is-static");
    return;
  }

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    root.classList.add("is-static");
    return;
  }

  /* --------------------------------------------------------
     Сбор элементов
     -------------------------------------------------------- */

  var portrait = root.querySelector(".neuro__portrait");
  var portraitWrap = root.querySelector(".neuro__portrait-wrap");
  var scan = root.querySelector(".neuro__scan");
  var grain = root.querySelector(".neuro__grain");
  var diagonals = root.querySelectorAll(".neuro__diag");
  var boots = root.querySelectorAll("[data-boot]");
  var chars = root.querySelectorAll(".neuro__ch");
  var claimRows = root.querySelectorAll(".neuro__claim-row > span");
  var logItems = root.querySelectorAll("[data-log] li");
  var wirePaths = root.querySelectorAll(".neuro__wire-path, .neuro__leader-path");
  var nodes = root.querySelectorAll(".neuro__node");
  var rules = root.querySelectorAll(".neuro__rule");
  var counters = root.querySelectorAll("[data-count]");
  var statusValue = root.querySelector("[data-status]");
  var scrambleEls = root.querySelectorAll("[data-scramble]");
  var hasScramble = typeof window.scrambleText === "function";

  // Угол диагонали макета: буквы приезжают вдоль неё, а не «откуда попало».
  var DIAG = { x: 0.62, y: -0.78 };

  /* --------------------------------------------------------
     Подготовка штрихов SVG к прочерчиванию
     -------------------------------------------------------- */

  wirePaths.forEach(function (path) {
    var len;
    try {
      len = path.getTotalLength();
    } catch (e) {
      len = 0;
    }
    if (!len) return;
    // Сохраняем авторский dasharray у пунктирной рамки:
    // прочерчиваем её через обёрточную маску длины.
    path.dataset.len = len;
    if (!path.getAttribute("stroke-dasharray")) {
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    } else {
      gsap.set(path, { opacity: 0 });
    }
  });

  /* --------------------------------------------------------
     Стартовые состояния
     -------------------------------------------------------- */

  gsap.set(root, { autoAlpha: 1 });

  // Портрет не «проявляется» затуханием — он раскрывается построчно
  // сверху вниз (--reveal — CSS-переменная, двигает линейную маску
  // в CSS: см. .neuro__portrait-wrap). opacity:1 с самого начала —
  // видимость держит маска, а не прозрачность.
  gsap.set(portraitWrap, { opacity: 1, "--reveal": "0%" });
  var revealEdge = root.querySelector(".neuro__reveal-edge");
  gsap.set(revealEdge, { opacity: 0 });
  gsap.set(portrait, { scale: 1.08, filter: "grayscale(0.8) contrast(1.2) brightness(0.82)" });
  gsap.set(boots, { opacity: 0, y: 8 });
  gsap.set(claimRows, { yPercent: 115 });
  gsap.set(logItems, { opacity: 0, x: 14 });
  gsap.set(nodes, { scale: 0, transformOrigin: "center center" });
  gsap.set(rules, { scaleX: 0 });
  gsap.set(diagonals, { drawSVG: undefined, opacity: 0 });

  // Диагонали прочерчиваем вручную (DrawSVG — платный плагин).
  diagonals.forEach(function (line) {
    var len = Math.hypot(
      line.x2.baseVal.value - line.x1.baseVal.value,
      line.y2.baseVal.value - line.y1.baseVal.value
    );
    gsap.set(line, { attr: { "stroke-dasharray": len }, strokeDashoffset: len, opacity: 1 });
  });

  // Литеры: приезжают вдоль диагонали, из-за портрета.
  chars.forEach(function (ch) {
    var white = ch.classList.contains("is-white");
    gsap.set(ch, {
      opacity: 0,
      x: -110 * DIAG.x,
      y: -110 * DIAG.y,
      scale: white ? 1.18 : 1.06,
      transformOrigin: "50% 60%",
    });
  });

  /* --------------------------------------------------------
     Главный таймлайн
     -------------------------------------------------------- */

  var tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    paused: true,
  });

  /* ---- 1. BOOT: сканирующая линия и техно-лог ---- */

  // Техно-подписи включаются сразу, с первого кадра: сцена не должна
  // начинаться с пустого серого экрана. Мелкие лейблы одновременно
  // «расшифровываются» из случайных символов — система не просто
  // проявляется, а как будто считывает собственные данные.
  tl.addLabel("boot")
    .to(
      boots,
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: { each: 0.07, from: "start" },
        onStart: function () {
          if (!hasScramble) return;
          scrambleEls.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.7, delay: i * 0.05, scrambleStep: 0.03 });
          });
        },
      },
      "boot"
    )
    .to(
      diagonals,
      { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.1 },
      "boot+=0.1"
    )
    .fromTo(
      scan,
      { xPercent: -60, opacity: 0 },
      { xPercent: 420, opacity: 1, duration: 1.4, ease: "power2.inOut" },
      "boot+=0.25"
    )
    .to(scan, { opacity: 0, duration: 0.4 }, "boot+=1.35");

  /* ---- 2. INGEST: портрет раскрывается построчно сверху вниз ---- */

  // Не fade — построчная развёртка (как сканер печатает кадр).
  // Кромка-линия видна всё время раскрытия и гаснет по завершении;
  // красный свет и цвет приходят следом, когда фигура уже раскрыта.
  tl.addLabel("ingest", "boot+=0.75")
    .to(revealEdge, { opacity: 1, duration: 0.15 }, "ingest")
    .to(
      portraitWrap,
      { "--reveal": "118%", duration: 1.5, ease: "power2.inOut" },
      "ingest"
    )
    .to(revealEdge, { opacity: 0, duration: 0.2 }, "ingest+=1.4")
    .to(
      portrait,
      {
        scale: 1,
        filter: "grayscale(0) contrast(1.06) brightness(1) saturate(1.04)",
        duration: 1.6,
        ease: "power2.out",
      },
      "ingest+=0.25"
    );

  /* ---- 3. OUTPUT: литеры выезжают по диагонали ---- */

  // Красные литеры приходят волной, белые (N, D) — с задержкой
  // и защёлкиванием: это акцент композиции.
  var redChars = [];
  var whiteChars = [];
  chars.forEach(function (ch) {
    (ch.classList.contains("is-white") ? whiteChars : redChars).push(ch);
  });

  tl.addLabel("output", "ingest+=0.55")
    .to(
      redChars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.15,
        ease: "expo.out",
        stagger: { each: 0.075, from: "start" },
      },
      "output"
    )
    .to(
      whiteChars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "back.out(1.6)",
      },
      "output+=0.42"
    );

  /* ---- 4. LIVE: выноски, манифест, лог, счётчики ---- */

  tl.addLabel("live", "output+=0.6")
    .to(
      claimRows,
      { yPercent: 0, duration: 0.85, ease: "power3.out", stagger: 0.09 },
      "live"
    )
    .to(rules, { scaleX: 1, duration: 0.5, stagger: 0.1 }, "live+=0.2")
    .to(
      wirePaths,
      {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power2.inOut",
        stagger: 0.1,
      },
      "live+=0.1"
    )
    .to(
      nodes,
      { scale: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.06 },
      "live+=0.55"
    )
    .to(
      logItems,
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.12,
        onStart: function () {
          if (!hasScramble) return;
          logItems.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.6, delay: i * 0.12, scrambleStep: 0.03 });
          });
        },
      },
      "live+=0.4"
    );

  // Счётчики телеметрии добегают до значений макета
  counters.forEach(function (el, i) {
    var target = parseFloat(el.dataset.count);
    var obj = { v: 0 };
    tl.to(
      obj,
      {
        v: target,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: function () {
          el.textContent = obj.v.toFixed(2).padStart(6, "0");
        },
      },
      "live+=" + (0.1 + i * 0.08)
    );
  });

  // STATUS дописывается по букве — как в терминале
  if (statusValue) {
    var word = "ACTIVE";
    var typed = { i: 0 };
    statusValue.textContent = "";
    tl.to(
      typed,
      {
        i: word.length,
        duration: 0.55,
        ease: "none",
        onUpdate: function () {
          statusValue.textContent = word.slice(0, Math.round(typed.i));
        },
      },
      "live+=0.6"
    );
  }

  /* --------------------------------------------------------
     Постоянная жизнь сцены: ничего не замирает насмерть
     -------------------------------------------------------- */

  function startAmbient() {
    // Портрет едва дышит
    gsap.to(portrait, {
      scale: 1.025,
      duration: 9,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Зерно живёт
    gsap.to(grain, {
      x: "+=18",
      y: "+=12",
      duration: 3.2,
      ease: "none",
      repeat: -1,
      yoyo: true,
    });

    // Телеметрия продолжает тикать в младших разрядах —
    // система работает, а не показывает скриншот.
    counters.forEach(function (el) {
      var base = parseFloat(el.dataset.count);
      gsap.to(
        { v: 0 },
        {
          v: 1,
          duration: 2.4,
          repeat: -1,
          ease: "none",
          onRepeat: function () {
            var drift = base + (Math.random() - 0.5) * 0.6;
            el.textContent = Math.abs(drift).toFixed(2).padStart(6, "0");
          },
        }
      );
    });

    // Узлы выносок пульсируют по очереди
    gsap.to(nodes, {
      opacity: 0.35,
      duration: 1.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: { each: 0.3, from: "random" },
    });
  }

  tl.call(startAmbient, null, "live+=1.2");

  // Мелкие лейблы перескрамбливаются при наведении — деталь, которая
  // держит сцену «живой» и после того, как основной таймлайн отыграл.
  if (hasScramble && window.matchMedia("(pointer: fine)").matches) {
    scrambleEls.forEach(function (el) {
      window.scrambleText.hoverize(el, { duration: 0.5, scrambleStep: 0.03 });
    });
  }

  /* --------------------------------------------------------
     Параллакс от курсора — сцена отзывается на присутствие
     -------------------------------------------------------- */

  var layers = [
    { el: portraitWrap, depth: 8 },
    { el: root.querySelector(".neuro__word--left"), depth: 18 },
    { el: root.querySelector(".neuro__word--right"), depth: 18 },
    { el: root.querySelector(".neuro__diagonals"), depth: 26 },
  ];

  var setters = layers
    .filter(function (l) {
      return l.el;
    })
    .map(function (l) {
      return {
        depth: l.depth,
        x: gsap.quickTo(l.el, "x", { duration: 0.9, ease: "power3.out" }),
        y: gsap.quickTo(l.el, "y", { duration: 0.9, ease: "power3.out" }),
      };
    });

  var pointerFine = window.matchMedia("(pointer: fine)").matches;

  if (pointerFine) {
    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      setters.forEach(function (s) {
        s.x(nx * s.depth);
        s.y(ny * s.depth * 0.6);
      });
    });

    root.addEventListener("pointerleave", function () {
      setters.forEach(function (s) {
        s.x(0);
        s.y(0);
      });
    });
  }

  /* --------------------------------------------------------
     Запуск: по входу секции в экран
     -------------------------------------------------------- */

  function play() {
    tl.play();
  }

  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: root,
      start: "top 72%",
      once: true,
      onEnter: play,
    });
  } else {
    play();
  }

  // Если картинка ещё грузится — ждём её, чтобы ступень INGEST
  // не проигралась по пустому месту.
  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", function () {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  /* ========================================================
     ПЕРЕХОД К БЛОКУ 2 — «мысль сворачивается в ядро»

     Скролл продолжает ту же историю: литеры NEURO и DOES
     втягиваются по своим диагоналям обратно к центру кадра —
     туда, где было лицо, — портрет уходит в глубину,
     и из точки схода разворачивается сфера из слов.
     ======================================================== */

  var core = document.querySelector("[data-core]");
  var sphereCanvas = core && core.querySelector("[data-sphere]");

  if (!core || !sphereCanvas || typeof window.TextSphere === "undefined") return;

  // Белые глифы держат контраст на тёмном фоне; красный акцент — только
  // на ближней к зрителю четверти сферы, для объёма (см. text-sphere.js).
  var sphere = new window.TextSphere(sphereCanvas, {
    word: "sales",
    color: "#f3f1f0",
    accentColor: "#ff3b48",
    fontFamily: '"B612 Mono", monospace',
    fontWeight: 400,
    fontSize: 15,
    speed: 3.6,
    rotationSide: "counterclockwise",
    twist: 50,
    letterSpacing: 800,
    assembly: 0,
  });

  var coreEls = core.querySelectorAll("[data-core-el]");
  var coreRows = core.querySelectorAll(".core__title-row > span");
  var glyphsOut = core.querySelector("[data-glyphs]");

  gsap.set(coreEls, { opacity: 0, y: 16 });
  gsap.set(coreRows, { yPercent: 115 });

  var wordLeft = root.querySelector(".neuro__word--left");
  var wordRight = root.querySelector(".neuro__word--right");

  // Первая сцена закреплена, пока идёт сворачивание.
  var handoff = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: window.matchMedia("(max-width: 720px)").matches ? "+=70%" : "+=110%",
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
    },
  });

  // Канвас поднимаем поверх закреплённой первой сцены, чтобы ядро
  // собиралось в кадре, а не за его пределами.
  gsap.set(sphereCanvas, { position: "fixed", inset: 0, zIndex: 5, opacity: 0 });
  handoff.to(sphereCanvas, { opacity: 1, ease: "power1.out", duration: 0.5 }, 0.25);

  // Канвас возвращается в поток только когда секция ядра реально
  // дошла до верха экрана. Иначе между откреплением и появлением
  // секции остаётся пустой (чёрный) кадр — особенно заметно на мобильном.
  function releaseCanvas() {
    gsap.set(sphereCanvas, { clearProps: "position,inset,zIndex" });
  }
  function holdCanvas() {
    gsap.set(sphereCanvas, { position: "fixed", inset: 0, zIndex: 5 });
  }

  window.ScrollTrigger.create({
    trigger: core,
    start: "top top",
    onEnter: releaseCanvas,
    onLeaveBack: holdCanvas,
  });

  // 1. Мелкая техно-графика гаснет первой — она обслуживала первую сцену
  handoff
    .to(
      [boots, logItems, claimRows, wirePaths, nodes, diagonals],
      { opacity: 0, ease: "power1.in", duration: 0.4 },
      0
    )
    // 2. Литеры втягиваются к центру — по тем же диагоналям, что и приходили.
    //    Уходят не в ноль: остаются видны до самого схода в ядро.
    .to(
      wordLeft,
      { x: 230, y: 150, scale: 0.28, opacity: 0, ease: "power2.in", duration: 0.85 },
      0.12
    )
    .to(
      wordRight,
      { x: -230, y: -60, scale: 0.28, opacity: 0, ease: "power2.in", duration: 0.85 },
      0.12
    )
    // 3. Портрет обесцвечивается и уходит в глубину — обратный ход INGEST
    .to(
      portrait,
      {
        scale: 1.3,
        filter: "grayscale(1) contrast(1.3) brightness(0.35)",
        ease: "power2.in",
        duration: 0.95,
      },
      0.1
    )
    .to(portraitWrap, { opacity: 0, ease: "power2.in", duration: 0.7 }, 0.3);

  // 4. Фон темнеет РАНЬШЕ схода: ядро должно собираться уже на глубине,
  //    а не на светлом экране. Это убирает пустой кадр в середине.
  // Темнеет и сама секция, и её фоновый слой — иначе светлый .neuro__bg
  // остаётся поверх и ядро собирается на сером.
  var bgLayer = root.querySelector(".neuro__bg");
  handoff
    .to(root, { backgroundColor: "#0a0809", ease: "power2.in", duration: 0.7 }, 0.08)
    .to(bgLayer, { opacity: 0, ease: "power2.in", duration: 0.65 }, 0.12)
    .to(grain, { opacity: 0, ease: "power1.in", duration: 0.5 }, 0.1);

  // 5. Сфера начинает собираться, пока литеры ещё видны — фазы
  //    перекрываются, движение не прерывается ни на кадр.
  var assembly = { v: 0 };
  handoff.to(
    assembly,
    {
      v: 1,
      ease: "power2.out",
      duration: 1.15,
      onUpdate: function () {
        sphere.setAssembly(assembly.v);
      },
    },
    0.3
  );

  // 6. Подписи второй сцены приходят, когда ядро уже держит форму
  var coreScrambleEls = core.querySelectorAll("[data-scramble]");
  gsap
    .timeline({
      scrollTrigger: {
        trigger: core,
        start: "top 62%",
        once: true,
      },
      defaults: { ease: "power3.out" },
    })
    .to(coreRows, { yPercent: 0, duration: 0.9, stagger: 0.1 })
    .to(
      coreEls,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        onStart: function () {
          if (!hasScramble) return;
          coreScrambleEls.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.7, delay: 0.15 + i * 0.08, scrambleStep: 0.03 });
          });
        },
      },
      0.15
    );

  if (hasScramble && window.matchMedia("(pointer: fine)").matches) {
    coreScrambleEls.forEach(function (el) {
      window.scrambleText.hoverize(el, { duration: 0.5, scrambleStep: 0.03 });
    });
  }

  // Счётчик глифов добегает до реального числа в геометрии
  if (glyphsOut) {
    window.ScrollTrigger.create({
      trigger: core,
      start: "top 62%",
      once: true,
      onEnter: function () {
        var total = sphere._geometry.length || 0;
        var obj = { v: 0 };
        gsap.to(obj, {
          v: total,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: function () {
            glyphsOut.textContent = String(Math.round(obj.v)).padStart(4, "0");
          },
        });
      },
    });
  }
})();

/* ============================================================
   БЛОК 3 — «НОЧНАЯ СМЕНА»

   Диагональная ось суток (00:00→24:00) вместо сетки из карточек.
   Точки развешаны вдоль SVG-пути с разным вылетом — как заметки
   на полях, не в ряд. Секция пинится на 300vh:

     progress 0.00–0.75 — ось прочерчивается, точки загораются
                            по своему часу, текстура греется
                            от ночи (hue-rotate холодный) к дню
     progress 0.75–1.00 — крупный спайк 03:40, итоговые цифры

   Реализация без платных DrawSVG/MotionPath-по-объекту:
   ось — strokeDashoffset (тот же приём, что в блоке 1 для диагоналей),
   расстановка точек — getPointAtLength() по длине пути.
   ============================================================ */

(function () {
  "use strict";

  var section = document.querySelector("[data-shift]");
  if (!section || typeof window.gsap === "undefined" || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var pin = section.querySelector("[data-shift-pin]");
  var texture = section.querySelector("[data-shift-texture]");
  var axisLine = section.querySelector("[data-shift-line]");
  var ticksGroup = section.querySelector("[data-shift-ticks]");
  var dotsGroup = section.querySelector("[data-shift-dots]");
  var spike = section.querySelector("[data-shift-spike]");
  var tally = section.querySelector("[data-shift-tally]");
  var tallyNums = section.querySelectorAll("[data-tally]");

  if (!axisLine) return;

  /* --------------------------------------------------------
     Данные: события суток.
     AI отвечает равномерно все 24 часа (лёгкий разброс, чтобы
     не выглядело как метроном). Менеджер — только 9:00–18:00,
     ночью его ось физически пустая.
     -------------------------------------------------------- */

  function hoursToEvents() {
    var events = [];
    // AI: примерно раз в 70–90 минут круглые сутки — 18 точек.
    var aiHour = 0.3;
    while (aiHour < 24) {
      events.push({ hour: aiHour, type: "ai" });
      aiHour += 1.3 + Math.sin(aiHour) * 0.35;
    }
    // Менеджер: рабочий день 9:00–18:00, реже — 4 точки.
    [9.5, 12.2, 14.8, 17.1].forEach(function (h) {
      events.push({ hour: h, type: "human" });
    });
    return events;
  }

  var events = hoursToEvents();

  /* --------------------------------------------------------
     Геометрия пути: длина, точки по часам, засечки каждые 3 часа.
     -------------------------------------------------------- */

  var pathLen = axisLine.getTotalLength();

  function pointAtHour(hour) {
    var t = clamp01(hour / 24);
    return axisLine.getPointAtLength(t * pathLen);
  }

  function clamp01(v) {
    return Math.min(Math.max(v, 0), 1);
  }

  // Нормаль к оси в данной точке — чтобы вешать точки "в сторону",
  // а не вдоль линии.
  function normalAt(hour) {
    var t = clamp01(hour / 24);
    var d = 0.01;
    var p0 = axisLine.getPointAtLength(clamp01(t - d) * pathLen);
    var p1 = axisLine.getPointAtLength(clamp01(t + d) * pathLen);
    var dx = p1.x - p0.x;
    var dy = p1.y - p0.y;
    var len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  }

  var svgNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    var node = document.createElementNS(svgNS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  // Часовые засечки — каждые 3 часа, подпись только на 00/06/12/18/24.
  for (var h = 0; h <= 24; h += 3) {
    var p = pointAtHour(h);
    var n = normalAt(h);
    var tickLen = 6;
    var tick = el("line", {
      class: "shift__tick",
      x1: p.x - n.x * tickLen,
      y1: p.y - n.y * tickLen,
      x2: p.x + n.x * tickLen,
      y2: p.y + n.y * tickLen,
    });
    ticksGroup.appendChild(tick);

    var label = el("text", {
      class: "shift__tick-label",
      x: p.x + n.x * 16,
      y: p.y + n.y * 16 + 3,
      "text-anchor": "middle",
    });
    label.textContent = (h < 10 ? "0" : "") + h + ":00";
    ticksGroup.appendChild(label);
  }

  // Точки-события: вылет от оси чередуется по знаку и расстоянию —
  // "заметки на полях", не строгий ряд.
  var dotEls = events.map(function (ev, i) {
    var p = pointAtHour(ev.hour);
    var n = normalAt(ev.hour);
    // Псевдослучайный, но стабильный вылет — зависит от индекса.
    var side = i % 2 === 0 ? 1 : -1;
    var reach = 22 + ((i * 37) % 30);
    var ox = p.x + n.x * side * reach;
    var oy = p.y + n.y * side * reach;

    var g = el("g", {
      class: "shift__dot shift__dot--" + ev.type,
      "data-hour": ev.hour.toFixed(2),
    });

    var connector = el("line", {
      class: "shift__dot-line",
      x1: p.x,
      y1: p.y,
      x2: ox,
      y2: oy,
    });
    var core = el("circle", {
      class: "shift__dot-core",
      cx: ox,
      cy: oy,
      r: ev.type === "ai" ? 4 : 3.2,
    });

    g.appendChild(connector);
    g.appendChild(core);
    dotsGroup.appendChild(g);

    return { el: g, hour: ev.hour, type: ev.type };
  });

  /* --------------------------------------------------------
     Спайк 03:40 — позиция через CSS custom properties.
     -------------------------------------------------------- */

  // side=-1 и увеличенный reach уводят спайк вверх-влево от оси,
  // а не вниз к левому нижнему углу — иначе он садится ровно
  // на итоговый блок [data-shift-tally], который стоит в том же углу.
  var spikeHour = 3 + 40 / 60;
  var spikePoint = pointAtHour(spikeHour);
  var spikeNormal = normalAt(spikeHour);
  var spikeReach = 170;
  var spikeSide = -1;
  var spikeXPct = ((spikePoint.x + spikeNormal.x * spikeReach * spikeSide) / 1440) * 100;
  var spikeYPct = ((spikePoint.y + spikeNormal.y * spikeReach * spikeSide) / 1024) * 100;
  if (spike) {
    spike.style.setProperty("--spike-x", spikeXPct + "%");
    spike.style.setProperty("--spike-y", spikeYPct + "%");
  }

  /* --------------------------------------------------------
     Стартовые состояния
     -------------------------------------------------------- */

  gsap.set(axisLine, { strokeDasharray: pathLen, strokeDashoffset: pathLen });
  gsap.set(dotEls.map(function (d) { return d.el; }), { opacity: 0, scale: 0.4, transformOrigin: "center" });
  gsap.set(spike, { opacity: 0 });
  gsap.set(section.querySelector(".shift__spike-dot"), { scale: 0 });
  gsap.set(tally, { opacity: 0, y: 16 });
  gsap.set(section.querySelector(".shift__heading"), { opacity: 0, y: 12 });
  gsap.set(section.querySelector(".shift__tag"), { opacity: 0 });

  if (reduced) {
    // Статичный, но полный кадр: всё показано, без движения.
    gsap.set(axisLine, { strokeDashoffset: 0 });
    gsap.set(dotEls.map(function (d) { return d.el; }), { opacity: 1, scale: 1 });
    gsap.set(spike, { opacity: 1 });
    gsap.set(section.querySelector(".shift__spike-dot"), { scale: 1 });
    gsap.set(tally, { opacity: 1, y: 0 });
    gsap.set(section.querySelector(".shift__heading"), { opacity: 1, y: 0 });
    gsap.set(section.querySelector(".shift__tag"), { opacity: 1 });
    tallyNums.forEach(function (elNum) {
      elNum.textContent = elNum.dataset.tally;
    });
    return;
  }

  /* --------------------------------------------------------
     Шапка секции: тег и заголовок — это обложка блока, а не
     событие внутри прокрутки времени. Показываем её обычным
     enter-триггером сразу, как только секция доехала до топа —
     не через scrub, у которого при progress=0 до первого события
     скролла состояние остаётся тем, что задал gsap.set() (opacity:0).
     -------------------------------------------------------- */

  gsap.timeline({
    scrollTrigger: { trigger: section, start: "top 85%", once: true },
    defaults: { ease: "power2.out" },
  })
    .to(section.querySelector(".shift__tag"), { opacity: 1, duration: 0.4 })
    .to(section.querySelector(".shift__heading"), { opacity: 1, y: 0, duration: 0.5 }, 0.08);

  /* --------------------------------------------------------
     Скролл-таймлайн: пин на 300vh
     -------------------------------------------------------- */

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=200%",
      scrub: 0.6,
      pin: pin,
      pinSpacing: true,
    },
  });

  // Ось прочерчивается на первых 55% скролла
  tl.to(axisLine, { strokeDashoffset: 0, ease: "none", duration: 0.55 }, 0.05);

  // Точки загораются в момент, когда прочерченная ось доходит до их часа —
  // время в скролле буквально совпадает со временем на шкале.
  dotEls.forEach(function (d) {
    var at = 0.05 + (d.hour / 24) * 0.55;
    tl.to(
      d.el,
      { opacity: 1, scale: 1, duration: 0.03, ease: "back.out(2)" },
      at
    );
  });

  // Текстура греется от холодной ночи к тёплому дню и обратно к ночи —
  // прогресс совпадает с прочерчиванием оси (те же 0.05–0.6). GSAP не
  // твинит составной filter напрямую, поэтому ведём через прокси-объект.
  var heat = { v: 0 };
  tl.to(
    heat,
    {
      v: 1,
      duration: 0.35,
      ease: "power1.inOut",
      onUpdate: function () {
        // 0 → ночь (190°, холодный синий), 1 → день (20°, тёплый)
        var deg = gsap.utils.interpolate(190, 20, heat.v);
        texture.style.filter = "hue-rotate(" + deg + "deg) saturate(1.4) brightness(0.9)";
      },
    },
    0.05
  ).to(
    heat,
    {
      v: 0,
      duration: 0.25,
      ease: "power1.inOut",
      onUpdate: function () {
        var deg = gsap.utils.interpolate(190, 20, heat.v);
        texture.style.filter = "hue-rotate(" + deg + "deg) saturate(1.4) brightness(0.9)";
      },
    },
    0.4
  );

  // Спайк 03:40 — крупный акцент, подъезжает лёгким motionPath-штрихом
  tl.to(spike, { opacity: 1, duration: 0.08 }, 0.62)
    .to(
      section.querySelector(".shift__spike-dot"),
      { scale: 1, duration: 0.1, ease: "back.out(2.6)" },
      0.64
    );

  // Итоговые цифры — приходят в конце, контраст масштабов делает работу
  tl.to(tally, { opacity: 1, y: 0, duration: 0.1 }, 0.78);

  tallyNums.forEach(function (elNum, i) {
    var target = parseInt(elNum.dataset.tally, 10);
    var obj = { v: 0 };
    tl.to(
      obj,
      {
        v: target,
        duration: 0.14,
        ease: "power2.out",
        onUpdate: function () {
          elNum.textContent = String(Math.round(obj.v));
        },
      },
      0.8 + i * 0.04
    );
  });
})();
