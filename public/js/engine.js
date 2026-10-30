/* ═══════════════════════════════════════════════════════════════════
   engine.js — the cosmos itself
   Canvas 2D pseudo-3D star engine. No dependencies, no WebGL, no mercy.
   ═══════════════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;

export const PALETTE = [
  '#7cf3ff', '#8b5cf6', '#ff5ea8', '#ffd166',
  '#4ade80', '#38bdf8', '#f472b6', '#a3e635',
  '#fb923c', '#e879f9', '#2dd4bf', '#fca5a5',
  '#c4b5fd', '#67e8f9', '#fde68a', '#86efac',
];

const NAMED_LAYOUTS = ['galaxy', 'helix', 'halo'];
/* the shape of the spiral — shared by the star placement and the arm haze */
const GALAXY = { arms: 2, turns: 1.9, jitter: 0.17, core: 0.075, spread: 0.99 };
const HELIX = { turns: 5.5, radius: 0.38, span: 2.35 };
/* each shape wants to be looked at from somewhere specific */
const CAMERA_HOME = {
  galaxy: { yaw: -0.62, pitch: 0.52, dist: 3.0 },
  helix: { yaw: -0.16, pitch: 0.15, dist: 2.7 },
  halo: { yaw: -0.42, pitch: 0.74, dist: 3.0 },
};
export const LAYOUT_LABELS = { galaxy: 'GALAXY', helix: 'HELIX', halo: 'HALO' };

