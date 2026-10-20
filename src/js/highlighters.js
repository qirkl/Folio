(() => {
  var __defProp = Object.defineProperty;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // node_modules/@highlighters/core/dist/index.js
  var exports_dist = {};
  __export(exports_dist, {
    DEFAULT_OPTIONS: () => DEFAULT_OPTIONS,
    PALETTES: () => PALETTES,
    buildClipPath: () => buildClipPath,
    buildEdge: () => buildEdge,
    buildMarkGeometry: () => buildMarkGeometry,
    buildNoiseTile: () => buildNoiseTile,
    buildNoiseTileDataUrl: () => buildNoiseTileDataUrl,
    buildPoolGradient: () => buildPoolGradient,
    collectPageRanges: () => collectPageRanges,
    computeAnchor: () => computeAnchor,
    createCssRenderer: () => createCssRenderer,
    createHighlightApiRenderer: () => createHighlightApiRenderer,
    createMutationWatcher: () => createMutationWatcher,
    createReflowObserver: () => createReflowObserver,
    createSvgRenderer: () => createSvgRenderer,
    defaultSwatch: () => defaultSwatch,
    detectEnvironment: () => detectEnvironment,
    findSelectionAnchor: () => findSelectionAnchor,
    findTextRanges: () => findTextRanges,
    getPalette: () => getPalette,
    group: () => group,
    hashJitter: () => hashJitter,
    hashU32: () => hashU32,
    highlight: () => highlight,
    highlightAll: () => highlightAll,
    highlightSelection: () => highlightSelection,
    mergeOptions: () => mergeOptions,
    mulberry: () => mulberry,
    rangesToLineRects: () => rangesToLineRects,
    resolveOptions: () => resolveOptions,
    resolveSwatch: () => resolveSwatch,
    selectTier: () => selectTier,
    snapRangeToBounds: () => snapRangeToBounds,
    toRanges: () => toRanges
  });

  // node_modules/@highlighters/core/dist/chunk-GELW3SYU.js
  var PALETTES = {
    fluorescent: {
      name: "fluorescent",
      swatches: {
        yellow: "#fff14d",
        green: "#9bff5a",
        orange: "#ffb24d",
        pink: "#ff6fae",
        blue: "#5ad7ff",
        purple: "#c08bff"
      }
    },
    mild: {
      name: "mild",
      swatches: {
        yellow: "#f5e6a8",
        green: "#bfe0b2",
        blue: "#aacfe0",
        pink: "#eec2cf",
        orange: "#f0cdb0",
        purple: "#cdc1e0"
      }
    },
    vintage: {
      name: "vintage",
      swatches: {
        mustard: "#e3c567",
        olive: "#bcc06a",
        rust: "#d99873",
        rose: "#d39ba0",
        teal: "#7fb3a8",
        plum: "#a98bb0"
      }
    },
    neutral: {
      name: "neutral",
      swatches: {
        sand: "#e7dcc4",
        stone: "#d8d2c4",
        clay: "#dcc3b0",
        sage: "#cdd6c2",
        slate: "#c4ccd2",
        taupe: "#d3c8c2"
      }
    },
    calm: {
      name: "calm",
      swatches: {
        sky: "#bcd6ec",
        mint: "#bfe4d6",
        lavender: "#cfcae8",
        blush: "#ecd2da",
        seafoam: "#c6e3df",
        periwinkle: "#c2cce8"
      }
    }
  };
  var DEFAULT_SWATCH_NAMES = {
    fluorescent: "yellow",
    mild: "yellow",
    vintage: "mustard",
    neutral: "sand",
    calm: "sky"
  };
  function getPalette(name) {
    const palette = PALETTES[name];
    if (!palette) {
      throw new Error(`@highlighters: unknown palette "${name}"`);
    }
    return palette;
  }
  function resolveSwatch(ref) {
    const palette = getPalette(ref.palette);
    const color = palette.swatches[ref.swatch];
    if (color === undefined) {
      throw new Error(`@highlighters: unknown swatch "${ref.swatch}" in palette "${ref.palette}"`);
    }
    return color;
  }
  function defaultSwatch(name) {
    return resolveSwatch({ palette: name, swatch: DEFAULT_SWATCH_NAMES[name] });
  }
  var DEFAULT_OPTIONS = Object.freeze({
    markType: "highlight",
    color: defaultSwatch("mild"),
    gradient: null,
    opacity: 0.55,
    blendMode: "multiply",
    vivid: false,
    tip: Object.freeze({
      type: "chisel",
      width: 16,
      thickness: 4,
      angle: 35,
      overshoot: 2,
      overshootJitter: 1,
      angleJitter: 0
    }),
    ink: Object.freeze({
      flow: 0.45,
      viscosity: 0.5,
      feathering: 0.2,
      streakiness: 0.25,
      dryout: 0.1,
      startEndBuildup: 0.1,
      flowFade: 0.5
    }),
    speed: Object.freeze({
      enabled: false,
      sensitivity: 1,
      slowSpeed: 2.5,
      fastSpeed: 10.5,
      minDeposit: 0.4,
      smoothing: 1,
      resolution: 24,
      dryoutBoost: 1,
      streakBoost: 0.08,
      featherReduce: 1,
      poolBoost: 1
    }),
    edge: Object.freeze({
      waviness: 1,
      frequency: 22,
      roughness: 0.2,
      cap: "round",
      radius: 5
    }),
    paper: Object.freeze({
      absorbency: 0.3
    }),
    glow: Object.freeze({
      enabled: false,
      intensity: 0.5,
      spread: 4,
      color: ""
    }),
    snap: "word",
    fadeOnClear: true,
    renderer: "auto",
    animation: Object.freeze({
      draw: true,
      duration: 420,
      easing: "ease-out",
      direction: "left-to-right",
      stagger: 90,
      trigger: "immediate",
      threshold: 0.2,
      rootMargin: "0px",
      repeat: false
    }),
    semantic: false,
    contrastBackground: null,
    seed: null
  });
  function clamp(value, lo, hi) {
    return value < lo ? lo : value > hi ? hi : value;
  }
  function isPaletteSwatch(color) {
    return "palette" in Object(color) && "swatch" in Object(color);
  }
  function finiteOr(value, fallback) {
    return value !== undefined && Number.isFinite(value) ? value : fallback;
  }
  function positiveOr(value, fallback) {
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
  }
  var GROUP_KEYS = ["tip", "ink", "speed", "edge", "paper", "glow", "animation"];
  function mergeGroup(base, override) {
    if (base === undefined)
      return override;
    if (override === undefined)
      return base;
    return { ...base, ...override };
  }
  function mergeOptions(base, override) {
    const result = { ...base, ...override };
    for (const key of GROUP_KEYS) {
      const merged = mergeGroup(base[key], override[key]);
      if (merged === undefined) {
        delete result[key];
      } else {
        result[key] = merged;
      }
    }
    const markType = override.markType ?? base.markType;
    if (markType !== undefined)
      result.markType = markType;
    return result;
  }
  function resolveColor(color, palette, fallback) {
    if (color != null && isPaletteSwatch(color)) {
      return resolveSwatch(color);
    }
    if (color != null && color.trim() !== "") {
      return color;
    }
    if (palette) {
      return defaultSwatch(palette);
    }
    return fallback;
  }
  function resolveOptions(input = {}) {
    const d = DEFAULT_OPTIONS;
    const merged = mergeOptions({}, input);
    const tip = {
      type: merged.tip?.type ?? d.tip.type,
      width: finiteOr(merged.tip?.width, d.tip.width),
      thickness: finiteOr(merged.tip?.thickness, d.tip.thickness),
      angle: finiteOr(merged.tip?.angle, d.tip.angle),
      overshoot: finiteOr(merged.tip?.overshoot, d.tip.overshoot),
      overshootJitter: finiteOr(merged.tip?.overshootJitter, d.tip.overshootJitter),
      angleJitter: finiteOr(merged.tip?.angleJitter, d.tip.angleJitter)
    };
    const ink = {
      flow: finiteOr(merged.ink?.flow, d.ink.flow),
      viscosity: finiteOr(merged.ink?.viscosity, d.ink.viscosity),
      feathering: finiteOr(merged.ink?.feathering, d.ink.feathering),
      streakiness: finiteOr(merged.ink?.streakiness, d.ink.streakiness),
      dryout: finiteOr(merged.ink?.dryout, d.ink.dryout),
      startEndBuildup: finiteOr(merged.ink?.startEndBuildup, d.ink.startEndBuildup),
      flowFade: finiteOr(merged.ink?.flowFade, d.ink.flowFade)
    };
    const sd = d.speed;
    const rawSlow = Math.max(0, finiteOr(merged.speed?.slowSpeed, sd.slowSpeed));
    const rawFast = Math.max(0, finiteOr(merged.speed?.fastSpeed, sd.fastSpeed));
    const speed = {
      enabled: merged.speed?.enabled ?? sd.enabled,
      sensitivity: clamp(finiteOr(merged.speed?.sensitivity, sd.sensitivity), 0, 1),
      slowSpeed: Math.min(rawSlow, rawFast),
      fastSpeed: Math.max(rawSlow, rawFast),
      minDeposit: clamp(finiteOr(merged.speed?.minDeposit, sd.minDeposit), 0, 1),
      smoothing: clamp(finiteOr(merged.speed?.smoothing, sd.smoothing), 0, 1),
      resolution: Math.max(4, Math.min(24, Math.round(finiteOr(merged.speed?.resolution, sd.resolution)))),
      dryoutBoost: clamp(finiteOr(merged.speed?.dryoutBoost, sd.dryoutBoost), 0, 1),
      streakBoost: clamp(finiteOr(merged.speed?.streakBoost, sd.streakBoost), 0, 1),
      featherReduce: clamp(finiteOr(merged.speed?.featherReduce, sd.featherReduce), 0, 1),
      poolBoost: clamp(finiteOr(merged.speed?.poolBoost, sd.poolBoost), 0, 1)
    };
    const edge = {
      waviness: finiteOr(merged.edge?.waviness, d.edge.waviness),
      frequency: finiteOr(merged.edge?.frequency, d.edge.frequency),
      roughness: finiteOr(merged.edge?.roughness, d.edge.roughness),
      cap: merged.edge?.cap ?? d.edge.cap,
      radius: finiteOr(merged.edge?.radius, d.edge.radius)
    };
    const paper = {
      absorbency: finiteOr(merged.paper?.absorbency, d.paper.absorbency)
    };
    const color = input.color === undefined && input.palette !== undefined ? defaultSwatch(input.palette) : resolveColor(merged.color, merged.palette, d.color);
    const glow = {
      enabled: merged.glow?.enabled ?? d.glow.enabled,
      intensity: finiteOr(merged.glow?.intensity, d.glow.intensity),
      spread: finiteOr(merged.glow?.spread, d.glow.spread),
      color: merged.glow?.color ?? (d.glow.color || color)
    };
    const animation = {
      draw: merged.animation?.draw ?? d.animation.draw,
      duration: positiveOr(merged.animation?.duration, d.animation.duration),
      easing: merged.animation?.easing ?? d.animation.easing,
      direction: merged.animation?.direction ?? d.animation.direction,
      stagger: finiteOr(merged.animation?.stagger, d.animation.stagger),
      trigger: merged.animation?.trigger ?? d.animation.trigger,
      threshold: finiteOr(merged.animation?.threshold, d.animation.threshold),
      rootMargin: merged.animation?.rootMargin ?? d.animation.rootMargin,
      repeat: merged.animation?.repeat ?? d.animation.repeat
    };
    const blendMode = merged.blendMode ?? d.blendMode;
    return {
      markType: merged.markType ?? d.markType,
      color,
      gradient: merged.gradient ?? d.gradient,
      opacity: Math.max(0, Math.min(1, finiteOr(merged.opacity, d.opacity))),
      blendMode,
      vivid: merged.vivid ?? d.vivid,
      tip,
      ink,
      speed,
      edge,
      paper,
      glow,
      snap: merged.snap ?? d.snap,
      fadeOnClear: merged.fadeOnClear ?? d.fadeOnClear,
      renderer: merged.renderer ?? d.renderer,
      animation,
      semantic: merged.semantic ?? d.semantic,
      contrastBackground: merged.contrastBackground ?? d.contrastBackground,
      seed: merged.seed ?? d.seed
    };
  }
  var EMPTY_CLIP = 'path("M 0 0 Z")';
  function fx(value) {
    return value.toFixed(1);
  }
  function fy(value) {
    return value.toFixed(2);
  }
  function chiselSlant(tip, width, height) {
    if (tip.type !== "chisel")
      return 0;
    const norm = Math.min(Math.abs(tip.angle), 90) / 90;
    return Math.min(norm * height * 0.9, width * 0.5);
  }
  function resolveSlantAndRadius(tip, cap, width, height, radius) {
    const slant = chiselSlant(tip, width, height);
    const usableWidth = Math.max(0, width - slant);
    const maxByWidth = usableWidth / 2;
    const maxByHeight = height / 2;
    const radiusCeil = Math.max(0, Math.min(maxByWidth, maxByHeight));
    let r;
    if (cap === "flat" || cap === "square") {
      r = 0;
    } else if (tip.type === "bullet") {
      r = radiusCeil;
    } else if (tip.type === "fine") {
      r = Math.min(radius, radiusCeil, height * 0.25);
    } else {
      r = Math.min(Math.max(0, radius), radiusCeil);
    }
    return { slant, r };
  }
  function minVisibleFront(tip, cap, width, height, radius) {
    const { slant, r } = resolveSlantAndRadius(tip, cap, width, height, radius);
    return slant + 2 * r;
  }
  function smoothEdge(vertices, reverse, minX, maxX, ex, ey) {
    const step = reverse ? -1 : 1;
    const end = reverse ? -1 : vertices.length;
    let i = reverse ? vertices.length - 1 : 0;
    while (i !== end && (vertices[i].x <= minX || vertices[i].x >= maxX))
      i += step;
    if (i === end)
      return `L ${fx(ex)} ${fy(ey)} `;
    let out = "";
    for (;; ) {
      const v = vertices[i];
      let j = i + step;
      while (j !== end && (vertices[j].x <= minX || vertices[j].x >= maxX))
        j += step;
      if (j === end)
        return out + `Q ${fx(v.x)} ${fy(v.y)} ${fx(ex)} ${fy(ey)} `;
      const u = vertices[j];
      out += `Q ${fx(v.x)} ${fy(v.y)} ${fx((v.x + u.x) / 2)} ${fy((v.y + u.y) / 2)} `;
      i = j;
    }
  }
  function buildClipPath(opts) {
    const { box, tip, topEdge, bottomEdge, cap, radius } = opts;
    const ow = box.width;
    const oh = box.height;
    const { slant: sl, r: R } = resolveSlantAndRadius(tip, cap, ow, oh, radius);
    const reqFront = opts.front ?? ow;
    if (reqFront <= 0)
      return EMPTY_CLIP;
    const minFront = sl + 2 * R;
    const F = Math.max(minFront, Math.min(reqFront, ow));
    const topStartX = sl + R;
    const topEndX = F - R;
    const bottomStartX = F - sl - R;
    const bottomEndX = R;
    return `path("M ${fx(topStartX)} 0 ` + smoothEdge(topEdge, false, topStartX, topEndX, topEndX, 0) + `Q ${fx(F)} 0 ${fx(F)} ${fy(R)} L ${fx(F - sl)} ${fy(oh - R)} Q ${fx(F - sl)} ${fy(oh)} ${fx(bottomStartX)} ${fy(oh)} ` + smoothEdge(bottomEdge, true, bottomEndX, bottomStartX, bottomEndX, oh) + `Q 0 ${fy(oh)} 0 ${fy(oh - R)} L ${fx(sl)} ${fy(R)} Q ${fx(sl)} 0 ${fx(topStartX)} 0 Z")`;
  }
  function hashJitter(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return (x - Math.floor(x)) * 2 - 1;
  }
  function hashU32(seed) {
    let z = (seed | 0) + 1831565813;
    z = Math.imul(z ^ z >>> 15, z | 1);
    z ^= z + Math.imul(z ^ z >>> 7, z | 61);
    return (z ^ z >>> 14) >>> 0;
  }
  function mulberry(seed) {
    let a = seed | 0;
    return function next() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, a | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var BASE_WAVE_OFFSET = 17;
  var ROUGHNESS_OFFSET = 911;
  function buildEdge(opts) {
    const { startX, endX, baseY, segmentLength, amplitude, roughness, seed } = opts;
    if (!(segmentLength > 0))
      return [];
    const lo = Math.min(startX, endX);
    const hi = Math.max(startX, endX);
    const firstIdx = Math.ceil((lo + 0.5) / segmentLength);
    const lastIdx = Math.floor((hi - 0.5) / segmentLength);
    const vertices = [];
    const roughAmp = amplitude * 0.3 * roughness;
    for (let i = firstIdx;i <= lastIdx; i++) {
      const x = i * segmentLength;
      let y = baseY + hashJitter(seed + i * BASE_WAVE_OFFSET) * amplitude;
      if (roughAmp !== 0) {
        y += hashJitter(seed + i * BASE_WAVE_OFFSET + ROUGHNESS_OFFSET) * roughAmp;
      }
      vertices.push({ x, y, gridIndex: i });
    }
    return vertices;
  }
  var DEFAULT_TILE_WIDTH = 256;
  var DEFAULT_TILE_HEIGHT = 64;
  var STRIATION_FREQUENCY = "0.04 0.34";
  var PATCH_FREQUENCY = "0.012";
  var STRIATION_ALPHA_MIN = 0.82;
  var STRIATION_ALPHA_SLOPE = 0.16;
  var PATCH_ALPHA_MIN = 0.86;
  var PATCH_ALPHA_SLOPE = 0.14;
  var STRIATION_OCTAVES = 1;
  var PATCH_OCTAVES = 2;
  function fmt(value) {
    return String(Math.round(value * 1000) / 1000);
  }
  function quantizeKnob(value) {
    return Math.round(clamp(value, 0, 1) * 50) / 50;
  }
  var B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function toBase64Ascii(input) {
    if ("btoa" in globalThis)
      return btoa(input);
    let out = "";
    const len = input.length;
    for (let i = 0;i < len; i += 3) {
      const b0 = input.charCodeAt(i) & 255;
      const b1 = i + 1 < len ? input.charCodeAt(i + 1) & 255 : 0;
      const b2 = i + 2 < len ? input.charCodeAt(i + 2) & 255 : 0;
      const triple = b0 << 16 | b1 << 8 | b2;
      out += B64_ALPHABET[triple >> 18 & 63];
      out += B64_ALPHABET[triple >> 12 & 63];
      out += i + 1 < len ? B64_ALPHABET[triple >> 6 & 63] : "=";
      out += i + 2 < len ? B64_ALPHABET[triple & 63] : "=";
    }
    return out;
  }
  function buildNoiseTileSvg(opts) {
    const { width, height, seed, streakiness, feathering, dryout } = opts;
    const striationSeed = hashU32(seed * 2 + 3) % 256;
    const patchSeed = hashU32(seed * 2 + 7) % 256;
    const striationSlope = STRIATION_ALPHA_SLOPE * (0.5 + 6 * streakiness);
    const striationMin = STRIATION_ALPHA_MIN - 0.6 * streakiness;
    const patchSlope = PATCH_ALPHA_SLOPE * (0.5 + feathering) + 0.6 * dryout;
    const patchMin = PATCH_ALPHA_MIN - 0.62 * dryout;
    const dryoutCut = dryoutTransfer(dryout);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${STRIATION_FREQUENCY}" numOctaves="${STRIATION_OCTAVES}" stitchTiles="stitch" seed="${striationSeed}" result="s"/><feColorMatrix in="s" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${fmt(striationSlope)} ${fmt(striationMin)}" result="sa"/><feTurbulence type="fractalNoise" baseFrequency="${PATCH_FREQUENCY}" numOctaves="${PATCH_OCTAVES}" stitchTiles="stitch" seed="${patchSeed}" result="p"/><feColorMatrix in="p" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${fmt(patchSlope)} ${fmt(patchMin)}" result="pa"/><feComposite in="sa" in2="pa" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="ink"/><feComponentTransfer in="ink"><feFuncA type="discrete" tableValues="${dryoutCut}"/></feComponentTransfer></filter></defs><rect width="${width}" height="${height}" fill="black" filter="url(#g)"/></svg>`;
  }
  function dryoutTransfer(dryout) {
    if (dryout <= 0)
      return "1";
    const segments = 16;
    const cut = Math.round(dryout * 0.45 * segments);
    const values = [];
    for (let i = 0;i < segments; i++)
      values.push(i < cut ? "0" : "1");
    return values.join(" ");
  }
  var tileCache = /* @__PURE__ */ new Map;
  function buildNoiseTileDataUrl(opts) {
    const resolved = {
      width: opts.width ?? DEFAULT_TILE_WIDTH,
      height: opts.height ?? DEFAULT_TILE_HEIGHT,
      seed: opts.seed,
      streakiness: quantizeKnob(opts.streakiness),
      feathering: quantizeKnob(opts.feathering),
      dryout: quantizeKnob(opts.dryout ?? 0)
    };
    const key = `${resolved.width}x${resolved.height}|${resolved.seed}|${resolved.streakiness}|${resolved.feathering}|${resolved.dryout}`;
    const hit = tileCache.get(key);
    if (hit !== undefined) {
      tileCache.delete(key);
      tileCache.set(key, hit);
      return hit;
    }
    const url = `data:image/svg+xml;base64,${toBase64Ascii(buildNoiseTileSvg(resolved))}`;
    if (tileCache.size > 512) {
      const half = Math.floor(tileCache.size / 2);
      const iter = tileCache.keys();
      for (let i = 0;i < half; i++)
        tileCache.delete(iter.next().value);
    }
    tileCache.set(key, url);
    return url;
  }
  function buildNoiseTile(opts) {
    const width = opts.width ?? DEFAULT_TILE_WIDTH;
    const height = opts.height ?? DEFAULT_TILE_HEIGHT;
    return {
      dataUrl: buildNoiseTileDataUrl({ ...opts, width, height }),
      width,
      height
    };
  }
  var DEFAULT_ANGLE = 85;
  var START_INSET_PX = 2;
  var CORE_PX = 10;
  var START_CORE_PCT = 40;
  var END_CORE_PCT = 60;
  var END_INSET_PX = 2;
  function roundAlpha(value) {
    return Math.round(clamp(value, 0, 1) * 1000) / 1000;
  }
  function buildPoolGradient(opts) {
    const buildup = clamp(opts.startEndBuildup, -1, 1);
    const base = clamp(opts.opacity, 0, 1);
    const fade = clamp(opts.flowFade ?? 0, 0, 1);
    const endBase = base * (1 + 0.7 * buildup);
    const coreBase = base;
    const dryAt = (offset) => 1 - fade * (opts.flowReversed ? 1 - offset : offset);
    const color = opts.color;
    const meta = {
      angle: opts.angle ?? DEFAULT_ANGLE,
      startInsetPx: START_INSET_PX,
      startCorePx: CORE_PX,
      startCorePct: START_CORE_PCT,
      endCorePx: CORE_PX,
      endCorePct: END_CORE_PCT,
      endInsetPx: END_INSET_PX
    };
    if (opts.coreStopCount == null && opts.depositAt == null && opts.decelBuildup == null) {
      return {
        ...meta,
        stops: [
          { offset: 0, color, opacity: roundAlpha(endBase * dryAt(0)) },
          { offset: 0.4, color, opacity: roundAlpha(coreBase * dryAt(0.4)) },
          { offset: 0.6, color, opacity: roundAlpha(coreBase * dryAt(0.6)) },
          { offset: 1, color, opacity: roundAlpha(endBase * dryAt(1)) }
        ]
      };
    }
    const n = Math.max(2, Math.round(opts.coreStopCount ?? 12));
    const deposit = opts.depositAt ?? (() => 1);
    const endBuildup = clamp(buildup + (opts.decelBuildup ?? 0), -1, 1);
    const endAlphaBase = base * (1 + 0.7 * endBuildup);
    const len = Math.max(1, opts.lengthPx);
    const startCorePos = Math.min(CORE_PX, START_CORE_PCT / 100 * len);
    const endCorePos = Math.max(len - CORE_PX, END_CORE_PCT / 100 * len);
    const span = Math.max(0, endCorePos - startCorePos);
    const stops = [];
    const coreStopsPositionsPx = [];
    const leadBaked = endAlphaBase * dryAt(0) * deposit(0);
    const trailBaked = endAlphaBase * dryAt(1) * deposit(1);
    let maxBaked = Math.max(leadBaked, trailBaked);
    let maxBare = Math.max(endBase * dryAt(0), endBase * dryAt(1));
    stops.push({ offset: 0, color, opacity: roundAlpha(leadBaked) });
    for (let i = 0;i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const baked = coreBase * dryAt(f) * deposit(f);
      const bare = coreBase * dryAt(f);
      if (baked > maxBaked)
        maxBaked = baked;
      if (bare > maxBare)
        maxBare = bare;
      stops.push({ offset: f, color, opacity: roundAlpha(baked) });
      coreStopsPositionsPx.push(startCorePos + f * span);
    }
    stops.push({ offset: 1, color, opacity: roundAlpha(trailBaked) });
    const layerScale = maxBare > 0 ? clamp(maxBaked / maxBare, 0, 1) : 1;
    return {
      ...meta,
      stops,
      coreStopCount: n,
      coreStopsPositionsPx,
      layerScale
    };
  }
  var VERT_PAD = 2;
  var SEED_LEFT_OVER = 0;
  var SEED_RIGHT_OVER = 11;
  var SEED_TOP_EDGE = 200;
  var SEED_BOTTOM_EDGE = 300;
  var SEED_ANGLE = 400;
  var MASK_X_MULT = 37;
  var MASK_Y_MULT = 13;
  var NOISE_TILE_W = 1024;
  var NOISE_TILE_H = 64;
  var MASK_OFFSET_X = 96;
  var MASK_OFFSET_Y = 16;
  function mod(n, m) {
    return (n % m + m) % m;
  }
  function resolveBand(markType, lineHeight) {
    const thin = Math.max(2, lineHeight * 0.12);
    switch (markType) {
      case "underline":
        return { offsetY: lineHeight - thin, height: thin };
      case "overline":
        return { offsetY: 0, height: thin };
      case "strike-through":
        return { offsetY: (lineHeight - thin) / 2, height: thin };
      default:
        return { offsetY: 0, height: lineHeight };
    }
  }
  function buildMarkGeometry(lineRect, options, seed, flowReversed = false, speedProfile) {
    const { edge, ink, tip, paper, speed } = options;
    const endOver = (s) => tip.overshoot + hashJitter(s) * tip.overshootJitter;
    const leftExt = endOver(seed + SEED_LEFT_OVER);
    const rightExt = endOver(seed + SEED_RIGHT_OVER);
    const slantTip = tip.angleJitter > 0 ? { ...tip, angle: tip.angle + hashJitter(seed + SEED_ANGLE) * tip.angleJitter } : tip;
    const band = resolveBand(options.markType, lineRect.height);
    const boxX = lineRect.left - leftExt;
    const boxY = lineRect.top - VERT_PAD + band.offsetY;
    const boxWidth = Math.max(1, lineRect.width + leftExt + rightExt);
    const boxHeight = band.height + VERT_PAD * 2;
    const box = { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
    const amplitude = edge.waviness * (1 + paper.absorbency * 0.5);
    const segmentLength = edge.frequency;
    const absStartX = box.x;
    const absEndX = box.x + box.width;
    const topAbs = buildEdge({
      startX: absStartX,
      endX: absEndX,
      baseY: 0,
      segmentLength,
      amplitude,
      roughness: edge.roughness,
      seed: seed + SEED_TOP_EDGE
    });
    const bottomAbs = buildEdge({
      startX: absStartX,
      endX: absEndX,
      baseY: box.height,
      segmentLength,
      amplitude,
      roughness: edge.roughness,
      seed: seed + SEED_BOTTOM_EDGE
    });
    const originX = box.x;
    for (const v of topAbs)
      v.x -= originX;
    for (const v of bottomAbs)
      v.x -= originX;
    const topEdge = topAbs;
    const bottomEdge = bottomAbs;
    const clipAtFront = (front) => buildClipPath({
      box,
      tip: slantTip,
      topEdge,
      bottomEdge,
      cap: edge.cap,
      radius: edge.radius,
      front
    });
    const clipPath = clipAtFront(box.width);
    const sp = speedProfile;
    const m = sp ? sp.meanNorm : 0;
    const sens = speed.sensitivity;
    const baseDryout = ink.dryout + ink.viscosity * 0.2;
    const baseStreak = ink.streakiness;
    const baseFeather = ink.feathering + paper.absorbency * 0.25;
    const noiseTile = buildNoiseTile({
      width: NOISE_TILE_W,
      height: NOISE_TILE_H,
      seed,
      streakiness: sp ? clamp(baseStreak + speed.streakBoost * sens * m * Math.max(0, 1 - baseStreak), 0, 1) : baseStreak,
      feathering: sp ? Math.max(0, baseFeather * (1 - speed.featherReduce * sens * m)) : baseFeather,
      dryout: sp ? clamp(baseDryout + speed.dryoutBoost * sens * m * Math.max(0, 1 - baseDryout), 0, 1) : baseDryout
    });
    const maskOffset = {
      x: -mod(seed * MASK_X_MULT, MASK_OFFSET_X),
      y: -mod(seed * MASK_Y_MULT, MASK_OFFSET_Y)
    };
    const poolInput = {
      lengthPx: box.width,
      startEndBuildup: ink.startEndBuildup,
      color: options.color,
      opacity: options.opacity,
      angle: options.gradient?.angle ?? undefined,
      flowFade: ink.flowFade,
      flowReversed
    };
    if (sp) {
      poolInput.coreStopCount = speed.resolution;
      poolInput.depositAt = sp.depositAt;
      poolInput.decelBuildup = speed.poolBoost * sens * sp.decel;
    }
    const pool = buildPoolGradient(poolInput);
    return {
      box,
      seed,
      clipPath,
      clipAtFront,
      slant: chiselSlant(slantTip, box.width, box.height),
      minFront: Math.min(minVisibleFront(slantTip, edge.cap, box.width, box.height, edge.radius), box.width),
      topEdge,
      bottomEdge,
      noiseTile,
      maskOffset,
      pool
    };
  }

  // node_modules/@highlighters/core/dist/index.js
  var WHITESPACE = /\s/;
  var WORD_CHAR = /[\p{L}\p{N}_-]/u;
  function isText(node) {
    return node != null && node.nodeType === 3;
  }
  function snapRangeToBounds(range, mode) {
    if (mode === "none")
      return range;
    if (!("cloneRange" in range))
      return range;
    const out = range.cloneRange();
    if (isText(out.startContainer)) {
      const text = out.startContainer.data;
      let i = out.startOffset;
      while (i < text.length && WHITESPACE.test(text.charAt(i)))
        i++;
      if (i !== out.startOffset)
        out.setStart(out.startContainer, i);
    }
    if (isText(out.endContainer)) {
      const text = out.endContainer.data;
      let j = out.endOffset;
      while (j > 0 && WHITESPACE.test(text.charAt(j - 1)))
        j--;
      if (j !== out.endOffset)
        out.setEnd(out.endContainer, j);
    }
    if (mode === "word") {
      if (isText(out.startContainer)) {
        const text = out.startContainer.data;
        let i = out.startOffset;
        while (i > 0 && WORD_CHAR.test(text.charAt(i - 1)))
          i--;
        if (i !== out.startOffset)
          out.setStart(out.startContainer, i);
      }
      if (isText(out.endContainer)) {
        const text = out.endContainer.data;
        let j = out.endOffset;
        while (j < text.length && WORD_CHAR.test(text.charAt(j)))
          j++;
        if (j !== out.endOffset)
          out.setEnd(out.endContainer, j);
      }
    }
    if (out.collapsed && !range.collapsed) {
      out.collapse(true);
    }
    return out;
  }
  function hasGlobal(name) {
    return name in globalThis;
  }
  function hasDomWithRange() {
    return hasGlobal("document") && hasGlobal("Range");
  }
  function hasDom() {
    return hasGlobal("document") && hasGlobal("window");
  }
  function hasWindow() {
    return hasGlobal("window");
  }
  function hasMediaQueries() {
    return hasDom() && "matchMedia" in window;
  }
  function isTextNode(node) {
    return node != null && node.nodeType === 3;
  }
  function nextTextNode(walker) {
    const node = walker.nextNode();
    return isTextNode(node) ? node : null;
  }
  var SHOW_TEXT = 4;
  var FILTER_ACCEPT = 1;
  var FILTER_REJECT = 2;
  var NON_RENDERED_TAGS = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "TEMPLATE",
    "NOSCRIPT",
    "HEAD",
    "TITLE"
  ]);
  function isInNonRenderedSubtree(node) {
    let el = node.parentElement;
    while (el) {
      if (NON_RENDERED_TAGS.has(el.tagName))
        return true;
      el = el.parentElement;
    }
    return false;
  }
  function collectText(root) {
    const slots = [];
    let text = "";
    const walker = document.createTreeWalker(root, SHOW_TEXT, {
      acceptNode: (n) => isInNonRenderedSubtree(n) ? FILTER_REJECT : FILTER_ACCEPT
    });
    let node = nextTextNode(walker);
    while (node) {
      const value = node.data;
      for (let i = 0;i < value.length; i++) {
        slots.push({ node, offset: i });
      }
      text += value;
      node = nextTextNode(walker);
    }
    return { text, slots };
  }
  function rangeForSpan(slots, start, end) {
    const range = document.createRange();
    const startSlot = slots[start];
    const endSlot = slots[end - 1];
    range.setStart(startSlot.node, startSlot.offset);
    range.setEnd(endSlot.node, endSlot.offset + 1);
    return range;
  }
  function findTextRanges(root, query) {
    if (!hasDomWithRange() || !root)
      return [];
    const { text, slots } = collectText(root);
    if (text.length === 0)
      return [];
    const ranges = [];
    if (!(query instanceof RegExp)) {
      if (query.length === 0)
        return [];
      let from = 0;
      for (;; ) {
        const index = text.indexOf(query, from);
        if (index === -1)
          break;
        ranges.push(rangeForSpan(slots, index, index + query.length));
        from = index + query.length;
      }
      return ranges;
    }
    const base = query.flags.replace("y", "");
    const flags = base.includes("g") ? base : base + "g";
    const re = new RegExp(query.source, flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      const matched = match[0];
      if (matched.length === 0) {
        re.lastIndex += 1;
        continue;
      }
      ranges.push(rangeForSpan(slots, match.index, match.index + matched.length));
    }
    return ranges;
  }
  var EXCLUDE_ATTR = "data-highlight-exclude";
  function elementOf(node) {
    return node instanceof Element ? node : node.parentElement;
  }
  function isExcluded(node, excludeSelectors) {
    const el = elementOf(node);
    if (!el)
      return false;
    if (el.closest(`[${EXCLUDE_ATTR}]`))
      return true;
    for (const selector of excludeSelectors) {
      if (!selector)
        continue;
      try {
        if (el.closest(selector))
          return true;
      } catch {}
    }
    return false;
  }
  function excludeMarkedSubtrees(ranges) {
    if (!hasDomWithRange())
      return ranges;
    const out = [];
    for (const range of ranges) {
      if (range.collapsed)
        continue;
      const root = elementOf(range.commonAncestorContainer);
      if (root?.closest(`[${EXCLUDE_ATTR}]`))
        continue;
      const all = root ? Array.from(root.querySelectorAll(`[${EXCLUDE_ATTR}]`)) : [];
      const hits = all.filter((el) => range.intersectsNode(el) && !el.parentElement?.closest(`[${EXCLUDE_ATTR}]`));
      if (hits.length === 0) {
        out.push(range);
        continue;
      }
      const cursor = range.cloneRange();
      for (const el of hits) {
        const gap = cursor.cloneRange();
        gap.setEndBefore(el);
        if (!gap.collapsed)
          out.push(gap);
        cursor.setStartAfter(el);
      }
      if (!cursor.collapsed)
        out.push(cursor);
    }
    return out;
  }
  function isIncluded(node, includeSelectors) {
    if (includeSelectors.length === 0)
      return true;
    const el = elementOf(node);
    if (!el)
      return false;
    for (const selector of includeSelectors) {
      if (!selector)
        continue;
      try {
        if (el.closest(selector))
          return true;
      } catch {}
    }
    return false;
  }
  function collectPageRanges(target) {
    if (!hasDomWithRange())
      return [];
    const root = target.root ?? document.body;
    if (!root)
      return [];
    const include = target.include ?? [];
    const exclude = target.exclude ?? [];
    const walker = document.createTreeWalker(root, SHOW_TEXT, {
      acceptNode(node2) {
        if (!isTextNode(node2))
          return FILTER_REJECT;
        const text = node2;
        if (text.data.trim().length === 0)
          return FILTER_REJECT;
        if (isInNonRenderedSubtree(text))
          return FILTER_REJECT;
        if (isExcluded(text, exclude))
          return FILTER_REJECT;
        if (!isIncluded(text, include))
          return FILTER_REJECT;
        return FILTER_ACCEPT;
      }
    });
    const ranges = [];
    let node = nextTextNode(walker);
    while (node) {
      const data = node.data;
      const start = data.length - data.replace(/^\s+/, "").length;
      const end = data.replace(/\s+$/, "").length;
      if (end > start) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        ranges.push(range);
      }
      node = nextTextNode(walker);
    }
    return ranges;
  }
  function isRange(value) {
    return hasGlobal("Range") && value instanceof Range;
  }
  function isSelection(value) {
    return value instanceof Object && "getRangeAt" in value && "rangeCount" in value;
  }
  function isElement(value) {
    return value instanceof Object && "nodeType" in value && value.nodeType === 1 && "querySelectorAll" in value;
  }
  function isTextTarget(value) {
    return value instanceof Object && "text" in value;
  }
  function rangeForElement(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range;
  }
  function toRanges(target) {
    if (!hasDomWithRange() || target == null)
      return [];
    if (isRange(target)) {
      return target.collapsed ? [] : [target];
    }
    if (isSelection(target)) {
      const out2 = [];
      for (let i = 0;i < target.rangeCount; i++) {
        const range = target.getRangeAt(i);
        if (!range.collapsed)
          out2.push(range);
      }
      return out2;
    }
    if (isElement(target)) {
      return [rangeForElement(target)];
    }
    if (isTextTarget(target)) {
      const root = target.root ?? document.body;
      if (!root)
        return [];
      return findTextRanges(root, target.text);
    }
    if (target instanceof Object) {
      return collectPageRanges(target);
    }
    if (target.length === 0)
      return [];
    let elements;
    try {
      elements = document.querySelectorAll(target);
    } catch {
      return [];
    }
    const out = [];
    elements.forEach((el) => out.push(rangeForElement(el)));
    return out;
  }
  function pushRects(list, out) {
    for (let i = 0;i < list.length; i++)
      out.push(list[i]);
  }
  function rectArray(list) {
    const out = [];
    pushRects(list, out);
    return out;
  }
  function isHiddenText(node) {
    if (!hasGlobal("getComputedStyle"))
      return false;
    const parent = node.parentElement;
    if (!parent)
      return false;
    try {
      return getComputedStyle(parent).visibility === "hidden";
    } catch {
      return false;
    }
  }
  function collectRangeRects(range, scope) {
    const common = scope ?? range.commonAncestorContainer;
    if (!scope && common.nodeType === 3) {
      return rectArray(range.getClientRects());
    }
    if (!("createTreeWalker" in document)) {
      return rectArray(range.getClientRects());
    }
    const walker = document.createTreeWalker(common, SHOW_TEXT, {
      acceptNode(node) {
        if (isInNonRenderedSubtree(node))
          return FILTER_REJECT;
        if (isHiddenText(node))
          return FILTER_REJECT;
        const hit = "intersectsNode" in range ? range.intersectsNode(node) : true;
        return hit ? FILTER_ACCEPT : FILTER_REJECT;
      }
    });
    const texts = [];
    for (let n = nextTextNode(walker);n; n = nextTextNode(walker))
      texts.push(n);
    if (texts.length <= 1)
      return rectArray(range.getClientRects());
    const out = [];
    for (const text of texts) {
      const start = text === range.startContainer ? range.startOffset : 0;
      const end = text === range.endContainer ? range.endOffset : text.length;
      if (end <= start)
        continue;
      const sub = document.createRange();
      sub.setStart(text, start);
      sub.setEnd(text, end);
      pushRects(sub.getClientRects(), out);
    }
    return out;
  }
  var BBOX_REJECT_RATIO = 3;
  var MERGE_TOLERANCE = 0.5;
  var MERGE_MAX_GAP_RATIO = 1.5;
  var COLUMN_SLOP = 24;
  var SEED_SCALE = 7;
  function median(values) {
    if (values.length === 0)
      return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  }
  function mergeRectsToBoxes(rects) {
    if (rects.length === 0)
      return [];
    const heights = rects.map((r) => r.height);
    const med = median(heights);
    const tol = med * MERGE_TOLERANCE;
    const maxH = med * BBOX_REJECT_RATIO;
    const maxGap = med * MERGE_MAX_GAP_RATIO;
    const lines = [];
    for (const r of rects) {
      if (med > 0 && r.height > maxH)
        continue;
      const cy = (r.top + r.bottom) / 2;
      let merged = false;
      for (const line of lines) {
        if (Math.abs(cy - (line.top + line.bottom) / 2) >= tol)
          continue;
        const gap = Math.max(r.left - line.right, line.left - r.right);
        if (gap > maxGap)
          continue;
        if (r.top < line.top)
          line.top = r.top;
        if (r.bottom > line.bottom)
          line.bottom = r.bottom;
        if (r.left < line.left)
          line.left = r.left;
        if (r.right > line.right)
          line.right = r.right;
        merged = true;
        break;
      }
      if (!merged) {
        lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      }
    }
    lines.sort((a, b) => a.top - b.top || a.left - b.left);
    return lines;
  }
  function computeAnchor(ranges) {
    let top = Infinity;
    let left = Infinity;
    if (hasDomWithRange()) {
      for (const range of ranges) {
        for (const r of collectRangeRects(range)) {
          if (r.width < 1 || r.height < 1)
            continue;
          if (r.top < top)
            top = r.top;
          if (r.left < left)
            left = r.left;
        }
      }
    }
    if (!Number.isFinite(top))
      top = 0;
    if (!Number.isFinite(left))
      left = 0;
    return { top, left };
  }
  function rangesToLineRects(ranges, anchor, originTop = 0, options) {
    if (!hasDomWithRange() || ranges.length === 0)
      return [];
    const raw = [];
    for (const range of ranges) {
      for (const r of collectRangeRects(range, options?.scope)) {
        if (r.width < 1 || r.height < 1)
          continue;
        raw.push(r);
      }
    }
    if (raw.length === 0)
      return [];
    const bounds = options?.columnBounds;
    let column = raw;
    if (bounds || anchor) {
      let maxRight = -Infinity;
      for (const r of raw)
        if (r.right > maxRight)
          maxRight = r.right;
      const minLeft = (bounds?.left ?? anchor.left) - COLUMN_SLOP;
      const maxRightBound = (bounds?.right ?? maxRight) + COLUMN_SLOP;
      const filtered = [];
      for (const r of raw) {
        if (r.right >= minLeft && r.left <= maxRightBound)
          filtered.push(r);
      }
      if (filtered.length > 0)
        column = filtered;
    }
    const lines = mergeRectsToBoxes(column);
    if (lines.length === 0)
      return [];
    const last = lines.length - 1;
    return lines.map((box, index) => ({
      left: box.left,
      top: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      seed: Math.round((box.top - originTop) * SEED_SCALE),
      isFirst: index === 0,
      isLast: index === last
    }));
  }
  var MAX_SAMPLES = 500;
  var DEDUP_PX = 2;
  var DEDUP_LOOKBACK = 8;
  var DT_FLOOR_MS = 1;
  function caretLocal(node, offset, originLeft, originTop) {
    try {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      let rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      if (!rect || rect.width === 0 && rect.height === 0) {
        const len = isTextNode(node) ? node.length : node.childNodes.length;
        const start = Math.max(0, Math.min(offset, len) - 1);
        const end = Math.min(len, start + 1);
        if (end > start) {
          range.setStart(node, start);
          range.setEnd(node, end);
          rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
        }
      }
      if (!rect || rect.width === 0 && rect.height === 0)
        return null;
      return { x: rect.right - originLeft, y: (rect.top + rect.bottom) / 2 - originTop };
    } catch {
      return null;
    }
  }
  var SelectionVelocityTracker = class {
    constructor() {
      this.samples = [];
      this.prevX = 0;
      this.prevY = 0;
      this.prevT = 0;
      this.hasPrev = false;
      this.ema = 0;
    }
    reset() {
      this.samples = [];
      this.hasPrev = false;
      this.ema = 0;
    }
    hasData() {
      return this.samples.length > 0;
    }
    recordSample(selection, originLeft, originTop, now, smoothing) {
      const { focusNode, focusOffset } = selection;
      if (!focusNode)
        return;
      const pos = caretLocal(focusNode, focusOffset, originLeft, originTop);
      if (!pos)
        return;
      if (!this.hasPrev) {
        this.prevX = pos.x;
        this.prevY = pos.y;
        this.prevT = now;
        this.hasPrev = true;
        return;
      }
      const dt = Math.max(DT_FLOOR_MS, now - this.prevT);
      const dist = Math.hypot(pos.x - this.prevX, pos.y - this.prevY);
      const instant = dist / dt;
      const a = clamp(smoothing, 0, 1);
      this.ema = this.hasData() ? (1 - a) * this.ema + a * instant : instant;
      this.prevX = pos.x;
      this.prevY = pos.y;
      this.prevT = now;
      this.push({ x: pos.x, y: pos.y, v: this.ema });
    }
    push(sample) {
      const from = Math.max(0, this.samples.length - DEDUP_LOOKBACK);
      for (let i = this.samples.length - 1;i >= from; i--) {
        const o = this.samples[i];
        if (Math.abs(o.x - sample.x) <= DEDUP_PX && Math.abs(o.y - sample.y) <= DEDUP_PX) {
          this.samples[i] = sample;
          return;
        }
      }
      this.samples.push(sample);
      if (this.samples.length > MAX_SAMPLES) {
        this.samples = this.samples.slice(this.samples.length - Math.floor(MAX_SAMPLES / 2));
      }
    }
    profileForLine(line, sd) {
      const top = line.top;
      const bottom = line.top + line.height;
      const band = [];
      for (const s of this.samples) {
        if (s.y >= top && s.y < bottom)
          band.push(s);
      }
      if (band.length === 0)
        return;
      const vTemporalStart = band[0].v;
      const vTemporalEnd = band[band.length - 1].v;
      band.sort((p, q) => p.x - q.x);
      const left = line.left;
      const width = Math.max(1, line.width);
      const denom = Math.max(0.001, sd.fastSpeed - sd.slowSpeed);
      const norm = (v) => clamp((v - sd.slowSpeed) / denom, 0, 1);
      const deposit = (v) => 1 - sd.sensitivity * norm(v) * (1 - sd.minDeposit);
      const vAtX = (absX) => {
        const first = band[0];
        const last = band[band.length - 1];
        if (absX <= first.x)
          return first.v;
        if (absX >= last.x)
          return last.v;
        let lo = 0;
        let hi = band.length - 1;
        while (hi - lo > 1) {
          const mid = lo + hi >> 1;
          if (band[mid].x <= absX)
            lo = mid;
          else
            hi = mid;
        }
        const a = band[lo];
        const b = band[hi];
        const t = (absX - a.x) / Math.max(0.000001, b.x - a.x);
        return a.v + t * (b.v - a.v);
      };
      let sum = 0;
      for (const s of band)
        sum += s.v;
      const meanNorm = norm(sum / band.length);
      const decel = clamp((vTemporalStart - vTemporalEnd) / Math.max(0.001, vTemporalStart), 0, 1);
      return {
        depositAt: (f) => deposit(vAtX(left + clamp(f, 0, 1) * width)),
        meanNorm,
        decel
      };
    }
  };
  function findSelectionAnchor(node) {
    if (!hasWindow() || !hasGlobal("getComputedStyle")) {
      return document.body ?? document.documentElement;
    }
    let el = node instanceof Element ? node : node.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const position = getComputedStyle(el).position;
      if (position && position !== "static" && el instanceof HTMLElement)
        return el;
      el = el.parentElement;
    }
    return document.querySelector("article") ?? document.querySelector("main") ?? document.body;
  }
  var MUTATION_DEBOUNCE_MS = 50;
  function nearestPositionedContainer(el) {
    if (!hasWindow() || !hasGlobal("getComputedStyle"))
      return null;
    let current = el.parentElement;
    while (current && current !== document.documentElement) {
      let position;
      try {
        position = getComputedStyle(current).position;
      } catch {
        position = "static";
      }
      if (position && position !== "static")
        return current;
      current = current.parentElement;
    }
    return null;
  }
  function createReflowObserver(targets, callback) {
    if (!hasWindow())
      return () => {};
    let disposed = false;
    let rafId;
    const schedule = () => {
      if (disposed || rafId !== undefined)
        return;
      rafId = requestAnimationFrame(() => {
        rafId = undefined;
        if (!disposed)
          callback();
      });
    };
    let resizeObserver;
    if (hasGlobal("ResizeObserver")) {
      resizeObserver = new ResizeObserver(schedule);
      const observed = /* @__PURE__ */ new Set;
      for (const target of targets) {
        if (!observed.has(target)) {
          observed.add(target);
          resizeObserver.observe(target);
        }
        const container = nearestPositionedContainer(target);
        if (container && !observed.has(container)) {
          observed.add(container);
          resizeObserver.observe(container);
        }
      }
    }
    window.addEventListener("resize", schedule);
    const vv = window.visualViewport;
    if (vv)
      vv.addEventListener("resize", schedule);
    const fonts = document.fonts;
    if (fonts && fonts.ready && "then" in fonts.ready) {
      fonts.ready.then(() => {
        if (!disposed)
          schedule();
      });
    }
    return () => {
      if (disposed)
        return;
      disposed = true;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      if (vv)
        vv.removeEventListener("resize", schedule);
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      }
    };
  }
  function createMutationWatcher(root, callback) {
    if (!hasGlobal("MutationObserver"))
      return () => {};
    let disposed = false;
    let timer;
    let pending = [];
    const flush = () => {
      timer = undefined;
      if (disposed)
        return;
      const records = pending;
      pending = [];
      if (records.length > 0)
        callback(records);
    };
    const observer = new MutationObserver((records) => {
      if (disposed)
        return;
      for (const record of records)
        pending.push(record);
      if (timer !== undefined)
        clearTimeout(timer);
      timer = setTimeout(flush, MUTATION_DEBOUNCE_MS);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return () => {
      if (disposed)
        return;
      disposed = true;
      observer.disconnect();
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      pending = [];
    };
  }
  var OVERLAY_FLAG = "data-highlighters-overlay";
  var appliedStyles = /* @__PURE__ */ new WeakMap;
  function applyOnce(el, key, value, apply) {
    let cache = appliedStyles.get(el);
    if (!cache) {
      cache = {};
      appliedStyles.set(el, cache);
    }
    if (cache[key] === value)
      return;
    cache[key] = value;
    apply();
  }
  function setVendorPrefixed(el, prop, value) {
    applyOnce(el, prop, value, () => {
      el.style.setProperty(prop, value);
      el.style.setProperty(`-webkit-${prop}`, value);
    });
  }
  function setStyleOnce(el, prop, value) {
    applyOnce(el, prop, value, () => {
      el.style.setProperty(prop, value);
    });
  }
  function backdropElement(context) {
    const node = context.ranges[0]?.commonAncestorContainer;
    const el = node instanceof Element ? node : node?.parentElement ?? null;
    return el ?? context.container.parentElement;
  }
  function applyBoxPosition(el, box) {
    setStyleOnce(el, "position", "absolute");
    setStyleOnce(el, "left", `${box.x}px`);
    setStyleOnce(el, "top", `${box.y}px`);
    setStyleOnce(el, "width", `${box.width}px`);
    setStyleOnce(el, "height", `${box.height}px`);
  }
  function createOverlayContainer(host) {
    const existing = host.querySelector(`:scope > [${OVERLAY_FLAG}]`);
    if (existing)
      return existing;
    const doc = host.ownerDocument;
    const container = doc.createElement("div");
    container.setAttribute(OVERLAY_FLAG, "");
    styleOverlayLayer(container, "multiply");
    const view = doc.defaultView;
    if (view) {
      const position = view.getComputedStyle(host).position;
      if (position === "static")
        host.style.position = "relative";
    }
    host.appendChild(container);
    return container;
  }
  function styleOverlayLayer(el, blend) {
    el.setAttribute("aria-hidden", "true");
    const s = el.style;
    s.position = "absolute";
    s.top = "0";
    s.left = "0";
    s.width = "100%";
    s.height = "100%";
    s.pointerEvents = "none";
    s.isolation = "isolate";
    s.mixBlendMode = blend;
    s.overflow = "visible";
    s.userSelect = "none";
  }
  function createBlendLayer(host, blend) {
    const layer = host.ownerDocument.createElement("div");
    styleOverlayLayer(layer, blend);
    host.appendChild(layer);
    return layer;
  }
  function resolveBlendTarget(host, container, current, layerBlend) {
    if (!layerBlend || !host) {
      current?.remove();
      return { target: container, layer: null };
    }
    if (current && current.style.mixBlendMode === layerBlend) {
      return { target: current, layer: current };
    }
    current?.remove();
    const layer = createBlendLayer(host, layerBlend);
    return { target: layer, layer };
  }
  function teardownContainer(container) {
    if (!container.firstChild)
      container.remove();
  }
  var NodePool = class {
    constructor() {
      this.nodes = /* @__PURE__ */ new Map;
    }
    get size() {
      return this.nodes.size;
    }
    get(key) {
      return this.nodes.get(key);
    }
    set(key, node) {
      this.nodes.set(key, node);
    }
    has(key) {
      return this.nodes.has(key);
    }
    retain(keep, dispose) {
      for (const [key, node] of this.nodes) {
        if (!keep.has(key)) {
          dispose(node);
          this.nodes.delete(key);
        }
      }
    }
    clear(dispose) {
      for (const node of this.nodes.values())
        dispose(node);
      this.nodes.clear();
    }
  };
  var DEFAULT_DEGRADE_THRESHOLD = 50;
  var TIER_ORDER = ["svg", "css", "highlight-api"];
  var SSR_ENVIRONMENT = {
    supportsSvgFilters: false,
    supportsCssBlend: false,
    supportsHighlightApi: false,
    prefersReducedMotion: false,
    prefersReducedData: false,
    coarsePointer: false,
    degradeThreshold: DEFAULT_DEGRADE_THRESHOLD
  };
  function cssSupports(declaration, value) {
    if (!hasGlobal("CSS") || !("supports" in CSS)) {
      return false;
    }
    try {
      return CSS.supports(declaration, value);
    } catch {
      return false;
    }
  }
  function mediaMatches(query) {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  }
  function detectSvgFilters() {
    const clip = cssSupports("clip-path", "path('M0 0')") || cssSupports("clip-path", "inset(0)") || cssSupports("-webkit-clip-path", "inset(0)");
    const mask = cssSupports("mask-image", "none") || cssSupports("-webkit-mask-image", "none");
    return clip && mask && hasGlobal("SVGFETurbulenceElement");
  }
  function detectCssBlend() {
    const blend = cssSupports("mix-blend-mode", "multiply");
    const clone = cssSupports("box-decoration-break", "clone") || cssSupports("-webkit-box-decoration-break", "clone");
    return blend && clone;
  }
  function detectHighlightApi() {
    return hasGlobal("CSS") && "highlights" in CSS && hasGlobal("Highlight");
  }
  function detectEnvironment() {
    if (!hasMediaQueries())
      return SSR_ENVIRONMENT;
    return {
      supportsSvgFilters: detectSvgFilters(),
      supportsCssBlend: detectCssBlend(),
      supportsHighlightApi: detectHighlightApi(),
      prefersReducedMotion: mediaMatches("(prefers-reduced-motion: reduce)"),
      prefersReducedData: mediaMatches("(prefers-reduced-data: reduce)"),
      coarsePointer: mediaMatches("(pointer: coarse)") || mediaMatches("(hover: none)"),
      degradeThreshold: DEFAULT_DEGRADE_THRESHOLD
    };
  }
  function tierSupported(tier, env) {
    switch (tier) {
      case "svg":
        return env.supportsSvgFilters;
      case "css":
        return env.supportsCssBlend;
      case "highlight-api":
        return env.supportsHighlightApi;
    }
  }
  function firstSupportedFrom(start, env) {
    const startIndex = TIER_ORDER.indexOf(start);
    for (let i = startIndex;i < TIER_ORDER.length; i++) {
      const tier = TIER_ORDER[i];
      if (tierSupported(tier, env))
        return tier;
    }
    for (const tier of TIER_ORDER) {
      if (tierSupported(tier, env))
        return tier;
    }
    return "css";
  }
  function selectTier(requested, env, markCount) {
    if (requested !== "auto") {
      return tierSupported(requested, env) ? requested : firstSupportedFrom(requested, env);
    }
    let tier = firstSupportedFrom("svg", env);
    if (tier === "svg") {
      const degrade = env.prefersReducedMotion || env.prefersReducedData || markCount > env.degradeThreshold;
      if (degrade)
        tier = firstSupportedFrom("css", env);
    }
    return tier;
  }
  var NEAR_WHITE_MIN = 217;
  var OFF_WHITE = "#d6d6d6";
  function parseRgba(color) {
    const c = color.trim();
    if (c[0] === "#") {
      const h = c.slice(1);
      const short = h.length === 3 || h.length === 4;
      if (!short && h.length !== 6 && h.length !== 8)
        return null;
      const step = short ? 1 : 2;
      const at = (i) => parseInt(short ? h[i].repeat(2) : h.slice(i, i + 2), 16);
      const hasAlpha = h.length === 4 || h.length === 8;
      const out = [at(0), at(step), at(2 * step), hasAlpha ? at(3 * step) / 255 : 1];
      return out.some(Number.isNaN) ? null : out;
    }
    const m = /^rgba?\(([^)]+)\)/i.exec(c);
    if (!m)
      return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return p.length >= 3 && p.slice(0, 3).every(Number.isFinite) ? [p[0], p[1], p[2], p[3] ?? 1] : null;
  }
  function colorMinChannel(color) {
    const c = parseRgba(color);
    return c ? Math.min(c[0], c[1], c[2]) : null;
  }
  var probe;
  function minChannel(color, doc) {
    const direct = colorMinChannel(color);
    if (direct !== null)
      return direct;
    try {
      if (probe === undefined)
        probe = doc.createElement("canvas").getContext("2d");
      if (probe) {
        probe.fillStyle = "#000";
        probe.fillStyle = color;
        return colorMinChannel(String(probe.fillStyle));
      }
    } catch {
      probe = undefined;
    }
    return null;
  }
  function backdropIsLight(el, doc) {
    const view = doc.defaultView;
    if (!view)
      return true;
    for (let node = el;node; node = node.parentElement) {
      const c = parseRgba(view.getComputedStyle(node).backgroundColor);
      if (c && c[3] > 0.5)
        return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 >= 0.5;
    }
    return true;
  }
  function effectiveInk(blendMode, color, backdrop, doc, vivid = false) {
    if (vivid)
      return { layer: vivid === "screen" ? "screen" : "normal", color };
    if (blendMode !== "multiply")
      return { layer: null, color };
    const min = minChannel(color, doc);
    if (min === null || min < NEAR_WHITE_MIN)
      return { layer: null, color };
    return backdropIsLight(backdrop, doc) ? { layer: null, color: OFF_WHITE } : { layer: "normal", color };
  }
  function poolGradientToCss(pool, colorOverride) {
    const stops = pool.stops;
    let maxAlpha = 0;
    for (const s of stops)
      maxAlpha = Math.max(maxAlpha, s.opacity ?? 1);
    const fill = (i) => {
      const stop = stops[i] ?? stops[0];
      const rel = maxAlpha > 0 ? (stop?.opacity ?? 1) / maxAlpha : 1;
      const color = colorOverride ?? stop?.color ?? "transparent";
      return `color-mix(in srgb, ${color} ${Math.round(rel * 100)}%, transparent)`;
    };
    const positions = pool.coreStopsPositionsPx;
    if (positions) {
      const parts = [
        `linear-gradient(${pool.angle}deg`,
        `${fill(0)} ${pool.startInsetPx}px`
      ];
      for (let i = 0;i < positions.length; i++) {
        parts.push(`${fill(i + 1)} ${round2(positions[i])}px`);
      }
      parts.push(`${fill(stops.length - 1)} calc(100% - ${pool.endInsetPx}px))`);
      return parts.join(", ");
    }
    const startCore = `min(${pool.startCorePx}px, ${pool.startCorePct}%)`;
    const endCore = `max(calc(100% - ${pool.endCorePx}px), ${pool.endCorePct}%)`;
    return [
      `linear-gradient(${pool.angle}deg`,
      `${fill(0)} ${pool.startInsetPx}px`,
      `${fill(1)} ${startCore}`,
      `${fill(2)} ${endCore}`,
      `${fill(3)} calc(100% - ${pool.endInsetPx}px))`
    ].join(", ");
  }
  function round2(value) {
    return Math.round(value * 100) / 100;
  }
  function createCssRenderer() {
    const wrapperPool = new NodePool;
    const bandPool = new NodePool;
    let container = null;
    let blendLayer = null;
    function styleBand(el, line, context, inkColor) {
      const { options } = context;
      setStyleOnce(el, "position", "absolute");
      setStyleOnce(el, "left", "0");
      setStyleOnce(el, "top", "0");
      setStyleOnce(el, "width", "100%");
      setStyleOnce(el, "height", "100%");
      setStyleOnce(el, "pointer-events", "none");
      setStyleOnce(el, "mix-blend-mode", options.blendMode);
      setStyleOnce(el, "opacity", String(options.opacity * (line.pool.layerScale ?? 1)));
      setStyleOnce(el, "background-image", poolGradientToCss(line.pool, inkColor));
      setStyleOnce(el, "background-repeat", "no-repeat");
      setStyleOnce(el, "box-decoration-break", "clone");
      setStyleOnce(el, "border-radius", `${options.edge.radius}px`);
    }
    function render(context) {
      container = context.container;
      const doc = container.ownerDocument;
      const plan = effectiveInk(context.options.blendMode, context.options.color, backdropElement(context), doc, context.options.vivid);
      const { target, layer } = resolveBlendTarget(container.parentElement, container, blendLayer, plan.layer);
      blendLayer = layer;
      const inkColor = plan.color === context.options.color ? undefined : plan.color;
      const keep = /* @__PURE__ */ new Set;
      for (const line of context.lines) {
        keep.add(line.seed);
        let wrapper = wrapperPool.get(line.seed);
        if (!wrapper) {
          wrapper = doc.createElement("div");
          wrapper.setAttribute("aria-hidden", "true");
          wrapper.style.pointerEvents = "none";
          wrapperPool.set(line.seed, wrapper);
        }
        if (wrapper.parentElement !== target)
          target.appendChild(wrapper);
        applyBoxPosition(wrapper, line.box);
        let band = bandPool.get(line.seed);
        if (!band) {
          band = doc.createElement("div");
          band.setAttribute("aria-hidden", "true");
          wrapper.appendChild(band);
          bandPool.set(line.seed, band);
        }
        styleBand(band, line, context, inkColor);
      }
      wrapperPool.retain(keep, (el) => el.remove());
      bandPool.retain(keep, () => {});
    }
    return {
      tier: "css",
      mount: render,
      update: render,
      bandFor: (seed) => wrapperPool.get(seed) ?? null,
      unmount() {
        wrapperPool.clear((el) => el.remove());
        bandPool.clear(() => {});
        blendLayer?.remove();
        blendLayer = null;
        container = null;
      }
    };
  }
  var SVG_NS = "http://www.w3.org/2000/svg";
  var SHARED_SVG_ID = "highlighters-shared-defs";
  function getSharedDefs(doc) {
    const existing = doc.getElementById(SHARED_SVG_ID);
    if (existing) {
      const defs2 = existing.querySelector("defs");
      if (defs2)
        return defs2;
    }
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("id", SHARED_SVG_ID);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    const s = svg.style;
    s.position = "absolute";
    s.width = "0";
    s.height = "0";
    s.overflow = "hidden";
    s.pointerEvents = "none";
    const defs = doc.createElementNS(SVG_NS, "defs");
    svg.appendChild(defs);
    (doc.body ?? doc.documentElement).appendChild(svg);
    return defs;
  }
  function quantize(value, steps) {
    return Math.round(clamp(value, 0, 1) * steps) / steps;
  }
  function resolveEdgeFilter(options) {
    const { edge, ink, paper } = options;
    const softness = ink.feathering * 1 + ink.flow * 0.4 - ink.viscosity * 0.35 + paper.absorbency * 0.4;
    const blur = quantize(Math.max(0, softness), 8) * 4;
    const spread = ink.feathering * 0.8 + paper.absorbency * 0.5 + ink.flow * 0.25 - 0.15;
    const morph = quantize(Math.max(0, spread), 6) * 1.8;
    const frayRaw = edge.waviness * 0.8 + edge.roughness * 4 + paper.absorbency * 2;
    const scale = Math.min(8, Math.round(frayRaw * 2) / 2);
    if (blur <= 0 && morph <= 0 && scale <= 0)
      return null;
    return { scale, morph, blur };
  }
  function edgeFilterId(p) {
    const key = `${p.scale}-${p.morph}-${p.blur}`.replace(/\./g, "p");
    return `highlighters-edge-${key}`;
  }
  function ensureEdgeFilter(defs, params) {
    const id = edgeFilterId(params);
    const doc = defs.ownerDocument;
    if (!doc.getElementById(id)) {
      defs.appendChild(buildEdgeFilter(doc, id, params));
    }
    return id;
  }
  function buildEdgeFilter(doc, id, params) {
    const filter = doc.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    filter.setAttribute("filterUnits", "objectBoundingBox");
    const turb = doc.createElementNS(SVG_NS, "feTurbulence");
    turb.setAttribute("type", "fractalNoise");
    turb.setAttribute("baseFrequency", "0.012 0.04");
    turb.setAttribute("numOctaves", "2");
    turb.setAttribute("seed", "7");
    turb.setAttribute("stitchTiles", "stitch");
    turb.setAttribute("result", "noise");
    filter.appendChild(turb);
    const disp = doc.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "noise");
    disp.setAttribute("scale", String(params.scale));
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");
    disp.setAttribute("result", "displaced");
    filter.appendChild(disp);
    let last = "displaced";
    if (params.morph > 0) {
      const morph = doc.createElementNS(SVG_NS, "feMorphology");
      morph.setAttribute("in", last);
      morph.setAttribute("operator", "dilate");
      morph.setAttribute("radius", String(params.morph));
      morph.setAttribute("result", "bled");
      filter.appendChild(morph);
      last = "bled";
    }
    if (params.blur > 0) {
      const blur = doc.createElementNS(SVG_NS, "feGaussianBlur");
      blur.setAttribute("in", last);
      blur.setAttribute("stdDeviation", String(params.blur));
      filter.appendChild(blur);
    }
    return filter;
  }
  function createSvgRenderer() {
    const wrapperPool = new NodePool;
    const inkPool = new NodePool;
    const glowPool = new NodePool;
    let container = null;
    let blendLayer = null;
    function fillWrapper(el) {
      setStyleOnce(el, "position", "absolute");
      setStyleOnce(el, "left", "0");
      setStyleOnce(el, "top", "0");
      setStyleOnce(el, "width", "100%");
      setStyleOnce(el, "height", "100%");
    }
    function styleInk(el, line, context, filterValue, inkColor) {
      const { options } = context;
      const { ink } = options;
      fillWrapper(el);
      setStyleOnce(el, "pointer-events", "none");
      setStyleOnce(el, "mix-blend-mode", options.blendMode);
      const flowGain = 1 + 0.35 * (clamp(ink.flow, 0, 1) - clamp(ink.viscosity, 0, 1));
      const effectiveAlpha = clamp(options.opacity * 0.805 * flowGain * (line.pool.layerScale ?? 1), 0, 1);
      setStyleOnce(el, "opacity", String(round3(effectiveAlpha)));
      setStyleOnce(el, "background-image", poolGradientToCss(line.pool, inkColor));
      setStyleOnce(el, "background-repeat", "no-repeat");
      setVendorPrefixed(el, "clip-path", line.clipPath);
      setVendorPrefixed(el, "mask-image", `url("${line.noiseTile.dataUrl}")`);
      setVendorPrefixed(el, "mask-repeat", "repeat");
      setVendorPrefixed(el, "mask-position", `${line.maskOffset.x}px ${line.maskOffset.y}px`);
      setVendorPrefixed(el, "mask-size", `${line.noiseTile.width}px ${line.noiseTile.height}px`);
      setStyleOnce(el, "filter", filterValue);
    }
    function styleGlow(el, line, context) {
      const { glow } = context.options;
      fillWrapper(el);
      setStyleOnce(el, "pointer-events", "none");
      setStyleOnce(el, "mix-blend-mode", "screen");
      setStyleOnce(el, "opacity", String(round3(clamp(glow.intensity * 0.82, 0, 1))));
      setStyleOnce(el, "background-color", glow.color);
      setVendorPrefixed(el, "clip-path", line.clipPath);
      setStyleOnce(el, "filter", `blur(${glow.spread}px)`);
    }
    function ensureInk(doc, wrapper, seed) {
      let ink = inkPool.get(seed);
      if (!ink) {
        ink = doc.createElement("div");
        ink.setAttribute("aria-hidden", "true");
        wrapper.appendChild(ink);
        inkPool.set(seed, ink);
      }
      return ink;
    }
    function render(context) {
      container = context.container;
      const doc = container.ownerDocument;
      const plan = effectiveInk(context.options.blendMode, context.options.color, backdropElement(context), doc, context.options.vivid);
      const { target, layer } = resolveBlendTarget(container.parentElement, container, blendLayer, plan.layer);
      blendLayer = layer;
      const inkColor = plan.color === context.options.color ? undefined : plan.color;
      const defs = getSharedDefs(doc);
      const filterParams = resolveEdgeFilter(context.options);
      const filterValue = filterParams ? `url(#${ensureEdgeFilter(defs, filterParams)})` : "";
      const glowEnabled = context.options.glow.enabled;
      const keep = /* @__PURE__ */ new Set;
      for (const line of context.lines) {
        keep.add(line.seed);
        let wrapper = wrapperPool.get(line.seed);
        if (!wrapper) {
          wrapper = doc.createElement("div");
          wrapper.setAttribute("aria-hidden", "true");
          wrapper.style.pointerEvents = "none";
          wrapperPool.set(line.seed, wrapper);
        }
        if (wrapper.parentElement !== target)
          target.appendChild(wrapper);
        applyBoxPosition(wrapper, line.box);
        const ink = ensureInk(doc, wrapper, line.seed);
        if (glowEnabled) {
          let glow = glowPool.get(line.seed);
          if (!glow) {
            glow = doc.createElement("div");
            glow.setAttribute("aria-hidden", "true");
            wrapper.insertBefore(glow, ink);
            glowPool.set(line.seed, glow);
          }
          styleGlow(glow, line, context);
        }
        styleInk(ink, line, context, filterValue, inkColor);
      }
      wrapperPool.retain(keep, (el) => el.remove());
      inkPool.retain(keep, () => {});
      const glowKeep = glowEnabled ? keep : /* @__PURE__ */ new Set;
      glowPool.retain(glowKeep, (el) => el.remove());
    }
    return {
      tier: "svg",
      mount: render,
      update: render,
      bandFor: (seed) => wrapperPool.get(seed) ?? null,
      unmount() {
        wrapperPool.clear((el) => el.remove());
        inkPool.clear(() => {});
        glowPool.clear(() => {});
        blendLayer?.remove();
        blendLayer = null;
        container = null;
      }
    };
  }
  function round3(v) {
    return Math.round(v * 1000) / 1000;
  }
  var highlightSeq = 0;
  var STYLE_ID = "highlighters-highlight-api-styles";
  function getSharedStyle(doc) {
    const existing = doc.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement)
      return existing;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    (doc.head ?? doc.documentElement).appendChild(style);
    return style;
  }
  function highlightApiAvailable() {
    return hasGlobal("CSS") && "highlights" in CSS && hasGlobal("Highlight");
  }
  function createHighlightApiRenderer() {
    const name = `highlighters-${++highlightSeq}`;
    let highlight2 = null;
    let styleEl = null;
    let ruleText = "";
    function ruleFor(context) {
      const { options } = context;
      const alpha = Math.max(0, Math.min(1, options.opacity));
      const raw = String(options.color);
      const color = hasGlobal("CSS") && CSS.supports?.("color", raw) ? raw : "transparent";
      const fill = `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
      const decls = [`background-color: ${fill}`, `color: inherit`];
      return `::highlight(${name}) { ${decls.join("; ")}; }`;
    }
    function register(ranges) {
      if (!highlightApiAvailable())
        return;
      if (!highlight2) {
        highlight2 = new Highlight;
        CSS.highlights.set(name, highlight2);
      } else {
        highlight2.clear();
      }
      for (const range of ranges)
        highlight2.add(range);
    }
    function writeRule(context) {
      const doc = context.container.ownerDocument ?? (hasGlobal("document") ? document : null);
      if (!doc)
        return;
      styleEl ?? (styleEl = getSharedStyle(doc));
      ruleText = ruleFor(context);
      rewriteOwnRule();
    }
    function rewriteOwnRule() {
      if (!styleEl)
        return;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const ownRule = new RegExp(`\\s*::highlight\\(${escaped}\\)\\s*\\{[^}]*\\}`, "g");
      const base = (styleEl.textContent ?? "").replace(ownRule, "").trim();
      styleEl.textContent = base ? `${base}
${ruleText}` : ruleText;
    }
    return {
      tier: "highlight-api",
      mount(context) {
        register(context.ranges);
        writeRule(context);
      },
      update(context) {
        register(context.ranges);
        writeRule(context);
      },
      bandFor: () => null,
      unmount() {
        if (highlightApiAvailable() && CSS.highlights.has(name)) {
          CSS.highlights.delete(name);
        }
        highlight2 = null;
        if (styleEl) {
          ruleText = "";
          rewriteOwnRule();
          if (!styleEl.textContent || styleEl.textContent.trim() === "") {
            styleEl.remove();
          }
          styleEl = null;
        }
      }
    };
  }
  var NAMED_EASINGS = {
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1]
  };
  function cubicBezierEaser(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0)
        return 0;
      if (x >= 1)
        return 1;
      let t = x;
      for (let i = 0;i < 6; i++) {
        const err = sampleX(t) - x;
        if (Math.abs(err) < 0.0001)
          break;
        const d = slopeX(t);
        if (Math.abs(d) < 0.000001)
          break;
        t -= err / d;
      }
      return sampleY(t);
    };
  }
  function isNamedEasing(value) {
    return value in NAMED_EASINGS;
  }
  function parseEasing(easing) {
    if (easing === "linear")
      return (t) => t;
    if (isNamedEasing(easing)) {
      const [x1, y1, x2, y2] = NAMED_EASINGS[easing];
      return cubicBezierEaser(x1, y1, x2, y2);
    }
    const m = /cubic-bezier\(([^)]+)\)/.exec(easing);
    if (m) {
      const n = m[1].split(",").map((s) => Number(s.trim()));
      if (n.length === 4 && n.every(Number.isFinite)) {
        return cubicBezierEaser(n[0], n[1], n[2], n[3]);
      }
    }
    const fallback = NAMED_EASINGS["ease-out"];
    return cubicBezierEaser(fallback[0], fallback[1], fallback[2], fallback[3]);
  }
  function setClip(el, path) {
    el.style.clipPath = path;
    el.style.setProperty("-webkit-clip-path", path);
  }
  var FADE_IN_MS = 50;
  function fadeOpacity(elapsedMs, fadeMs) {
    if (elapsedMs >= fadeMs)
      return "";
    return (Math.max(0, elapsedMs) / fadeMs).toFixed(3);
  }
  function drawItems(bandFor, lines, stagger) {
    const items = [];
    lines.forEach((line, i) => {
      const node = bandFor(line.seed);
      if (!node)
        return;
      items.push({
        node,
        full: line.clipPath,
        build: line.clipAtFront,
        width: line.box.width,
        minFront: line.minFront,
        startMs: i * stagger
      });
    });
    return items;
  }
  function showFull(items) {
    for (const it of items) {
      setClip(it.node, it.full);
      it.node.style.opacity = "";
    }
  }
  function asHandle(disconnect, retarget, replay) {
    return Object.assign(disconnect, { retarget, replay });
  }
  function applyDrawOn(container, bandFor, lines, animation, env) {
    if (lines.length === 0)
      return asHandle(() => {}, () => {}, () => {});
    let items = drawItems(bandFor, lines, animation.stagger);
    if (items.length === 0)
      return asHandle(() => {}, () => {}, () => {});
    if (env.prefersReducedMotion || !animation.draw || !hasGlobal("requestAnimationFrame")) {
      showFull(items);
      return asHandle(() => {}, (next) => showFull(drawItems(bandFor, next, animation.stagger)), () => showFull(items));
    }
    const ease = parseEasing(animation.easing);
    const duration = Math.max(1, animation.duration);
    const fadeMs = Math.min(FADE_IN_MS, duration * 0.5);
    let raf = 0;
    let startTime = 0;
    let observer = null;
    let played = false;
    function primeClosed(it) {
      setClip(it.node, it.build(0));
    }
    function frame(now) {
      if (startTime === 0)
        startTime = now;
      let done = true;
      for (const it of items) {
        const elapsed = now - startTime - it.startMs;
        const t = elapsed / duration;
        if (t >= 1) {
          setClip(it.node, it.full);
          it.node.style.opacity = "";
          continue;
        }
        done = false;
        const p = t <= 0 ? 0 : ease(t);
        const front = p <= 0 ? 0 : it.minFront + p * (it.width - it.minFront);
        setClip(it.node, it.build(front));
        it.node.style.opacity = fadeOpacity(elapsed, fadeMs);
      }
      raf = done ? 0 : requestAnimationFrame(frame);
    }
    function play() {
      startTime = 0;
      for (const it of items)
        primeClosed(it);
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf)
        cancelAnimationFrame(raf);
      raf = 0;
    }
    if (animation.trigger === "in-view" && hasGlobal("IntersectionObserver")) {
      for (const it of items)
        primeClosed(it);
      observer = new IntersectionObserver((entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible)
          return;
        if (played && !animation.repeat)
          return;
        if (animation.repeat)
          stop();
        played = true;
        play();
        if (!animation.repeat) {
          observer?.disconnect();
          observer = null;
        }
      }, { threshold: animation.threshold, rootMargin: animation.rootMargin });
      observer.observe(container);
    } else {
      played = true;
      play();
    }
    function retarget(next) {
      items = drawItems(bandFor, next, animation.stagger);
      if (raf !== 0)
        return;
      if (played)
        showFull(items);
      else
        for (const it of items)
          primeClosed(it);
    }
    function replay() {
      stop();
      played = true;
      play();
    }
    return asHandle(() => {
      stop();
      observer?.disconnect();
      observer = null;
      showFull(items);
    }, retarget, replay);
  }
  function createMarkHandle(init) {
    const { renderer, container, reflow, rebuild, replay, retarget } = init;
    const cleanups = init.cleanup ? [...init.cleanup] : [];
    let userOptions = init.userOptions ? { ...init.userOptions } : {};
    let resolved = init.options;
    let showing = true;
    let removed = false;
    function rerender() {
      if (removed)
        return;
      const ctx = rebuild(resolved);
      renderer.update(ctx);
      retarget?.(ctx.lines);
      container.style.visibility = showing ? "" : "hidden";
    }
    return {
      get tier() {
        return renderer.tier;
      },
      show() {
        if (removed)
          return;
        showing = true;
        container.style.visibility = "";
        replay?.();
      },
      hide() {
        if (removed)
          return;
        showing = false;
        container.style.visibility = "hidden";
      },
      isShowing() {
        return showing && !removed;
      },
      update(opts) {
        if (removed)
          return;
        userOptions = mergeOptions(userOptions, opts);
        resolved = resolveOptions(userOptions);
        rerender();
      },
      remove() {
        if (removed)
          return;
        removed = true;
        showing = false;
        reflow();
        for (const dispose of cleanups) {
          try {
            dispose();
          } catch {}
        }
        cleanups.length = 0;
        renderer.unmount();
        teardownContainer(container);
      }
    };
  }
  function inertHandle() {
    return {
      show() {},
      hide() {},
      update() {},
      remove() {},
      isShowing() {
        return false;
      },
      tier: "css"
    };
  }
  function rendererForTier(tier) {
    switch (tier) {
      case "svg":
        return createSvgRenderer();
      case "highlight-api":
        return createHighlightApiRenderer();
      case "css":
      default:
        return createCssRenderer();
    }
  }
  function defaultSnap(target) {
    if (!(target instanceof Object) || target instanceof Element)
      return "line";
    if (hasGlobal("Range") && target instanceof Range)
      return "word";
    if (hasGlobal("Selection") && target instanceof Selection)
      return "word";
    if ("text" in target)
      return "word";
    return "line";
  }
  function snapRanges(ranges, mode) {
    if (mode === "none")
      return ranges;
    return ranges.map((r) => snapRangeToBounds(r, mode));
  }
  function elementsFromRanges(ranges) {
    const seen = /* @__PURE__ */ new Set;
    const add = (node) => {
      if (!node)
        return;
      const el = node instanceof Element ? node : node.parentElement;
      if (el)
        seen.add(el);
    };
    for (const range of ranges) {
      add(range.startContainer);
      add(range.endContainer);
      add(range.commonAncestorContainer);
    }
    return [...seen];
  }
  function reflowTargetsFor(host, ranges) {
    return [.../* @__PURE__ */ new Set([host, ...elementsFromRanges(ranges)])];
  }
  function hostFor(ranges) {
    for (const range of ranges) {
      const node = range.commonAncestorContainer;
      const el = node instanceof Element ? node : node.parentElement;
      if (el) {
        return el.ownerDocument.body ?? el.ownerDocument.documentElement;
      }
    }
    return null;
  }
  function measureLines(ranges, container, cachedOrigin, anchorHost) {
    if (ranges.length === 0)
      return [];
    const origin = cachedOrigin ?? container.getBoundingClientRect();
    const hostRect = anchorHost?.getBoundingClientRect();
    const lineRects = rangesToLineRects(ranges, undefined, origin.top, anchorHost && hostRect ? { scope: anchorHost, columnBounds: { left: hostRect.left, right: hostRect.right } } : undefined);
    for (const rect of lineRects) {
      rect.left -= origin.left;
      rect.top -= origin.top;
    }
    return lineRects;
  }
  function linesToGeometry(locals, options, flowReversed = false, profileFor) {
    return locals.map((local) => {
      const seed = options.seed == null ? local.seed : hashU32(options.seed + local.seed);
      return buildMarkGeometry(local, options, seed, flowReversed, profileFor?.(local));
    });
  }
  function isSelectionBackward(selection) {
    const { anchorNode, focusNode } = selection;
    if (selection.isCollapsed || !anchorNode || !focusNode)
      return false;
    if (anchorNode === focusNode)
      return selection.focusOffset < selection.anchorOffset;
    const relation = anchorNode.compareDocumentPosition(focusNode);
    return (relation & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
  }
  function mountMark(ranges, userOptions, resolved, extraCleanup = [], hostOverride, rangeSource) {
    const host = hostOverride ?? hostFor(ranges);
    if (!host)
      return inertHandle();
    const container = createOverlayContainer(host);
    const env = detectEnvironment();
    let activeRanges = ranges;
    let cached = null;
    const buildContext = (opts) => {
      if (cached === null || cached.snap !== opts.snap) {
        cached = { snap: opts.snap, lines: measureLines(snapRanges(activeRanges, opts.snap), container) };
      }
      const lines = linesToGeometry(cached.lines, opts);
      return { container, options: opts, lines, ranges: activeRanges };
    };
    const initialContext = buildContext(resolved);
    const tier = selectTier(resolved.renderer, env, initialContext.lines.length);
    const renderer = rendererForTier(tier);
    renderer.mount(initialContext);
    const animDisconnect = applyDrawOn(container, (seed) => renderer.bandFor(seed), initialContext.lines, resolved.animation, env);
    const reflow = createReflowObserver(reflowTargetsFor(host, activeRanges), () => {
      cached = null;
      const ctx = buildContext(resolved);
      renderer.update(ctx);
      animDisconnect.retarget(ctx.lines);
    });
    return createMarkHandle({
      ranges,
      options: resolved,
      userOptions,
      renderer,
      container,
      reflow,
      cleanup: [animDisconnect, ...extraCleanup],
      replay: () => animDisconnect.replay(),
      retarget: (lines) => animDisconnect.retarget(lines),
      rebuild: (opts) => {
        Object.assign(resolved, opts);
        if (rangeSource) {
          activeRanges = rangeSource();
          cached = null;
        }
        return buildContext(resolved);
      }
    });
  }
  function highlight(target, options, host) {
    if (!hasDom())
      return inertHandle();
    const userOptions = {
      snap: defaultSnap(target),
      ...options
    };
    const resolved = resolveOptions(userOptions);
    const ranges = toRanges(target);
    if (ranges.length === 0)
      return inertHandle();
    return mountMark(ranges, userOptions, resolved, [], host ?? undefined);
  }
  function highlightAll(options) {
    if (!hasDom())
      return inertHandle();
    const root = document.body ?? document.documentElement;
    const userOptions = { snap: "line", ...options };
    const resolved = resolveOptions(userOptions);
    const collect = () => {
      const pageRanges = collectPageRanges({ root });
      const declaredRanges = [];
      for (const el of root.querySelectorAll("[data-highlight]")) {
        declaredRanges.push(...toRanges(el));
      }
      return [...pageRanges, ...declaredRanges];
    };
    const ranges = collect();
    if (ranges.length === 0) {
      const host = root instanceof HTMLElement ? root : document.body;
      if (!host)
        return inertHandle();
      const handle2 = mountMark([], userOptions, resolved, [], host, collect);
      return wrapWithWatcher(handle2, root);
    }
    const handle = mountMark(ranges, userOptions, resolved, [], undefined, collect);
    return wrapWithWatcher(handle, root);
  }
  function wrapWithWatcher(handle, root) {
    const watcher = createMutationWatcher(root, () => {
      handle.update({});
    });
    const baseRemove = handle.remove.bind(handle);
    return {
      get tier() {
        return handle.tier;
      },
      show: handle.show.bind(handle),
      hide: handle.hide.bind(handle),
      isShowing: handle.isShowing.bind(handle),
      update: handle.update.bind(handle),
      remove() {
        watcher();
        baseRemove();
      }
    };
  }
  function highlightSelection(options) {
    if (!hasDom())
      return inertHandle();
    const env = detectEnvironment();
    if (env.coarsePointer)
      return inertHandle();
    let userOptions = { snap: "word", ...options };
    let resolved = resolveOptions(userOptions);
    let currentHost = null;
    let container = null;
    let reflowDisconnect = () => {};
    let renderer = null;
    let currentRanges = [];
    const ensureAnchor = (anchor) => {
      if (anchor === currentHost && container)
        return false;
      if (!container) {
        container = createOverlayContainer(anchor);
        currentHost = anchor;
        return true;
      }
      if (anchor !== currentHost) {
        const view = anchor.ownerDocument.defaultView;
        if (view && view.getComputedStyle(anchor).position === "static") {
          anchor.style.position = "relative";
        }
        anchor.appendChild(container);
        currentHost = anchor;
        return true;
      }
      return false;
    };
    const armReflow = (anchor, ranges) => {
      reflowDisconnect();
      reflowDisconnect = createReflowObserver(reflowTargetsFor(anchor, ranges), () => {
        if (currentRanges.length === 0)
          return;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        renderSelection();
      });
    };
    const tracker = env.prefersReducedMotion ? null : new SelectionVelocityTracker;
    let dragging = false;
    const onPointerDown = (e) => {
      if (e.button !== 0 || e.pointerType !== "mouse" && e.pointerType !== "pen")
        return;
      dragging = true;
      tracker?.reset();
    };
    const endDrag = () => {
      flushRender();
      dragging = false;
    };
    if (tracker) {
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("pointerup", endDrag, true);
      document.addEventListener("pointercancel", endDrag, true);
      window.addEventListener("blur", endDrag);
    }
    const rebuild = (ranges, flowReversed, origin) => {
      const snapped = snapRanges(ranges, resolved.snap);
      const speedOn = tracker !== null && resolved.speed.enabled && dragging;
      const profileFor = speedOn ? (local) => tracker.profileForLine({ top: local.top, height: local.height, left: local.left, width: local.width }, resolved.speed) : undefined;
      const lines = linesToGeometry(measureLines(snapped, container, origin, currentHost ?? undefined), resolved, flowReversed, profileFor);
      return { container, options: resolved, lines, ranges };
    };
    const CLEAR_FADE_MS = 200;
    let clearTimer = null;
    const cancelClearFade = () => {
      if (clearTimer !== null) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }
      if (container) {
        container.style.transition = "";
        container.style.opacity = "";
      }
    };
    const sample = () => {
      if (!tracker || !dragging || !resolved.speed.enabled)
        return;
      if (!container)
        return;
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed)
        return;
      const origin = container.getBoundingClientRect();
      tracker.recordSample(selection, origin.left, origin.top, performance.now(), resolved.speed.smoothing);
    };
    const renderSelection = () => {
      const selection = document.getSelection();
      const ranges = [];
      let flowReversed = false;
      if (selection && !selection.isCollapsed) {
        flowReversed = isSelectionBackward(selection);
        for (let i = 0;i < selection.rangeCount; i++) {
          ranges.push(selection.getRangeAt(i).cloneRange());
        }
      }
      const painted = excludeMarkedSubtrees(ranges);
      const cleared = painted.length === 0 && currentRanges.length > 0;
      currentRanges = painted;
      if (cleared && resolved.fadeOnClear && renderer && !env.prefersReducedMotion) {
        container.style.transition = `opacity ${CLEAR_FADE_MS}ms ease-out`;
        container.style.opacity = "0";
        clearTimer = setTimeout(() => {
          clearTimer = null;
          if (!container)
            return;
          renderer?.update(rebuild([], false));
          container.style.transition = "";
          container.style.opacity = "";
        }, CLEAR_FADE_MS);
        return;
      }
      cancelClearFade();
      if (painted.length > 0) {
        const anchor = findSelectionAnchor(painted[0].commonAncestorContainer);
        if (ensureAnchor(anchor))
          armReflow(anchor, painted);
      }
      if (!container)
        return;
      const origin = container.getBoundingClientRect();
      const context = rebuild(painted, flowReversed, origin);
      if (!renderer) {
        const tier = selectTier(resolved.renderer, env, context.lines.length);
        renderer = rendererForTier(tier);
        renderer.mount(context);
      } else {
        renderer.update(context);
      }
    };
    let rafId = 0;
    const scheduleRender = () => {
      if (rafId)
        return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        renderSelection();
      });
    };
    const flushRender = () => {
      if (!rafId)
        return;
      cancelAnimationFrame(rafId);
      rafId = 0;
      renderSelection();
    };
    const onSelectionChange = () => {
      sample();
      scheduleRender();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    renderSelection();
    let showing = true;
    let removed = false;
    return {
      get tier() {
        return renderer?.tier ?? "css";
      },
      show() {
        if (removed)
          return;
        showing = true;
        if (container)
          container.style.visibility = "";
      },
      hide() {
        if (removed)
          return;
        showing = false;
        if (container)
          container.style.visibility = "hidden";
      },
      isShowing() {
        return showing && !removed && currentRanges.length > 0;
      },
      update(opts) {
        if (removed)
          return;
        userOptions = mergeOptions(userOptions, opts);
        resolved = resolveOptions(userOptions);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        renderSelection();
      },
      remove() {
        if (removed)
          return;
        removed = true;
        showing = false;
        if (rafId)
          cancelAnimationFrame(rafId);
        if (clearTimer !== null)
          clearTimeout(clearTimer);
        reflowDisconnect();
        document.removeEventListener("selectionchange", onSelectionChange);
        if (tracker) {
          document.removeEventListener("pointerdown", onPointerDown, true);
          document.removeEventListener("pointerup", endDrag, true);
          document.removeEventListener("pointercancel", endDrag, true);
          window.removeEventListener("blur", endDrag);
          tracker.reset();
        }
        renderer?.unmount();
        renderer = null;
        if (container) {
          teardownContainer(container);
          container = null;
          currentHost = null;
        }
      }
    };
  }
  function group(handles) {
    const marks = [...handles];
    return {
      get marks() {
        return marks;
      },
      show() {
        for (const handle of marks)
          handle.show();
      },
      hide() {
        for (const handle of marks)
          handle.hide();
      },
      remove() {
        for (const handle of marks)
          handle.remove();
      }
    };
  }

  // tools/highlighters.entry.js
  window.Highlighters = exports_dist;
})();
