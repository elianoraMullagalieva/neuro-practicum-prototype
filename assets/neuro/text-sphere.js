/* ============================================================
   Word Globe — порт React-компонента Originkit в ванильный JS.
   Вся математика (полосы, twist, перспектива, сортировка по глубине)
   сохранена один в один; изменены только слой рендера и API.

   Использование:
     var sphere = new TextSphere(canvasEl, { word: 'нейро', color: '#85000c' });
     sphere.setAssembly(0..1);  // 0 — точка, 1 — собранная сфера
     sphere.destroy();
   ============================================================ */

(function (global) {
  "use strict";

  var VIEWBOX_SIZE = 720;
  var SILHOUETTE_RADIUS = 286;
  var FULL_ROTATION = Math.PI * 2;
  var MAX_GLYPHS = 6000;

  var CAMERA_DISTANCE = 6.1;
  var EQUATOR_BULGE = 0.28;
  var SPARSE_SPACING_RATIO = 1.92;

  var LINE_GAP_WEIGHT = 4;
  var CUSTOM_GAP_WEIGHT = 19;
  var SEAM_GAP_WEIGHT = 13;

  var DENSE_FACE_GAPS = [
    "line", "line", "line", "custom", "line", "line", "line", "line",
    "line", "line", "line", "line", "custom", "line", "line", "line",
  ];

  var SPARSE_FACE_GAPS = [
    "line", "custom", "line", "line", "line", "custom", "line", "line",
  ];

  var BAND_GAPS = DENSE_FACE_GAPS.concat(["seam"], SPARSE_FACE_GAPS, ["seam"]);
  var DENSE_BAND_COUNT = DENSE_FACE_GAPS.length + 1;

  var SPHERE_RADIUS =
    SILHOUETTE_RADIUS /
    (CAMERA_DISTANCE / Math.sqrt(CAMERA_DISTANCE * CAMERA_DISTANCE - 1));

  var BAND_LONGITUDES = (function () {
    var intervalWeights = BAND_GAPS.map(function (gapKind) {
      if (gapKind === "custom") return CUSTOM_GAP_WEIGHT;
      if (gapKind === "seam") return SEAM_GAP_WEIGHT;
      return LINE_GAP_WEIGHT;
    });
    var totalWeight = intervalWeights.reduce(function (a, b) {
      return a + b;
    }, 0);

    var travelledWeight = 0;

    return BAND_GAPS.map(function (_, bandIndex) {
      if (bandIndex > 0) {
        travelledWeight += intervalWeights[bandIndex - 1] || 0;
      }
      return (travelledWeight / totalWeight) * FULL_ROTATION;
    });
  })();

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function getDeterministicVariation(index, salt) {
    var value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function wrapLongitude(longitude) {
    return ((longitude % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION;
  }

  function walkBand(
    startLongitude, startPolarAngle, spacing, twist, settings,
    characters, characterWidths, startCharacterIndex, variationSeed, output
  ) {
    var polarAngle = startPolarAngle;
    var characterIndex = startCharacterIndex;

    while (polarAngle < Math.PI && output.length < MAX_GLYPHS) {
      var slot = characterIndex % characters.length;
      var character = characters[slot] || "d";

      var advancePixels = Math.max(
        characterWidths[slot] * spacing,
        settings.fontSize * 0.25
      );
      var advanceRadians = advancePixels / SPHERE_RADIUS;

      if (character.trim().length > 0) {
        output.push({
          character: character,
          longitude: wrapLongitude(
            startLongitude + twist * polarAngle + EQUATOR_BULGE * Math.sin(polarAngle)
          ),
          opacityVariation:
            0.82 + getDeterministicVariation(output.length, variationSeed) * 0.18,
          polarAngle: polarAngle,
          // Индивидуальная задержка сборки — глифы прилетают волной,
          // а не все разом.
          assemblyOrder: getDeterministicVariation(output.length, variationSeed + 7),
        });
      }

      var arcStretch = Math.sqrt(
        1 + twist * twist * Math.sin(polarAngle) * Math.sin(polarAngle)
      );
      polarAngle += advanceRadians / arcStretch;
      characterIndex += 1;
    }

    return characterIndex;
  }

  function buildGeometry(context, settings, twist) {
    var characters = Array.from(settings.word || "dream");
    var previousFont = context.font;
    context.font =
      settings.fontWeight + " " + settings.fontSize + "px " + settings.fontFamily;
    var characterWidths = characters.map(function (character) {
      return context.measureText(character).width;
    });
    context.font = previousFont;

    var glyphs = [];
    var characterIndex = 0;

    var averageWidth =
      characterWidths.reduce(function (total, width) {
        return total + width;
      }, 0) / Math.max(characterWidths.length, 1);
    var poleStagger = (averageWidth * settings.letterSpacing) / SPHERE_RADIUS;

    BAND_LONGITUDES.forEach(function (startLongitude, bandIndex) {
      var spacing =
        bandIndex < DENSE_BAND_COUNT
          ? settings.letterSpacing
          : settings.letterSpacing * SPARSE_SPACING_RATIO;

      characterIndex = walkBand(
        startLongitude,
        (bandIndex / BAND_LONGITUDES.length) * poleStagger,
        spacing,
        twist,
        settings,
        characters,
        characterWidths,
        characterIndex,
        bandIndex,
        glyphs
      );
    });

    return glyphs;
  }

  /* --------------------------------------------------------
     Класс
     -------------------------------------------------------- */

  function TextSphere(canvas, options) {
    if (!canvas) throw new Error("TextSphere: нужен canvas");
    var opts = options || {};

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) return;

    this.word = opts.word || "нейро";
    this.color = opts.color || "#85000c";
    this.accentColor = opts.accentColor || null;
    this.fontFamily = opts.fontFamily || "B612 Mono, monospace";
    this.fontWeight = opts.fontWeight || 400;
    this.fontSize = opts.fontSize || 15;
    this.speed = opts.speed != null ? opts.speed : 7;
    this.rotationSide = opts.rotationSide || "counterclockwise";
    this.twist = opts.twist != null ? opts.twist : 50;
    this.letterSpacing = opts.letterSpacing != null ? opts.letterSpacing : 800;

    // 0 — глифы стянуты в точку, 1 — собранная сфера
    this.assembly = opts.assembly != null ? opts.assembly : 1;

    this._geometry = [];
    this._signature = "";
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._rotationElapsed = 0;
    this._previousTimestamp = null;
    this._frameScheduled = false;
    this._rafId = null;
    this._disposed = false;
    this._isVisible = true;

    this._reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");

    this._renderFrame = this._renderFrame.bind(this);
    this._syncCanvasSize = this._syncCanvasSize.bind(this);
    this._onReducedMotionChange = this._onReducedMotionChange.bind(this);

    this._resizeObserver = new ResizeObserver(this._syncCanvasSize);
    this._resizeObserver.observe(canvas);

    var self = this;
    this._intersectionObserver = new IntersectionObserver(
      function (entries) {
        var next = entries[0] ? entries[0].isIntersecting : true;
        if (next === self._isVisible) return;
        self._isVisible = next;
        self._previousTimestamp = null;
        if (!next && self._rafId !== null) {
          global.cancelAnimationFrame(self._rafId);
          self._rafId = null;
          self._frameScheduled = false;
          return;
        }
        self._scheduleFrame();
      },
      { rootMargin: "100px" }
    );
    this._intersectionObserver.observe(canvas);

    this._reducedMotion.addEventListener("change", this._onReducedMotionChange);
    this._syncCanvasSize();

    if (global.document.fonts && global.document.fonts.ready) {
      global.document.fonts.ready.then(function () {
        if (self._disposed) return;
        self._signature = "";
        self._scheduleFrame();
      });
    }
  }

  TextSphere.prototype._ensureGeometry = function () {
    var settings = {
      fontFamily: this.fontFamily,
      fontSize: Math.max(this.fontSize, 4),
      fontWeight: this.fontWeight,
      letterSpacing: Math.max(this.letterSpacing, 40) / 100,
      word: this.word,
    };
    var twistValue = this.twist / 10;
    var signature = JSON.stringify([settings, twistValue]);
    if (signature === this._signature) return;
    this._signature = signature;
    this._geometry = buildGeometry(this.context, settings, twistValue);
  };

  TextSphere.prototype._renderFrame = function (timestamp) {
    this._frameScheduled = false;
    if (this._disposed || !this._isVisible || !this._canvasWidth || !this._canvasHeight) {
      return;
    }

    var reduced = this._reducedMotion.matches;

    if (this._previousTimestamp !== null && !reduced) {
      this._rotationElapsed += timestamp - this._previousTimestamp;
    }
    this._previousTimestamp = timestamp;

    var context = this.context;
    this._ensureGeometry();

    var safeDuration = (60 / Math.max(this.speed, 0.1)) * 1000;
    var sideMultiplier = this.rotationSide === "counterclockwise" ? -1 : 1;
    var angle = reduced
      ? 0
      : (this._rotationElapsed / safeDuration) * FULL_ROTATION * sideMultiplier;

    var cosSpin = Math.cos(angle);
    var sinSpin = Math.sin(angle);
    var assembly = clamp(this.assembly, 0, 1);

    var projected = this._geometry.map(function (glyph) {
      var ringRadius = Math.sin(glyph.polarAngle);
      var modelX = ringRadius * Math.cos(glyph.longitude);
      var modelY = Math.cos(glyph.polarAngle);
      var modelZ = ringRadius * Math.sin(glyph.longitude);

      var spunX = modelX * cosSpin + modelZ * sinSpin;
      var spunZ = -modelX * sinSpin + modelZ * cosSpin;

      // Сборка: глиф приходит из центра к своему месту на сфере.
      // Каждый — со своей задержкой, потому волна, а не вспышка.
      var local = clamp((assembly - glyph.assemblyOrder * 0.45) / 0.55, 0, 1);
      var eased = local * local * (3 - 2 * local); // smoothstep
      var radiusFactor = eased;

      var perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - spunZ * radiusFactor);

      return {
        character: glyph.character,
        depth: (spunZ + 1) / 2,
        opacityVariation: glyph.opacityVariation * eased,
        scale: perspective,
        x: VIEWBOX_SIZE / 2 + spunX * SPHERE_RADIUS * perspective * radiusFactor,
        y: VIEWBOX_SIZE / 2 - modelY * SPHERE_RADIUS * perspective * radiusFactor,
      };
    });

    projected.sort(function (a, b) {
      return a.depth - b.depth;
    });

    var logicalScale = Math.min(this._canvasWidth, this._canvasHeight) / VIEWBOX_SIZE;
    var horizontalOffset = (this._canvasWidth - VIEWBOX_SIZE * logicalScale) / 2;
    var verticalOffset = (this._canvasHeight - VIEWBOX_SIZE * logicalScale) / 2;

    context.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
    context.textAlign = "center";
    context.textBaseline = "middle";

    var fontFamily = this.fontFamily;
    var fontWeight = this.fontWeight;
    var baseFontSize = this.fontSize;
    var color = this.color;
    var accentColor = this.accentColor;
    var activeFont = "";
    var activeFill = "";

    projected.forEach(function (glyph) {
      var rawGlyphSize = baseFontSize * glyph.scale * logicalScale;
      var fontSize = Math.max(1, Math.round(rawGlyphSize * 2) / 2);
      var opacity = clamp(
        (0.12 + Math.pow(glyph.depth, 1.35) * 0.88) * glyph.opacityVariation,
        0.04,
        1
      );

      context.globalAlpha = opacity;

      // Ближняя к зрителю четверть светится акцентом — сфера
      // читается объёмной, а не плоским облаком.
      var fill = accentColor && glyph.depth > 0.86 ? accentColor : color;
      if (fill !== activeFill) {
        activeFill = fill;
        context.fillStyle = fill;
      }

      var nextFont = fontWeight + " " + fontSize.toFixed(1) + "px " + fontFamily;
      if (nextFont !== activeFont) {
        activeFont = nextFont;
        context.font = nextFont;
      }

      context.fillText(
        glyph.character,
        horizontalOffset + glyph.x * logicalScale,
        verticalOffset + glyph.y * logicalScale
      );
    });

    context.globalAlpha = 1;

    if (reduced || this._disposed || !this._isVisible) return;
    this._frameScheduled = true;
    this._rafId = global.requestAnimationFrame(this._renderFrame);
  };

  TextSphere.prototype._scheduleFrame = function () {
    if (this._disposed || this._frameScheduled || !this._isVisible) return;
    this._frameScheduled = true;
    this._rafId = global.requestAnimationFrame(this._renderFrame);
  };

  TextSphere.prototype._syncCanvasSize = function () {
    var canvas = this.canvas;
    var bounds = canvas.getBoundingClientRect();
    var pixelRatio = Math.max(global.devicePixelRatio || 1, 1);

    this._canvasWidth = bounds.width || canvas.clientWidth || 300;
    this._canvasHeight = bounds.height || canvas.clientHeight || 300;

    var pixelWidth = Math.round(this._canvasWidth * pixelRatio);
    var pixelHeight = Math.round(this._canvasHeight * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this._scheduleFrame();
  };

  TextSphere.prototype._onReducedMotionChange = function () {
    this._previousTimestamp = null;
    this._scheduleFrame();
  };

  /* --- Публичное API --- */

  TextSphere.prototype.setAssembly = function (value) {
    this.assembly = clamp(value, 0, 1);
    this._scheduleFrame();
  };

  TextSphere.prototype.setWord = function (word) {
    this.word = word;
    this._signature = "";
    this._scheduleFrame();
  };

  TextSphere.prototype.setColor = function (color, accentColor) {
    this.color = color;
    if (accentColor !== undefined) this.accentColor = accentColor;
    this._scheduleFrame();
  };

  TextSphere.prototype.destroy = function () {
    this._disposed = true;
    this._resizeObserver.disconnect();
    this._intersectionObserver.disconnect();
    this._reducedMotion.removeEventListener("change", this._onReducedMotionChange);
    if (this._rafId !== null) global.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  };

  global.TextSphere = TextSphere;
})(window);