/* ── small helpers ────────────────────────────────────────────────── */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** deterministic pseudo-random in [0,1) from a string + salt */
function rnd(str, salt = 0) {
  return ((hashString(str + '#' + salt) % 100000) / 100000);
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/* ── sprite cache ─────────────────────────────────────────────────── */

const spriteCache = new Map();

function starSprite(color) {
  let s = spriteCache.get(color);
  if (s) return s;
  const size = 96;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const [r, gg, b] = hexToRgb(color);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.1, `rgba(255,255,255,0.9)`);
  grad.addColorStop(0.16, `rgba(${r},${gg},${b},0.82)`);
  grad.addColorStop(0.3, `rgba(${r},${gg},${b},0.3)`);
  grad.addColorStop(0.55, `rgba(${r},${gg},${b},0.07)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  spriteCache.set(color, c);
  return c;
}

/* ═══════════════════════════════════════════════════════════════════
   Cosmos
   ═══════════════════════════════════════════════════════════════════ */

export class Cosmos {
  constructor({ bgCanvas, fxCanvas, onIgnite, onTick, onHover, onSelect }) {
    this.bg = bgCanvas;
    this.fx = fxCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    this.ctx = fxCanvas.getContext('2d');

    this.onIgnite = onIgnite || (() => {});
    this.onTick = onTick || (() => {});
    this.onHover = onHover || (() => {});
    this.onSelect = onSelect || (() => {});

    this.commits = [];
    this.authors = [];
    this.layout = 'galaxy';

    // camera
    this.yaw = -0.62;
    this.pitch = 0.52;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.camEase = false;
    this.dist = 3.0;
    this.targetDist = 3.0;
    this.autoRotate = true;

    // playback
    this.playT = 1;
    this.playing = false;
    this.speed = 1;
    this.warp = false;
    this.duration = 18; // seconds for a full pass at 1×
    this.bornAt = new Map();

    // pointer
    this.drag = null;
    this.lastPointer = { x: 0, y: 0 };
    this.hovered = null;
    this.selected = null;
    this.projected = [];
    this.lastFrame = performance.now();
    this.idleSince = performance.now();
    this.w = 0;
    this.h = 0;
    this.dpr = 1;

    this._bindEvents();
    this._loop = this._loop.bind(this);
    this.resize();
    requestAnimationFrame(this._loop);
  }

  /* ── data ─────────────────────────────────────────────────────── */

  setData(payload) {
    const commits = (payload.commits || []).filter((c) => c.date);
    this.raw = payload;

    // assign a colour per author, in order of first appearance
    const order = [];
    const seen = new Set();
    for (const c of commits) {
      const key = c.login || c.authorName || 'anonymous';
      if (!seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    }
    const colorFor = new Map();
    order.forEach((key, i) => colorFor.set(key, PALETTE[i % PALETTE.length]));

    this.authors = order.map((key) => ({
      key,
      color: colorFor.get(key),
      count: 0,
      login: key,
    }));

    const minDate = commits.length ? commits[0].date : Date.now();
    const maxDate = commits.length ? commits[commits.length - 1].date : Date.now();
    const span = Math.max(1, maxDate - minDate);

    // burst detection: commits landing on the same day are bigger
    const dayCounts = new Map();
    for (const c of commits) {
      const day = Math.floor(c.date / 86400000);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    this.commits = commits.map((c, i) => {
      const key = c.login || c.authorName || 'anonymous';
      const authorIdx = order.indexOf(key);
      const t = clamp((c.date - minDate) / span, 0, 1);
      const day = Math.floor(c.date / 86400000);
      const burst = dayCounts.get(day) || 1;
      const msgLen = (c.message || '').length;

      const a = {
        ...c,
        index: i,
        t,
        key,
        authorIdx,
        color: colorFor.get(key),
        seed: rnd(c.sha, 1),
        seed2: rnd(c.sha, 2),
        seed3: rnd(c.sha, 3),
        weight:
          2.5 +
          Math.min(3.6, msgLen / 26) +
          (c.isMerge ? 0.9 : 0) +
          Math.min(2.2, (burst - 1) * 0.32),
        r: 0, g: 0, b: 0,
      };
      const rgb = hexToRgb(a.color);
      a.r = rgb[0];
      a.g = rgb[1];
      a.b = rgb[2];
      return a;
    });

    for (const a of this.authors) {
      a.count = this.commits.filter((c) => c.key === a.key).length;
      const sample = this.commits.find((c) => c.key === a.key);
      a.avatar = sample?.avatar || null;
    }
    this.authors.sort((x, y) => y.count - x.count);

    this.minDate = minDate;
    this.maxDate = maxDate;
    this.duration = clamp(this.commits.length * 0.075, 8, 34);

    this.layoutPositions();
    this.flyHome(true);
    this.setPlayT(1);
    this.hovered = null;
    this.selected = null;
    this.drawSparkline();
  }

  applyLayout() {
    this.layoutPositions();
  }

  setLayout(name) {
    const idx = NAMED_LAYOUTS.indexOf(name);
    this.layout = NAMED_LAYOUTS[idx < 0 ? 0 : idx];
    this.layoutPositions();
    this.flyHome();
    return this.layout;
  }

  /** ease the camera to the angle that shows this layout best */
  flyHome(instant = false) {
    const home = CAMERA_HOME[this.layout] || CAMERA_HOME.galaxy;
    this.targetYaw = home.yaw;
    this.targetPitch = home.pitch;
    this.targetDist = home.dist;
    this.camEase = true;
    this.idleSince = performance.now();
    if (instant) {
      this.yaw = home.yaw;
      this.pitch = home.pitch;
      this.dist = home.dist;
      this.camEase = false;
    }
  }

  cycleLayout() {
    const i = NAMED_LAYOUTS.indexOf(this.layout);
    return this.setLayout(NAMED_LAYOUTS[(i + 1) % NAMED_LAYOUTS.length]);
  }

  /* ── layouts ──────────────────────────────────────────────────── */

  layoutPositions() {
    const list = this.commits;
    if (!list.length) return;

    for (const c of list) {
      const t = c.t;
      const j1 = c.seed - 0.5;
      const j2 = c.seed2 - 0.5;
      const j3 = c.seed3 - 0.5;

      if (this.layout === 'galaxy') {
        const arm = c.authorIdx % GALAXY.arms;
        const angle =
          t * TAU * GALAXY.turns + arm * (TAU / GALAXY.arms) + j1 * GALAXY.jitter;
        const radius = GALAXY.core + Math.pow(t, 0.88) * GALAXY.spread + j3 * 0.05;
        c.x = Math.cos(angle) * radius + j3 * 0.03;
        c.z = Math.sin(angle) * radius + j1 * 0.03;
        c.y = j2 * 0.2 * (1 - 0.55 * t);
      } else if (this.layout === 'helix') {
        const a = t * TAU * HELIX.turns + j1 * 0.22;
        c.x = (t - 0.5) * HELIX.span;
        c.y = Math.sin(a) * HELIX.radius + j2 * 0.1;
        c.z = Math.cos(a) * HELIX.radius + j3 * 0.1;
      } else {
        // halo — one ring per ~equal slice of history
        const rings = 7;
        const band = Math.min(rings - 1, Math.floor(t * rings));
        const radius = 0.26 + band * 0.125 + j1 * 0.02;
        const angle = c.seed2 * TAU + band * 0.6;
        c.x = Math.cos(angle) * radius;
        c.z = Math.sin(angle) * radius;
        c.y = j3 * 0.07;
      }
    }
  }

  /* ── playback ─────────────────────────────────────────────────── */

  play() {
    if (!this.commits.length) return;
    if (this.playT >= 0.999) this.setPlayT(0);
    this.playing = true;
    this.lastFrame = performance.now();
  }

  pause() {
    this.playing = false;
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
    return this.playing;
  }

  setPlayT(t) {
    const prev = this.playT;
    this.playT = clamp(t, 0, 1);
    if (this.playT < prev) {
      // rewinding: stars beyond the new playhead un-ignite
      for (const [c] of this.bornAt) {
        if (c.t > this.playT) this.bornAt.delete(c);
      }
    }
    this.onTick(this.playT, this.currentDate());
  }

  step(n) {
    if (!this.commits.length) return;
    this.playing = false;
    // find next commit boundary
    const cur = this.playT;
    const dir = n > 0 ? 1 : -1;
    let target = cur;
    const sorted = this.commits;
    if (dir > 0) {
      const next = sorted.find((c) => c.t > cur + 1e-4);
      target = next ? next.t : 1;
    } else {
      const prev = [...sorted].reverse().find((c) => c.t < cur - 1e-4);
      target = prev ? prev.t : 0;
    }
    this.setPlayT(target);
  }

  currentDate() {
    if (!this.commits.length) return null;
    const t = this.playT;
    const idx = clamp(Math.floor(t * (this.commits.length - 1)), 0, this.commits.length - 1);
    // interpolate between neighbouring commits for a smooth clock
    const a = this.commits[idx];
    const b = this.commits[Math.min(this.commits.length - 1, idx + 1)];
    const localT = t * (this.commits.length - 1) - idx;
    const base = lerp(a.date, b.date, clamp(localT, 0, 1));
    return clamp(base, this.minDate, this.maxDate);
  }

  setSpeed(s) {
    this.speed = s;
  }

  setWarp(on) {
    this.warp = on;
  }

  /* ── camera ───────────────────────────────────────────────────── */

  resetCamera() {
    this.yaw = -0.62;
    this.pitch = 0.52;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.camEase = false;
    this.targetDist = 3.0;
  }

  /* ── rendering ────────────────────────────────────────────────── */

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    for (const c of [this.bg, this.fx]) {
      c.width = Math.floor(this.w * this.dpr);
      c.height = Math.floor(this.h * this.dpr);
      c.style.width = this.w + 'px';
      c.style.height = this.h + 'px';
    }
    this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paintBackground();
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  paintBackground() {
    const { bgCtx: g, w, h } = this;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    // deep base
    g.fillStyle = '#05030e';
    g.fillRect(0, 0, w, h);

    // nebula washes
    const washes = [
      [0.5, 0.48, 0.62, 'rgba(88, 48, 168, 0.30)'],
      [0.29, 0.32, 0.45, 'rgba(26, 92, 138, 0.20)'],
      [0.74, 0.66, 0.42, 'rgba(160, 40, 110, 0.18)'],
      [0.52, 0.7, 0.55, 'rgba(40, 30, 120, 0.24)'],
    ];
    for (const [cx, cy, r, color] of washes) {
      const grad = g.createRadialGradient(
        cx * w, cy * h, 0,
        cx * w, cy * h, Math.max(w, h) * r
      );
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(5,3,14,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }

    // dust stars — three depth tiers
    const area = w * h;
    const paintDust = (count, sizeMax, alpha, tint) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * sizeMax + 0.25;
        const a = alpha * (0.35 + Math.random() * 0.65);
        g.fillStyle = `rgba(${tint},${a.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
    };
    paintDust(Math.min(1500, Math.round(area / 1400)), 1.0, 0.55, '210,225,255');
    paintDust(Math.min(320, Math.round(area / 9000)), 1.7, 0.42, '255,236,200');
    paintDust(40, 2.2, 0.5, '150,230,255');

    // a few big soft bokeh blobs
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 60 + Math.random() * 120;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const hue = ['124,243,255', '139,92,246', '255,94,168'][i % 3];
      grad.addColorStop(0, `rgba(${hue},0.055)`);
      grad.addColorStop(1, `rgba(${hue},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
  }

  project(c) {
    const cosY = this.cosYaw, sinY = this.sinYaw;
    const cosX = this.cosPitch, sinX = this.sinPitch;

    // yaw around Y
    const x1 = c.x * cosY - c.z * sinY;
    const z1 = c.x * sinY + c.z * cosY;
    // pitch around X
    const y2 = c.y * cosX - z1 * sinX;
    const z2 = c.y * sinX + z1 * cosX;

    const d = this.dist - z2;
    if (d < 0.2) return null;
    const scale = this.focal / d;
    return {
      sx: this.cx + x1 * scale,
      sy: this.cy + y2 * scale,
      depth: z2,
      scale,
      persp: clamp(3.0 / d, 0.4, 2.2),
    };
  }

  _loop(now) {
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;

    // camera easing
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 0.009);
    if (this.camEase && !this.drag) {
      const k = Math.min(1, dt * 0.0045);
      this.yaw += (this.targetYaw - this.yaw) * k;
      this.pitch += (this.targetPitch - this.pitch) * k;
      if (
        Math.abs(this.targetYaw - this.yaw) < 0.0025 &&
        Math.abs(this.targetPitch - this.pitch) < 0.0025
      ) {
        this.camEase = false;
      }
    } else if (this.autoRotate && !this.drag && now - this.idleSince > 1600) {
      this.yaw += dt * 0.000085;
      this.targetYaw = this.yaw;
    }
    this.cosYaw = Math.cos(this.yaw);
    this.sinYaw = Math.sin(this.yaw);
    this.cosPitch = Math.cos(this.pitch);
    this.sinPitch = Math.sin(this.pitch);
    this.cx = this.w / 2;
    this.cy = this.h * 0.49;
    this.focal = Math.min(this.w, this.h) * 1.3;

    // advance playback
    if (this.playing) {
      const rate = this.speed * (this.warp ? 7 : 1);
      const next = this.playT + dt / 1000 / this.duration * rate;
      const prev = this.playT;
      this.playT = Math.min(1, next);
      this._igniteBetween(prev, this.playT, now);
      this.onTick(this.playT, this.currentDate());
      if (this.playT >= 1) this.playing = false;
    } else if (this.warp) {
      // warp while paused = slow cinematic drift of the current frame
      this.yaw += dt * 0.0004;
    }

    this.render(now);
    requestAnimationFrame(this._loop);
  }

  _igniteBetween(prev, next, now) {
    for (const c of this.commits) {
      if (c.t > prev && c.t <= next && !this.bornAt.has(c)) {
        this.bornAt.set(c, now);
        this.onIgnite(c, this.commits.indexOf(c));
      }
    }
  }

  render(now) {
    const ctx = this.ctx;
    const { w, h } = this;

    // ── motion-blur trail fade ──
    // destination-out erases alpha so the nebula layer underneath shines through
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = this.warp ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, 0, w, h);

    if (!this.commits.length) {
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    const proj = [];
    for (const c of this.commits) {
      const p = this.project(c);
      if (p) proj.push({ c, ...p });
    }
    proj.sort((a, b) => a.depth - b.depth);
    this.projected = proj;

    // ── guides ──
    this.drawGuides(ctx, proj);

    // ── stars, additive ──
    ctx.globalCompositeOperation = 'lighter';

    for (const p of proj) {
      const c = p.c;
      const born = this.bornAt.get(c);
      const isBorn = this.playT >= 0.9999 || c.t <= this.playT + 1e-6;

      let alpha;
      if (isBorn) {
        alpha = 0.8;
        if (born) {
          const age = (now - born) / 620;
          if (age < 1) alpha = lerp(1.9, 0.92, Math.pow(age, 0.5));
        }
      } else {
        alpha = 0.075; // unborn ghosts — keeps the galaxy's silhouette visible
      }

      if (this.muted && this.muted.has(c.key)) alpha *= 0.10;
      const depthBoost = clamp(0.36 + 0.64 * p.persp * 0.78, 0.2, 1.25);
      const size = c.weight * p.scale * 0.0075 * (0.85 + 0.3 * p.persp);
      const R = Math.min(120, size * 1.7);

      const a = clamp(alpha * depthBoost, 0, 1.35);
      ctx.globalAlpha = clamp(a, 0, 1);
      const sprite = starSprite(c.color);
      ctx.drawImage(sprite, p.sx - R, p.sy - R, R * 2, R * 2);

      // hot core
      if (a > 0.5) {
        ctx.globalAlpha = clamp(a * 0.9, 0, 1);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.7, size * 0.28), 0, TAU);
        ctx.fill();
      }

      p.r = R;
      p.size = size;
      p.alpha = a;

      // ignition shockwave
      if (born) {
        const age = (now - born) / 900;
        if (age < 1) {
          const rr = size * 2.4 + age * 34;
          ctx.globalAlpha = (1 - age) * 0.55;
          ctx.strokeStyle = c.color;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, rr, 0, TAU);
          ctx.stroke();
        }
      }
    }

    // ── playback comet ──
    if (this.playT < 0.9999) {
      const head = proj
        .filter((p) => p.c.t <= this.playT + 1e-6)
        .sort((a, b) => b.c.t - a.c.t)[0];
      if (head) this.drawComet(ctx, head, now);
    }

    // ── hover + selection ──
    if (this.hovered) this.drawRing(ctx, this.hovered, '#ffffff', 30, 0.9);
    if (this.selected) this.drawRing(ctx, this.selected, '#7cf3ff', 40, 0.75 + 0.25 * Math.sin(now / 320));

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // ── playhead marker on the disc ──
    this.drawAxisMarker(ctx, now);
  }

  drawRing(ctx, p, color, base, pulse) {
    const now = performance.now();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.globalAlpha = clamp(0.5 * pulse, 0, 1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, base + Math.sin(now / 260) * 2, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = clamp(0.18 * pulse, 0, 1);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, base + 9 + Math.sin(now / 260) * 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawComet(ctx, head, now) {
    const { sx, sy } = head;
    const pulse = 0.75 + 0.25 * Math.sin(now / 180);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.25, 'rgba(124,243,255,0.35)');
    grad.addColorStop(1, 'rgba(124,243,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, 46 * pulse, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180,245,255,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 26 + 6 * pulse, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawGuides(ctx, proj) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (this.layout === 'galaxy') {
      // nebula ribbons painted along each spiral arm — a few stacked strokes
      // of decreasing width and increasing opacity fake a soft gradient.
      const passes = [
        { width: 150, alpha: 0.014, color: '104,132,255' },
        { width: 96, alpha: 0.02, color: '126,120,255' },
        { width: 54, alpha: 0.032, color: '150,138,255' },
        { width: 20, alpha: 0.05, color: '186,170,255' },
      ];
      for (const pass of passes) {
        for (let arm = 0; arm < GALAXY.arms; arm++) {
          ctx.beginPath();
          for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const angle = t * TAU * GALAXY.turns + arm * (TAU / GALAXY.arms);
            const radius = GALAXY.core + Math.pow(t, 0.88) * GALAXY.spread;
            const p = this.project({
              x: Math.cos(angle) * radius,
              y: 0,
              z: Math.sin(angle) * radius,
            });
            if (!p) continue;
            if (i === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.strokeStyle = `rgba(${pass.color},${pass.alpha})`;
          ctx.lineWidth = pass.width;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      // central core glow
      const c = this.project({ x: 0, y: 0, z: 0 });
      if (c) {
        const grad = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, 110);
        grad.addColorStop(0, 'rgba(160,190,255,0.16)');
        grad.addColorStop(1, 'rgba(160,190,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, 110, 0, TAU);
        ctx.fill();
      }
    } else if (this.layout === 'halo') {
      for (let band = 0; band < 7; band++) {
        const radius = 0.26 + band * 0.125;
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const angle = (i / 72) * TAU;
          const p = this.project({
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius,
          });
          if (!p) continue;
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = `rgba(110,150,255,${0.055 + band * 0.008})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (this.layout === 'helix') {
      // the rails of the double helix
      for (const phase of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = 0; i <= 160; i++) {
          const t = i / 160;
          const a = t * TAU * HELIX.turns + phase;
          const p = this.project({
            x: (t - 0.5) * HELIX.span,
            y: Math.sin(a) * HELIX.radius,
            z: Math.cos(a) * HELIX.radius,
          });
          if (!p) continue;
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = 'rgba(110,150,255,0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawAxisMarker(ctx, now) {
    if (this.layout !== 'helix') return;
    const p = this.project({ x: (this.playT - 0.5) * HELIX.span, y: 0, z: 0 });
    if (!p) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(124,243,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - 90);
    ctx.lineTo(p.sx, p.sy + 90);
    ctx.stroke();
    ctx.restore();
  }

  /* ── interaction ──────────────────────────────────────────────── */

  hitTest(x, y) {
    let best = null;
    let bestD = 20; // px
    for (const p of this.projected) {
      if (this.playT < 0.9999 && p.c.t > this.playT + 1e-6) continue;
      const dx = p.sx - x;
      const dy = p.sy - y;
      const d = Math.hypot(dx, dy);
      const thr = Math.max(12, p.r * 0.55);
      if (d < Math.min(bestD, thr)) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  _bindEvents() {
    const el = this.fx;

    el.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: 0 };
      this.camEase = false;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      this.autoRotate = false;
    });

    el.addEventListener('pointermove', (e) => {
      this.lastPointer = { x: e.clientX, y: e.clientY };
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        this.yaw = this.drag.yaw + dx * 0.0052;
        this.pitch = clamp(this.drag.pitch - dy * 0.0042, -1.45, 1.45);
        this.targetYaw = this.yaw;
        this.targetPitch = this.pitch;
        this.hovered = null;
        this.onHover(null, e.clientX, e.clientY);
        return;
      }
      const hit = this.hitTest(e.clientX, e.clientY);
      this.hovered = hit;
      el.classList.toggle('hot', !!hit);
      this.onHover(hit ? hit.c : null, e.clientX, e.clientY);
    });

    const endDrag = (e) => {
      if (!this.drag) return;
      const wasClick = this.drag.moved < 6;
      this.drag = null;
      el.classList.remove('dragging');
      this.idleSince = performance.now();
      if (wasClick) {
        const hit = this.hitTest(e.clientX, e.clientY);
        if (hit) {
          this.selected = hit;
          this.onSelect(hit.c);
        } else {
          this.selected = null;
          this.onSelect(null);
        }
      }
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', () => {
      this.hovered = null;
      this.onHover(null);
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = Math.exp(e.deltaY * 0.0011);
        this.targetDist = clamp(this.targetDist * factor, 1.35, 9);
        this.idleSince = performance.now();
      },
      { passive: false }
    );

    el.addEventListener('dblclick', () => this.resetCamera());

    window.addEventListener('resize', () => this.resize());
  }

  /* ── timeline sparkline ───────────────────────────────────────── */

  drawSparkline() {
    const cv = document.getElementById('tlSpark');
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 600;
    const h = 34;
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!this.commits.length) return;

    const bins = Math.max(40, Math.floor(w / 5));
    const counts = new Array(bins).fill(0);
    for (const c of this.commits) {
      const b = Math.min(bins - 1, Math.floor(c.t * bins));
      counts[b]++;
    }
    const max = Math.max(1, ...counts);

    for (let i = 0; i < bins; i++) {
      const v = counts[i] / max;
      if (!v) continue;
      const bh = Math.max(1.5, v * (h - 4));
      const x = (i / bins) * w;
      const bw = Math.max(1.2, w / bins - 1.1);
      const grad = g.createLinearGradient(0, h - bh, 0, h);
      grad.addColorStop(0, 'rgba(124,243,255,0.85)');
      grad.addColorStop(1, 'rgba(139,92,246,0.18)');
      g.fillStyle = grad;
      g.fillRect(x, h - bh, bw, bh);
    }
  }
}
