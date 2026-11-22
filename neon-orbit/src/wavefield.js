/**
 * NEON ORBIT — wavefield.js
 *
 * Station 04. A lattice of points, each anchored to a rest position and pulled
 * back by a spring. Two forces act on it:
 *
 *   1. a travelling wave — three summed sines whose phase advances with time,
 *      so the surface undulates continuously with no input at all;
 *   2. your pointer — injects velocity, and the spring relaxes it back.
 *
 * Points are batched into three fills by displacement, so ~9k points cost three
 * paths per frame. Squares rather than arcs: at this size they're
 * indistinguishable and roughly 4x cheaper to rasterise.
 *
 * Palette: rest ink is Iris, excited ink is Fuschia — the library's two families.
 */

const IRIS = [93, 95, 239];
const FUSCHIA = [239, 93, 168];
const ICE = [158, 235, 255];

export function createWavefield(canvas, options = {}) {
  const low = options.low === true;
  const reduced = options.reduced === true;
  const ctx = canvas.getContext('2d', { alpha: true });

  let w = 0, h = 0, dpr = 1;
  let cols = 0, rows = 0, count = 0, step = 16;

  let px, py, vx, vy, ox, oy;

  const pointer = { x: -9999, y: -9999, active: false, down: false, vx: 0, vy: 0 };
  let energy = 0;
  let hintUsed = false;
  const onHintUsed = options.onHintUsed || (() => {});

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = low ? 5200 : 9200;
    step = Math.max(7, Math.round(Math.sqrt((w * h) / target)));
    cols = Math.ceil(w / step) + 1;
    rows = Math.ceil(h / step) + 1;
    count = cols * rows;

    px = new Float32Array(count);
    py = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    ox = new Float32Array(count);
    oy = new Float32Array(count);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        ox[k] = i * step;
        oy[k] = j * step;
        px[k] = ox[k];
        py[k] = oy[k];
      }
    }
  }

  /* -------------------------------------------------------------- physics */

  // Three travelling waves at different angles and speeds. Displacement is a
  // composite of all three so the motion never looks like a single sine.
  const WAVES = [
    { ax: 0.0121, ay: 0.0026, sp: 0.75, amp: 3.4 },
    { ax: -0.0042, ay: 0.0164, sp: 1.05, amp: 2.6 },
    { ax: 0.0210, ay: -0.0118, sp: 0.45, amp: 1.7 },
  ];

  function tick(dt, time) {
    const stiffness = 46;
    const damping = 4.4;
    const pointerRadius = Math.max(64, step * 4.6);
    const r2 = pointerRadius * pointerRadius;
    const force = pointer.active ? (pointer.down ? 2.6 : 1.5) : 0;
    const motionScale = reduced ? 0.28 : 1;

    let total = 0;

    for (let k = 0; k < count; k++) {
      const bx = ox[k];
      const by = oy[k];

      // target = rest + travelling wave
      let tx = 0;
      let ty = 0;
      for (let i = 0; i < WAVES.length; i++) {
        const wv = WAVES[i];
        const phase = bx * wv.ax + by * wv.ay + time * wv.sp;
        const s = Math.sin(phase);
        tx += s * wv.amp * wv.ax * 90;
        ty += s * wv.amp * wv.ay * 90;
        // the second harmonic gives the surface a bit of grit
        ty += Math.sin(phase * 1.7 + 1.1) * wv.amp * 0.16;
      }
      tx *= motionScale;
      ty *= motionScale;

      const targetX = bx + tx;
      const targetY = by + ty;

      // spring toward the travelling target
      vx[k] += (targetX - px[k]) * stiffness * dt;
      vy[k] += (targetY - py[k]) * stiffness * dt;

      if (force > 0) {
        const ddx = px[k] - pointer.x;
        const ddy = py[k] - pointer.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 0.0001;
          const falloff = 1 - d / pointerRadius;
          const push = falloff * falloff * force * 520;
          vx[k] += (ddx / d) * push * dt + pointer.vx * falloff * 0.9;
          vy[k] += (ddy / d) * push * dt + pointer.vy * falloff * 0.9;
        }
      }

      vx[k] *= 1 - damping * dt;
      vy[k] *= 1 - damping * dt;

      px[k] += vx[k] * dt;
      py[k] += vy[k] * dt;

      total += Math.abs(vx[k]) + Math.abs(vy[k]);
    }

    energy = total / (count * 90);
    pointer.vx *= 0.86;
    pointer.vy *= 0.86;
  }

  /* ---------------------------------------------------------------- paint */

  function paint() {
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w * 0.5, h * 1.08, 0, w * 0.5, h * 1.08, Math.max(w, h) * 0.95);
    bg.addColorStop(0, 'rgba(93,95,239,0.16)');
    bg.addColorStop(0.55, 'rgba(60,40,110,0.06)');
    bg.addColorStop(1, 'rgba(4,5,10,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const mix = t => [
      Math.round(IRIS[0] + (FUSCHIA[0] - IRIS[0]) * t),
      Math.round(IRIS[1] + (FUSCHIA[1] - IRIS[1]) * t),
      Math.round(IRIS[2] + (FUSCHIA[2] - IRIS[2]) * t),
    ];

    const size = Math.max(1.1, step * 0.155);
    const buckets = [
      { lo: 0, hi: 2.4, color: mix(0), alpha: 0.30 },
      { lo: 2.4, hi: 12, color: mix(0.5), alpha: 0.66 },
      { lo: 12, hi: Infinity, color: mix(1), alpha: 0.95 },
    ];

    for (const b of buckets) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.alpha})`;
      let drawn = 0;
      for (let k = 0; k < count; k++) {
        const d = Math.abs(px[k] - ox[k]) + Math.abs(py[k] - oy[k]);
        if (d >= b.lo && d < b.hi) {
          const s = size * (1 + Math.min(1.9, d * 0.22));
          ctx.rect(px[k] - s * 0.5, py[k] - s * 0.5, s, s);
          drawn++;
        }
      }
      if (drawn) ctx.fill();
    }

    // pointer reticle
    if (pointer.active) {
      const r = pointer.down ? 36 : 26;
      ctx.beginPath();
      ctx.strokeStyle = pointer.down
        ? `rgba(${FUSCHIA.join(',')},0.8)`
        : `rgba(${ICE.join(',')},0.38)`;
      ctx.lineWidth = 1;
      ctx.arc(pointer.x, pointer.y, r, 0, 6.2832);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = `rgba(${ICE.join(',')},0.95)`;
      ctx.rect(pointer.x - 1, pointer.y - 1, 2, 2);
      ctx.fill();
    }

    canvas.dataset.energy = energy.toFixed(3);
  }

  /* ----------------------------------------------------------------- loop */

  let raf = 0;
  let last = 0;
  let elapsed = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    elapsed += dt;
    tick(dt, elapsed);
    paint();
  }

  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  /* ---------------------------------------------------------------- input */

  const localPoint = ev => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  const markUsed = () => {
    if (!hintUsed) { hintUsed = true; onHintUsed(); }
  };

  canvas.addEventListener('pointermove', ev => {
    const p = localPoint(ev);
    if (pointer.active) {
      pointer.vx = (p.x - pointer.x) * 0.32;
      pointer.vy = (p.y - pointer.y) * 0.32;
    }
    pointer.x = p.x; pointer.y = p.y; pointer.active = true;
    if (ev.pointerType === 'touch') markUsed();
  }, { passive: true });

  canvas.addEventListener('pointerdown', ev => {
    canvas.setPointerCapture?.(ev.pointerId);
    const p = localPoint(ev);
    pointer.x = p.x; pointer.y = p.y;
    pointer.active = true; pointer.down = true;
    markUsed();

    const r = Math.max(110, step * 8);
    for (let k = 0; k < count; k++) {
      const dx = px[k] - p.x, dy = py[k] - p.y;
      const d = Math.hypot(dx, dy);
      if (d < r) {
        const f = (1 - d / r) * 30;
        vx[k] += (dx / (d || 1)) * f;
        vy[k] += (dy / (d || 1)) * f;
      }
    }
  });

  const release = () => { pointer.down = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { pointer.active = false; pointer.down = false; });

  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', ev => {
    if (ev.code === 'Space' || ev.key === ' ') { ev.preventDefault(); reset(); }
  });

  function reset() {
    for (let k = 0; k < count; k++) { vx[k] = 0; vy[k] = 0; px[k] = ox[k]; py[k] = oy[k]; }
    energy = 0;
  }

  /* ------------------------------------------------------------------ api */

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  };
  window.addEventListener('resize', onResize);

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(e => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0.02 })
    : null;

  return {
    mount() {
      build();
      reset();
      if (io) io.observe(canvas); else start();
    },
    unmount() { stop(); if (io) io.unobserve(canvas); window.removeEventListener('resize', onResize); },
    reset,
    get energy() { return energy; },
    get count() { return count; },
  };
}
