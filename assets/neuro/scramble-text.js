/* ============================================================
   Scramble Text — лёгкая замена платному GSAP ScrambleTextPlugin.

   Символы прогоняются через случайный набор и один за другим
   «защёлкиваются» на целевом — слева направо, с затухающим шансом
   промаха у уже решённых позиций. Не трогает разметку — каждая
   вызванная строка просто подменяет textContent во времени.

   Использование:
     scrambleText(el, "NEURAL SYSTEM / 01", { duration: 0.9, delay: 0.1 });
     scrambleText.hoverize(el);           // повтор скрамбла при наведении
     scrambleText.onReveal(el, opts);     // разово, когда элемент входит в кадр
   ============================================================ */

(function (global) {
  "use strict";

  var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/=<>";
  var RU_CHARS = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789#$%&*+-/=<>";

  function pickCharset(text) {
    return /[а-яё]/i.test(text) ? RU_CHARS : CHARS;
  }

  function randomChar(charset) {
    return charset[(Math.random() * charset.length) | 0];
  }

  var raf = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : function (fn) {
    return global.setTimeout(fn, 16);
  };
  var caf = global.cancelAnimationFrame ? global.cancelAnimationFrame.bind(global) : global.clearTimeout;

  /**
   * @param {HTMLElement} el       — текстовый узел, содержащий только текст
   * @param {string} [targetText]  — куда сходится; по умолчанию текущий текст el
   * @param {object} [opts]
   *   duration  — сек, полное время сборки строки (по умолчанию 0.8)
   *   delay     — сек, задержка старта (по умолчанию 0)
   *   scrambleStep — сек между сменами случайного символа на нерешённых позициях (0.035)
   *   revealDelay  — доля времени между «щелчками» решённых позиций (0..1, по умолчанию считается от duration)
   */
  function scrambleText(el, targetText, opts) {
    if (!el) return { cancel: function () {} };
    opts = opts || {};
    var target = targetText != null ? targetText : el.textContent;
    var chars = Array.from(target);
    var charset = pickCharset(target);
    var duration = (opts.duration != null ? opts.duration : 0.8) * 1000;
    var delay = (opts.delay != null ? opts.delay : 0) * 1000;
    var scrambleStep = (opts.scrambleStep != null ? opts.scrambleStep : 0.035) * 1000;

    var rafId = null;
    var timeoutId = null;
    var cancelled = false;
    var startTime = null;
    var lastScrambleTick = 0;
    // Каждая позиция решается в свою долю общего времени — волна слева направо.
    var resolveAt = chars.map(function (_, i) {
      return (i / Math.max(chars.length - 1, 1)) * duration * 0.72 + duration * 0.28;
    });

    function render(now) {
      if (cancelled) return;
      if (startTime === null) startTime = now;
      var elapsed = now - startTime;

      var doScrambleTick = now - lastScrambleTick >= scrambleStep;
      if (doScrambleTick) lastScrambleTick = now;

      var out = "";
      var done = true;
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (ch === " ") {
          out += " ";
          continue;
        }
        if (elapsed >= resolveAt[i]) {
          out += ch;
        } else {
          done = false;
          out += doScrambleTick || elapsed === 0 ? randomChar(charset) : el.dataset.scrambleLast_ || randomChar(charset);
        }
      }
      el.textContent = out;

      if (!done) {
        rafId = raf(render);
      } else {
        el.textContent = target;
      }
    }

    timeoutId = global.setTimeout(function () {
      if (cancelled) return;
      rafId = raf(render);
    }, delay);

    return {
      cancel: function () {
        cancelled = true;
        if (rafId) caf(rafId);
        if (timeoutId) global.clearTimeout(timeoutId);
      },
    };
  }

  /**
   * Запускает скрамбл каждый раз, когда el входит во вьюпорт (once по умолчанию).
   */
  function onReveal(el, opts) {
    if (!el || typeof IntersectionObserver === "undefined") {
      scrambleText(el, null, opts);
      return;
    }
    var target = el.textContent;
    var once = opts && opts.once !== false;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            scrambleText(el, target, opts);
            if (once) io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return io;
  }

  /**
   * Перескрамбливает строку при наведении/фокусе — для мелких лейблов,
   * которые живут рядом с курсором (телеметрия, теги).
   */
  function hoverize(el, opts) {
    if (!el) return;
    var target = el.textContent;
    var active = null;
    function run() {
      if (active) active.cancel();
      active = scrambleText(el, target, opts);
    }
    el.addEventListener("mouseenter", run);
    el.addEventListener("focus", run);
  }

  scrambleText.onReveal = onReveal;
  scrambleText.hoverize = hoverize;

  global.scrambleText = scrambleText;
})(window);
