/* Gravity Lab — the renderer.
   Three stacked 2D canvases and zero libraries:

     bg      static-ish starfield, redrawn only when the camera moves
     scene   bodies + glow, faded a little every frame to leave comet trails
     overlay crisp vectors, quadtree, grid, selection, spawn arrow, HUD

   Glow is drawn from a pre-baked sprite LUT with 'lighter' compositing, which
   is an order of magnitude faster than filling a fresh radial gradient per body. */

(function (global) {
  'use strict';

  var SPRITE_SIZE = 64;
  var LUT_N = 64;

  var GROUP_COLORS = [
    '#f2a63b', '#5cc47a', '#6fa8ff', '#e86fa0',
    '#c9a3ff', '#6fe3e0', '#ff8a5c', '#d8e06a',
    '#9fb4c7', '#ff6b6b'
  ];

  var KIND_COLORS = {
    star: '#ffd27a',
    planet: '#7fd4ff',
    dust: '#9fb4c7',
    bh: '#b98cff',
    custom: '#ff9f6b'
  };

  /* Blackbody-ish ramp: dull red → orange → amber → white → blue-white. */
  var RAMP = [
    [0.00, [110, 40, 46]],
    [0.20, [214, 84, 40]],
    [0.40, [242, 166, 59]],
    [0.60, [255, 224, 158]],
    [0.80, [255, 255, 255]],
    [1.00, [168, 212, 255]]
  ];

  function ramp(t) {
    if (!(t > 0)) t = 0;
    if (t > 1) t = 1;
    for (var i = 1; i < RAMP.length; i++) {
      if (t <= RAMP[i][0]) {
        var a = RAMP[i - 1], b = RAMP[i];
        var f = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
        return [
          Math.round(a[1][0] + (b[1][0] - a[1][0]) * f),
          Math.round(a[1][1] + (b[1][1] - a[1][1]) * f),
          Math.round(a[1][2] + (b[1][2] - a[1][2]) * f)
        ];
      }
    }
    return RAMP[RAMP.length - 1][1];
  }

  function rgb(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')';
  }

  function hexToRgb(h) {
    var s = h.replace('#', '');
    return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  }

  /* ── sprite LUT ───────────────────────────────────────── */

  /* One factory for every palette. An earlier version baked the speed ramp as
     bare canvases while the group palette returned {cv, rgb} objects, so
     drawImage() got undefined the moment anyone left "colour by group". */
  function makeSprite(c) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = SPRITE_SIZE;
    var g = cv.getContext('2d');
    var r = SPRITE_SIZE / 2;
    var grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0.00, rgb(c, 1));
    grad.addColorStop(0.18, rgb(c, 0.70));
    grad.addColorStop(0.42, rgb(c, 0.19));
    grad.addColorStop(1.00, rgb(c, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return { cv: cv, rgb: c, hex: 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' };
  }

  function buildLUT() {
    var lut = [];
    for (var i = 0; i < LUT_N; i++) lut.push(makeSprite(ramp(i / (LUT_N - 1))));
    return lut;
  }

  function buildGroupSprites() {
    var out = [];
    for (var i = 0; i < GROUP_COLORS.length; i++) out.push(makeSprite(hexToRgb(GROUP_COLORS[i])));
    return out;
  }

  function buildKindSprites() {
    var out = {};
    for (var k in KIND_COLORS) {
      if (Object.prototype.hasOwnProperty.call(KIND_COLORS, k)) out[k] = makeSprite(hexToRgb(KIND_COLORS[k]));
    }
    out.mono = makeSprite([255, 214, 150]);
    return out;
  }

  /* ── renderer ─────────────────────────────────────────── */

  function Renderer(opts) {
    this.bg = opts.bg;
    this.scene = opts.scene;
    this.overlay = opts.overlay;
    this.bgc = this.bg.getContext('2d');
    this.sc = this.scene.getContext('2d');
    this.oc = this.overlay.getContext('2d');

    this.cam = { x: 0, y: 0, zoom: 1 };
    this.w = 1; this.h = 1; this.dpr = 1;
    this.camDirty = true;

    this.lut = buildLUT();
    this.groupSprites = buildGroupSprites();
    this.kindSprites = buildKindSprites();

    this.show = {
      vectors: false,
      quadtree: false,
      grid: true,
      labels: true,
      starfield: true
    };

    this.style = {
      colorMode: 'group',
      trail: 0.22,          /* 0 = infinite smear, 1 = no trail at all */
      glow: 1.0,
      size: 1.0,
      trailMode: 'glow',
      bg: '#0b0d10'
    };

    this.speedMax = 6;
    this.stars = null;
  }

  Renderer.prototype.resize = function (w, h) {
    this.dpr = Math.min(2, global.devicePixelRatio || 1);
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    var canvases = [this.bg, this.scene, this.overlay];
    for (var i = 0; i < canvases.length; i++) {
      canvases[i].width = Math.round(this.w * this.dpr);
      canvases[i].height = Math.round(this.h * this.dpr);
      canvases[i].style.width = this.w + 'px';
      canvases[i].style.height = this.h + 'px';
    }
    for (i = 0; i < canvases.length; i++) {
      var c = canvases[i].getContext('2d');
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.camDirty = true;
    this.buildStars();
    this.hardClear();
  };

  Renderer.prototype.buildStars = function () {
    var rnd = SimPhysics.makeRandom('starfield', 'v1');
    var n = Math.round(Math.min(520, Math.max(140, this.w * this.h / 3600)));
    /* laid out on a tile twice the viewport so parallax can wrap seamlessly */
    var stars = [];
    for (var i = 0; i < n; i++) {
      var t = rnd();
      stars.push({
        x: rnd(), y: rnd(),
        r: 0.35 + t * t * 1.5,
        a: 0.16 + rnd() * 0.55,
        p: 0.18 + rnd() * 0.5      /* parallax depth */
      });
    }
    this.stars = stars;
  };

  Renderer.prototype.hardClear = function () {
    this.sc.clearRect(0, 0, this.w, this.h);
  };

  /* world → screen (y flips so +y is up, like every orbit diagram ever) */
  Renderer.prototype.sx = function (x) { return (x - this.cam.x) * this.cam.zoom + this.w * 0.5; };
  Renderer.prototype.sy = function (y) { return this.h * 0.5 - (y - this.cam.y) * this.cam.zoom; };
  Renderer.prototype.wx = function (px) { return (px - this.w * 0.5) / this.cam.zoom + this.cam.x; };
  Renderer.prototype.wy = function (py) { return (this.h * 0.5 - py) / this.cam.zoom + this.cam.y; };

  Renderer.prototype.markCameraDirty = function () { this.camDirty = true; };

  Renderer.prototype.fit = function (b, pad) {
    pad = pad === undefined ? 1.18 : pad;
    this.cam.x = b.x + b.w * 0.5;
    this.cam.y = b.y + b.h * 0.5;
    var z = Math.min(this.w / Math.max(1e-9, b.w), this.h / Math.max(1e-9, b.h)) / pad;
    this.cam.zoom = Math.max(1e-7, Math.min(1e5, z));
    this.camDirty = true;
  };

  Renderer.prototype.zoomAt = function (px, py, factor) {
    var wx = this.wx(px), wy = this.wy(py);
    var z = this.cam.zoom * factor;
    z = Math.max(1e-6, Math.min(2e5, z));
    this.cam.zoom = z;
    /* keep the world point under the cursor pinned */
    this.cam.x = wx - (px - this.w * 0.5) / z;
    this.cam.y = wy + (py - this.h * 0.5) / z;
    this.camDirty = true;
  };

  /* ── colour of a body ─────────────────────────────────── */

  /* Every branch must return a {cv, rgb} sprite — never a bare canvas. */
  Renderer.prototype.spriteFor = function (b) {
    var mode = this.style.colorMode;
    if (mode === 'kind') return this.kindSprites[b.kind] || this.kindSprites.dust;
    if (mode === 'mono') return this.kindSprites.mono;
    if (mode === 'speed') {
      var s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var i = Math.round(Math.min(1, s / this.speedMax) * (LUT_N - 1));
      return this.lut[i < 0 ? 0 : (i > LUT_N - 1 ? LUT_N - 1 : i)];
    }
    if (mode === 'mass') {
      var lm = Math.min(1, Math.log(1 + b.m) / Math.log(1 + 30000));
      var j = Math.round(lm * (LUT_N - 1));
      return this.lut[j > LUT_N - 1 ? LUT_N - 1 : j];
    }
    return this.groupSprites[b.g % this.groupSprites.length];
  };

  /* Colour used for world-space trail bucketing. */
  Renderer.prototype.trailColorFor = function (b) {
    var mode = this.style.colorMode;
    if (mode === 'group') return this.groupSprites[b.g % this.groupSprites.length];
    if (mode === 'kind') return this.kindSprites[b.kind] || this.kindSprites.dust;
    if (mode === 'mono') return this.kindSprites.mono;
    return null;
  };

  /* ── background layer ─────────────────────────────────── */

  Renderer.prototype.drawBackground = function () {
    var c = this.bgc;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = this.style.bg;
    c.fillRect(0, 0, this.w, this.h);

    if (this.show.grid) this.drawGrid(c);

    if (this.show.starfield !== false && this.stars) {
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        /* parallax wrap so panning never runs out of stars */
        var px = ((s.x * this.w - this.cam.x * this.cam.zoom * s.p) % this.w + this.w) % this.w;
        var py = ((s.y * this.h + this.cam.y * this.cam.zoom * s.p) % this.h + this.h) % this.h;
        c.globalAlpha = s.a;
        c.fillStyle = i % 9 === 0 ? '#cfe0ff' : '#ffffff';
        c.beginPath();
        c.arc(px, py, s.r, 0, 6.283185307);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  };

  /* ── grid ─────────────────────────────────────────────── */

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var n = raw / p;
    if (n < 1.5) return p;
    if (n < 3.5) return 2 * p;
    if (n < 7.5) return 5 * p;
    return 10 * p;
  }

  Renderer.prototype.drawGrid = function (c) {
    var z = this.cam.zoom;
    var target = 92 / z;                 /* ~92 px between lines */
    var step = niceStep(target);
    var x0 = Math.floor(this.wx(0) / step) * step;
    var x1 = this.wx(this.w);
    var y0 = Math.floor(this.wy(this.h) / step) * step;
    var y1 = this.wy(0);

    c.lineWidth = 1;
    c.strokeStyle = 'rgba(130,152,175,0.10)';
    c.beginPath();
    for (var x = x0; x <= x1; x += step) {
      var px = Math.round(this.sx(x)) + 0.5;
      c.moveTo(px, 0); c.lineTo(px, this.h);
    }
    for (var y = y0; y <= y1; y += step) {
      var py = Math.round(this.sy(y)) + 0.5;
      c.moveTo(0, py); c.lineTo(this.w, py);
    }
    c.stroke();

    /* axes */
    c.strokeStyle = 'rgba(150,175,200,0.20)';
    c.beginPath();
    var ax = Math.round(this.sx(0)) + 0.5, ay = Math.round(this.sy(0)) + 0.5;
    c.moveTo(ax, 0); c.lineTo(ax, this.h);
    c.moveTo(0, ay); c.lineTo(this.w, ay);
    c.stroke();
  };

  /* ── quadtree debug view ──────────────────────────────── */

  Renderer.prototype.drawTree = function (c, root, depth) {
    if (!root || depth > 9) return;
    var x0 = this.sx(root.x - root.half), y0 = this.sy(root.y + root.half);
    var x1 = this.sx(root.x + root.half), y1 = this.sy(root.y - root.half);
    if (x1 < -40 || x0 > this.w + 40 || y1 < -40 || y0 > this.h + 40) return;
    c.globalAlpha = Math.max(0.05, 0.42 - depth * 0.05);
    c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    if (!root.leaf) {
      this.drawTree(c, root.c0, depth + 1);
      this.drawTree(c, root.c1, depth + 1);
      this.drawTree(c, root.c2, depth + 1);
      this.drawTree(c, root.c3, depth + 1);
    } else if (root.mass > 0) {
      c.globalAlpha = 0.5;
      c.fillStyle = '#5cc47a';
      c.fillRect(this.sx(root.cx) - 1, this.sy(root.cy) - 1, 2, 2);
    }
    c.globalAlpha = 1;
  };

  /* ── world-space trails ───────────────────────────────── */

  Renderer.prototype.drawWorldTrails = function (c, bodies) {
    var buckets = new Map();
    var i, b;

    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!b.trail || b.tLen < 2) continue;
      var spr = this.trailColorFor(b);
      var key = spr ? spr.hex : 'speed';
      var list = buckets.get(key);
      if (!list) buckets.set(key, list = { sprite: spr, bodies: [] });
      list.bodies.push(b);
    }

    c.lineWidth = Math.max(0.7, Math.min(2.2, 1.1 * this.cam.zoom));
    c.lineJoin = 'round';
    c.lineCap = 'round';

    buckets.forEach(function (list) {
      /* Per-body speed colouring would need a stroke per segment, which costs
         more than the whole rest of the frame — bucket to one colour instead. */
      var alpha = Math.min(0.9, 0.34 + 30 / Math.max(1, list.bodies.length));
      c.strokeStyle = list.sprite
        ? 'rgba(' + list.sprite.rgb.join(',') + ',' + alpha.toFixed(3) + ')'
        : 'rgba(255,206,140,' + (alpha * 0.8).toFixed(3) + ')';
      c.beginPath();
      for (var n = 0; n < list.bodies.length; n++) {
        var bd = list.bodies[n];
        var len = bd.trail.length / 2;
        var start = (bd.tHead - bd.tLen + len * 2) % len;
        for (var j = 0; j < bd.tLen; j++) {
          var idx = (start + j) % len;
          var px = this.sx(bd.trail[idx * 2]);
          var py = this.sy(bd.trail[idx * 2 + 1]);
          if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
      }
      c.stroke();
    }, this);
  };

  /* ── main draw ────────────────────────────────────────── */

  Renderer.prototype.draw = function (st, ui) {
    var c = this.sc;
    var bodies = st.bodies;

    if (this.camDirty) {
      this.drawBackground();
      if (this.style.trailMode === 'glow') this.hardClear();
      this.camDirty = false;
    }

    /* Trail persistence.
       Fading must use destination-out, not a translucent fill: this layer is
       transparent and sits above the starfield, and compositing rgba(bg, a)
       onto transparency *accumulates alpha* until the layer is an opaque
       sheet — which hid every star and left 8-bit rounding ghosts behind
       each galaxy. destination-out scales destination alpha by (1-a), so
       trails decay to genuinely transparent. */
    if (this.style.trailMode === 'glow') {
      var tt = this.style.trail;
      if (tt >= 0.985) {
        c.clearRect(0, 0, this.w, this.h);
      } else if ((this.frameNo++ & 1) === 0) {
        /* Per-frame decay factor f = 1 - t/2, applied every other frame with
           alpha A = 1 - f². The stronger pass matters: 8-bit compositing has
           fixed points at round(a*(1-A)) == a, and with a gentle A those sit
           at a <= 6/255 — a permanent grey arc behind every planet. At
           A ~ 0.2 the fixed points fall to a <= 2, i.e. invisible. */
        var f = 1 - tt * 0.5;
        var A = 1 - f * f;
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = 'rgba(0,0,0,' + A.toFixed(4) + ')';
        c.fillRect(0, 0, this.w, this.h);
      }
    } else {
      this.frameNo++;
      c.clearRect(0, 0, this.w, this.h);
    }

    /* speed range for the colour ramp */
    var vmax = 0.0001;
    if (this.style.colorMode === 'speed') {
      for (var q = 0; q < bodies.length; q++) {
        var bb = bodies[q];
        var sp = bb.vx * bb.vx + bb.vy * bb.vy;
        if (sp > vmax) vmax = sp;
      }
      this.speedMax = Math.sqrt(vmax) * 0.82;
    }

    if (this.style.trailMode === 'world') this.drawWorldTrails(c, bodies);

    /* bodies, additively */
    c.globalCompositeOperation = 'lighter';
    var glow = this.style.glow, sizeK = this.style.size, z = this.cam.zoom;

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var px = this.sx(b.x), py = this.sy(b.y);
      if (px < -140 || px > this.w + 140 || py < -140 || py > this.h + 140) continue;

      var sr = b.r * z * sizeK;
      var sprite = this.spriteFor(b);

      var dust = b.kind === 'dust';
      var halo = Math.max(sr * (dust ? 3.4 : 5.2), dust ? 3.0 : 5) * glow;
      c.globalAlpha = dust ? 0.55 : 0.9;
      c.drawImage(sprite.cv, px - halo / 2, py - halo / 2, halo, halo);

      if (sr > 1.1) {
        c.globalAlpha = 1;
        c.fillStyle = rgb(sprite.rgb, 1);
        c.beginPath();
        c.arc(px, py, sr, 0, 6.283185307);
        c.fill();
        if (sr > 3.4) {
          /* a hot core tinted toward white, not a flat white disc — a pure
             white fill reads as a sticker pasted on the glow */
          var cr = sprite.rgb;
          c.globalAlpha = 0.85;
          c.fillStyle = 'rgb(' + Math.round(cr[0] + (255 - cr[0]) * 0.8) + ',' +
                                   Math.round(cr[1] + (255 - cr[1]) * 0.8) + ',' +
                                   Math.round(cr[2] + (255 - cr[2]) * 0.8) + ')';
          c.beginPath();
          c.arc(px, py, sr * 0.40, 0, 6.283185307);
          c.fill();
        }
      }

      if (b.kind === 'bh') {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        c.fillStyle = '#05060a';
        c.beginPath(); c.arc(px, py, Math.max(2, sr * 0.92), 0, 6.283185307); c.fill();
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = 'rgba(190,150,255,0.85)';
        c.lineWidth = Math.max(1, sr * 0.16);
        c.beginPath(); c.arc(px, py, Math.max(2.6, sr * 1.12), 0, 6.283185307); c.stroke();
      }
    }

    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';

    /* ── overlay ─────────────────────────────────────── */
    var o = this.oc;
    o.clearRect(0, 0, this.w, this.h);

    if (this.show.quadtree && st.tree) {
      o.strokeStyle = '#5cc47a';
      o.lineWidth = 1;
      this.drawTree(o, st.tree, 0);
    }

    if (this.show.vectors) {
      o.strokeStyle = 'rgba(120,220,160,0.75)';
      o.lineWidth = 1;
      o.beginPath();
      var vk = Math.min(26, 900 / Math.max(1, bodies.length) * 8 + 3);
      for (var v = 0; v < bodies.length; v++) {
        var bd = bodies[v];
        var bx = this.sx(bd.x), by = this.sy(bd.y);
        if (bx < 0 || bx > this.w || by < 0 || by > this.h) continue;
        o.moveTo(bx, by);
        o.lineTo(bx + bd.vx * vk * z * 0.35, by - bd.vy * vk * z * 0.35);
      }
      o.stroke();
    }

    if (ui) this.drawUiOverlay(o, ui, st);
  };

  Renderer.prototype.drawUiOverlay = function (o, ui, st) {
    /* spawn / fling arrow */
    if (ui.drag && ui.drag.kind === 'spawn') {
      var ax = ui.drag.x0, ay = ui.drag.y0, bx = ui.drag.x1, by = ui.drag.y1;
      var col = ui.drag.massive ? 'rgba(186,140,255,0.95)' : 'rgba(255,183,94,0.95)';
      o.strokeStyle = col;
      o.fillStyle = col;
      o.lineWidth = 1.6;
      o.setLineDash([5, 4]);
      o.beginPath(); o.moveTo(ax, ay); o.lineTo(bx, by); o.stroke();
      o.setLineDash([]);
      var ang = Math.atan2(by - ay, bx - ax);
      o.beginPath();
      o.moveTo(bx, by);
      o.lineTo(bx - Math.cos(ang - 0.4) * 11, by - Math.sin(ang - 0.4) * 11);
      o.lineTo(bx - Math.cos(ang + 0.4) * 11, by - Math.sin(ang + 0.4) * 11);
      o.closePath(); o.fill();
      o.beginPath(); o.arc(ax, ay, Math.max(3, ui.drag.r * this.cam.zoom * this.style.size), 0, 6.283185307); o.stroke();
      o.font = '11px ui-monospace, Menlo, Consolas, monospace';
      o.fillStyle = 'rgba(220,230,240,0.9)';
      var sp = Math.hypot(bx - ax, by - ay) / this.cam.zoom;
      o.fillText('v = ' + sp.toFixed(2) + '   m = ' + ui.drag.mass.toPrecision(3), ax + 10, ay - 10);
    }

    /* grabbed body highlight */
    if (ui.grabbed) {
      o.strokeStyle = 'rgba(255,255,255,0.85)';
      o.lineWidth = 1.4;
      o.setLineDash([3, 3]);
      o.beginPath();
      o.arc(this.sx(ui.grabbed.x), this.sy(ui.grabbed.y), Math.max(7, ui.grabbed.r * this.cam.zoom * 2.2), 0, 6.283185307);
      o.stroke();
      o.setLineDash([]);
    }

    /* hovered body readout */
    if (ui.hovered && this.show.labels) {
      var b = ui.hovered;
      var px = this.sx(b.x), py = this.sy(b.y);
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var lines = [
        b.name || (b.kind === 'bh' ? 'black hole' : b.kind),
        'm ' + b.m.toPrecision(4) + '   r ' + b.r.toFixed(2),
        'v ' + sp.toFixed(3)
      ];
      o.font = '11px ui-monospace, Menlo, Consolas, monospace';
      var wBox = 0;
      for (var i = 0; i < lines.length; i++) wBox = Math.max(wBox, o.measureText(lines[i]).width);
      var bx = px + 14, by = py - 12;
      if (bx + wBox + 16 > this.w) bx = px - wBox - 26;
      o.fillStyle = 'rgba(16,19,22,0.88)';
      o.strokeStyle = 'rgba(120,140,160,0.35)';
      o.lineWidth = 1;
      o.beginPath();
      if (o.roundRect) { o.roundRect(bx, by - 13, wBox + 16, 16 * lines.length + 8, 4); }
      else { o.rect(bx, by - 13, wBox + 16, 16 * lines.length + 8); }
      o.fill(); o.stroke();
      for (i = 0; i < lines.length; i++) {
        o.fillStyle = i === 0 ? '#e8873a' : 'rgba(213,218,221,0.92)';
        o.fillText(lines[i], bx + 8, by + 2 + i * 16);
      }
    }

    /* vignette */
    var g = o.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.32,
                                   this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    o.fillStyle = g;
    o.fillRect(0, 0, this.w, this.h);
  };

  /* ── still capture: flatten all three layers ─────────── */

  Renderer.prototype.capture = function (w, h, caption) {
    var out = document.createElement('canvas');
    out.width = w; out.height = h;
    var g = out.getContext('2d');
    var k = w / this.w;
    g.fillStyle = this.style.bg;
    g.fillRect(0, 0, w, h);
    g.drawImage(this.bg, 0, 0, w, h);
    g.drawImage(this.scene, 0, 0, w, h);
    g.drawImage(this.overlay, 0, 0, w, h);
    if (caption) {
      g.font = '600 ' + Math.round(13 * Math.max(1, k)) + 'px ui-sans-serif, system-ui, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.72)';
      g.fillText(caption, 16 * Math.max(1, k), h - 16 * Math.max(1, k));
    }
    return out;
  };

  global.LabRenderer = {
    Renderer: Renderer,
    GROUP_COLORS: GROUP_COLORS,
    ramp: ramp
  };
})(typeof window !== 'undefined' ? window : globalThis);
