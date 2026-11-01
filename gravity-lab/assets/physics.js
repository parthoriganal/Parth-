/* Gravity Lab — the physics core.
   Barnes–Hut quadtree N-body gravity, leapfrog (KDK) integration, inelastic
   merging, and eight hand-tuned astrophysical initial conditions.
   No dependencies, no WebGL, no libraries. Plain ES5-era JavaScript. */

(function (global) {
  'use strict';

  var MAX_DEPTH = 26;          /* quadtree recursion guard for coincident bodies */
  var MAX_BODIES = 8000;       /* hard ceiling so the page never wedges */

  /* ── deterministic PRNG ─────────────────────────────────
     Same seed + same preset ⇒ same universe, every time. */

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRandom(seed, tag) {
    return mulberry32(hashString(String(seed) + '|' + String(tag)));
  }

  /* ── bodies ───────────────────────────────────────────── */

  function Body(x, y, vx, vy, m, r, kind, g) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.ax = 0; this.ay = 0;
    this.m = m;
    this.r = r;
    this.kind = kind || 'dust';   /* star | planet | dust | bh | custom */
    this.g = g || 0;              /* origin group — used for tidal-tail colouring */
    this.alive = true;
    this.trail = null;            /* lazily allocated ring buffer */
    this.tHead = 0;
    this.tLen = 0;
  }

  /* ── Barnes–Hut quadtree ────────────────────────────────
     Nodes come out of a pool that is rewound every build, so a
     60 fps simulation of a few thousand bodies allocates nothing. */

  function QNode() {
    this.x = 0; this.y = 0; this.half = 0;
    this.mass = 0; this.cx = 0; this.cy = 0;
    this.body = null;
    this.c0 = null; this.c1 = null; this.c2 = null; this.c3 = null;
    this.leaf = true;
  }

  var pool = [];
  var poolIdx = 0;
  var nodeCount = 0;

  function alloc(x, y, half) {
    var n = poolIdx < pool.length ? pool[poolIdx] : (pool[poolIdx] = new QNode());
    poolIdx++;
    n.x = x; n.y = y; n.half = half;
    n.mass = 0; n.cx = 0; n.cy = 0;
    n.body = null;
    n.c0 = n.c1 = n.c2 = n.c3 = null;
    n.leaf = true;
    return n;
  }

  function subdivide(n) {
    var h = n.half * 0.5, x = n.x, y = n.y;
    n.c0 = alloc(x - h, y - h, h);   /* SW */
    n.c1 = alloc(x + h, y - h, h);   /* SE */
    n.c2 = alloc(x - h, y + h, h);   /* NW */
    n.c3 = alloc(x + h, y + h, h);   /* NE */
    n.leaf = false;
  }

  function childFor(n, b) {
    var right = b.x >= n.x, up = b.y >= n.y;
    if (right) return up ? n.c3 : n.c1;
    return up ? n.c2 : n.c0;
  }

  function qtInsert(n, b, depth) {
    /* fold this body into the node's centre of mass first */
    var m = n.mass, bm = b.m;
    var tot = m + bm;
    if (tot > 0) {
      n.cx = (n.cx * m + b.x * bm) / tot;
      n.cy = (n.cy * m + b.y * bm) / tot;
    }
    n.mass = tot;

    if (n.leaf) {
      if (n.body === null) { n.body = b; return; }
      if (depth >= MAX_DEPTH) { n.body = null; return; }  /* give up, keep the COM */
      subdivide(n);
      var old = n.body;
      n.body = null;
      qtInsert(childFor(n, old), old, depth + 1);
    }
    qtInsert(childFor(n, b), b, depth + 1);
  }

  function buildTree(bodies) {
    poolIdx = 0;
    var n = bodies.length, i, b;
    if (n === 0) { nodeCount = 0; return null; }

    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.x < minx) minx = b.x;
      if (b.x > maxx) maxx = b.x;
      if (b.y < miny) miny = b.y;
      if (b.y > maxy) maxy = b.y;
    }
    /* A runaway body would stretch the tree into a needle; clamp the span so
       the opening criterion still terminates quickly. */
    var span = Math.max(maxx - minx, maxy - miny);
    if (!(span > 0) || !isFinite(span)) span = 1;
    if (span > 2e6) span = 2e6;

    var half = span * 0.5 + 1e-6;
    var root = alloc((minx + maxx) * 0.5, (miny + maxy) * 0.5, half);
    for (i = 0; i < n; i++) qtInsert(root, bodies[i], 0);
    nodeCount = poolIdx;
    return root;
  }

  /* ── force walk ───────────────────────────────────────── */

  var FORCE_G = 1, FORCE_EPS2 = 1, FORCE_THETA2 = 0.49;
  var stack = [];

  /* Iterative rather than recursive: a 4-way tree walk recurses thousands of
     times per frame, and an explicit stack plus hoisted constants measurably
     beats V8's call overhead here. Empty cells are never pushed. */
  function treeForce(root, b) {
    var sp = 0, ax = 0, ay = 0;
    stack[sp++] = root;
    var bx = b.x, by = b.y;
    while (sp > 0) {
      var n = stack[--sp];
      var dx = n.cx - bx, dy = n.cy - by;
      var d2 = dx * dx + dy * dy;

      if (n.leaf) {
        if (n.body !== b) {
          var t = d2 + FORCE_EPS2;
          var inv = FORCE_G * n.mass / (t * Math.sqrt(t));
          ax += dx * inv; ay += dy * inv;
        }
        continue;
      }

      /* Opening criterion: use the cell's centre of mass as a monopole once it
         is far enough away that (cellSize / distance)² < θ². */
      var s2 = n.half * 2;
      if (s2 * s2 < FORCE_THETA2 * d2) {
        var t2 = d2 + FORCE_EPS2;
        var inv2 = FORCE_G * n.mass / (t2 * Math.sqrt(t2));
        ax += dx * inv2; ay += dy * inv2;
        continue;
      }

      if (n.c0.mass > 0) stack[sp++] = n.c0;
      if (n.c1.mass > 0) stack[sp++] = n.c1;
      if (n.c2.mass > 0) stack[sp++] = n.c2;
      if (n.c3.mass > 0) stack[sp++] = n.c3;
    }
    b.ax = ax; b.ay = ay;
  }

  function computeAccel(st) {
    var bodies = st.bodies, n = bodies.length, i;
    FORCE_EPS2 = st.softening * st.softening;
    FORCE_THETA2 = st.theta * st.theta;
    FORCE_G = st.G;
    var root = st.tree;
    if (!root) { for (i = 0; i < n; i++) { bodies[i].ax = 0; bodies[i].ay = 0; } return; }
    for (i = 0; i < n; i++) treeForce(root, bodies[i]);
  }

  /* ── inelastic merging ──────────────────────────────────
     Uniform spatial hash, so collision detection is O(n) rather than O(n²).
     Momentum and mass are conserved exactly; volume is conserved for radius. */

  function mergePass(st) {
    var bodies = st.bodies, n = bodies.length;
    if (n < 2) return 0;

    var maxR = 0, i, b;
    for (i = 0; i < n; i++) if (bodies[i].r > maxR) maxR = bodies[i].r;
    var cell = Math.max(1e-6, maxR * 2.2);
    var inv = 1 / cell;

    var grid = Object.create(null);
    for (i = 0; i < n; i++) {
      b = bodies[i];
      var key = (Math.floor(b.x * inv) * 73856093) ^ (Math.floor(b.y * inv) * 19349663);
      var bucket = grid[key];
      if (!bucket) grid[key] = bucket = [];
      bucket.push(b);
    }

    var merged = 0;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (!b.alive) continue;
      var gx = Math.floor(b.x * inv), gy = Math.floor(b.y * inv);
      for (var ox = -1; ox <= 1; ox++) {
        for (var oy = -1; oy <= 1; oy++) {
          var bucket2 = grid[((gx + ox) * 73856093) ^ ((gy + oy) * 19349663)];
          if (!bucket2) continue;
          for (var k = 0; k < bucket2.length; k++) {
            var o = bucket2[k];
            if (o === b || !o.alive) continue;
            var dx = o.x - b.x, dy = o.y - b.y;
            var touch = (b.r + o.r) * 0.85;
            if (dx * dx + dy * dy > touch * touch) continue;

            /* heavier body wins and absorbs the lighter one */
            var big = b.m >= o.m ? b : o;
            var small = big === b ? o : b;
            var M = big.m + small.m;
            big.vx = (big.vx * big.m + small.vx * small.m) / M;
            big.vy = (big.vy * big.m + small.vy * small.m) / M;
            big.x = (big.x * big.m + small.x * small.m) / M;
            big.y = (big.y * big.m + small.y * small.m) / M;
            big.r = Math.cbrt(big.r * big.r * big.r + small.r * small.r * small.r);
            big.m = M;
            if (big.kind !== 'bh' && small.kind === 'bh') big.kind = 'bh';
            small.alive = false;
            merged++;
            if (!b.alive) break;
          }
          if (!b.alive) break;
        }
        if (!b.alive) break;
      }
    }

    if (merged) {
      var out = [];
      for (i = 0; i < n; i++) if (bodies[i].alive) out.push(bodies[i]);
      st.bodies = out;
    }
    return merged;
  }

  /* ── integrator: leapfrog KDK ───────────────────────────
     Symplectic, so orbits stay closed over long runs instead of spiralling
     away the way plain Euler would. Accelerations are cached across substeps,
     which makes each step cost exactly one tree build + one force walk. */

  function halfKick(st, h) {
    var bodies = st.bodies, i, b;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      b.vx += b.ax * h;
      b.vy += b.ay * h;
    }
  }

  function drift(st, h) {
    var bodies = st.bodies, i, b;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      b.x += b.vx * h;
      b.y += b.vy * h;
    }
  }

  function pushTrails(st) {
    if (st.trailMode !== 'world') return;
    var bodies = st.bodies, i, b, len = st.trailLen;
    var stride = st.trailStride;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!b.trail) {
        b.trail = new Float32Array(len * 2);
        b.tHead = 0; b.tLen = 0;
        b.tLastX = b.x; b.tLastY = b.y;
      }
      var dx = b.x - b.tLastX, dy = b.y - b.tLastY;
      if (dx * dx + dy * dy < stride * stride) continue;
      b.tLastX = b.x; b.tLastY = b.y;
      b.trail[b.tHead * 2] = b.x;
      b.trail[b.tHead * 2 + 1] = b.y;
      b.tHead = (b.tHead + 1) % len;
      if (b.tLen < len) b.tLen++;
    }
  }

  function stepOnce(st) {
    if (!st.accValid) {
      st.tree = buildTree(st.bodies);
      computeAccel(st);
      st.accValid = true;
    }
    halfKick(st, st.dt * 0.5);
    drift(st, st.dt);
    st.accValid = false;

    if (st.merge) mergePass(st);

    st.tree = buildTree(st.bodies);
    computeAccel(st);
    st.accValid = true;
    halfKick(st, st.dt * 0.5);

    st.time += st.dt;
    st.steps++;
  }

  function step(st) {
    for (var s = 0; s < st.substeps; s++) stepOnce(st);
    pushTrails(st);
  }

  /* ── energies ─────────────────────────────────────────── */

  function kineticEnergy(bodies) {
    var ke = 0;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      ke += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    }
    return ke;
  }

  function momentum(bodies) {
    var px = 0, py = 0;
    for (var i = 0; i < bodies.length; i++) {
      px += bodies[i].m * bodies[i].vx;
      py += bodies[i].m * bodies[i].vy;
    }
    return Math.sqrt(px * px + py * py);
  }

  /* Approximate PE from the same tree walk — recomputed only occasionally. */
  function potentialEnergy(st) {
    var bodies = st.bodies, pe = 0;
    var eps2 = st.softening * st.softening;
    var theta2 = st.theta * st.theta;
    if (!st.tree) return 0;

    function walk(n, b) {
      if (n.mass <= 0) return;
      var dx = n.cx - b.x, dy = n.cy - b.y;
      var d2 = dx * dx + dy * dy;
      if (n.leaf) {
        if (n.body === b) return;
        pe -= st.G * b.m * n.mass / Math.sqrt(d2 + eps2);
        return;
      }
      var s = n.half * 2;
      if (s * s < theta2 * d2) {
        pe -= st.G * b.m * n.mass / Math.sqrt(d2 + eps2);
        return;
      }
      walk(n.c0, b); walk(n.c1, b); walk(n.c2, b); walk(n.c3, b);
    }

    for (var i = 0; i < bodies.length; i++) walk(st.tree, bodies[i]);
    return pe * 0.5;   /* every pair was counted twice */
  }

  function bounds(bodies) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!isFinite(b.x) || !isFinite(b.y)) continue;
      if (b.x < minx) minx = b.x;
      if (b.x > maxx) maxx = b.x;
      if (b.y < miny) miny = b.y;
      if (b.y > maxy) maxy = b.y;
    }
    if (minx === Infinity) return { x: 0, y: 0, w: 100, h: 100 };
    return { x: minx, y: miny, w: Math.max(1e-6, maxx - minx), h: Math.max(1e-6, maxy - miny) };
  }

  /* ── state ────────────────────────────────────────────── */

  function State(opts) {
    opts = opts || {};
    this.bodies = [];
    this.G = opts.G !== undefined ? opts.G : 1;
    this.dt = opts.dt !== undefined ? opts.dt : 0.03;
    this.substeps = opts.substeps !== undefined ? opts.substeps : 3;
    this.theta = opts.theta !== undefined ? opts.theta : 0.7;
    this.softening = opts.softening !== undefined ? opts.softening : 3;
    this.merge = !!opts.merge;
    this.trailMode = opts.trailMode || 'glow';
    this.trailLen = opts.trailLen || 64;
    this.trailSpan = opts.trailSpan || 0;
    this.time = 0;
    this.steps = 0;
    this.tree = null;
    this.accValid = false;
    this.seed = opts.seed || 1;
    this.name = opts.name || 'custom';
    this.colorMode = opts.colorMode || 'speed';
  }

  State.prototype.invalidate = function () { this.accValid = false; };

  /* stride = span / point count: how far a body travels between samples */
  State.prototype.applyTrailSpan = function () {
    this.trailStride = Math.max(1e-4, this.trailSpan / Math.max(4, this.trailLen));
  };

  State.prototype.compact = function () {
    var out = [];
    for (var i = 0; i < this.bodies.length; i++) if (this.bodies[i].alive) out.push(this.bodies[i]);
    this.bodies = out;
    this.accValid = false;
  };

  /* ═══════════════════════════════════════════════════════
     PRESETS — eight real initial conditions
     ═══════════════════════════════════════════════════════ */

  /* Put the barycentre at rest. Without this the whole scene slides across the
     viewport over a few thousand steps, which reads as a bug rather than physics. */
  function removeBulkDrift(bodies) {
    var px = 0, py = 0, M = 0;
    for (var i = 0; i < bodies.length; i++) {
      px += bodies[i].m * bodies[i].vx;
      py += bodies[i].m * bodies[i].vy;
      M += bodies[i].m;
    }
    if (M <= 0) return bodies;
    px /= M; py /= M;
    for (i = 0; i < bodies.length; i++) { bodies[i].vx -= px; bodies[i].vy -= py; }
    return bodies;
  }

  /* Shared helper: circular speed under the *softened* force law.
     Setting a = v²/r with a = GM·r/(r²+ε²)^{3/2} gives
        v = sqrt( GM·r² / (r²+ε²)^{3/2} )
     which reduces to plain Kepler for r ≫ ε but matters a lot for the tight
     satellite orbits — an unsoftened v there is a few percent too fast and
     the moon starts out on an eccentric orbit it never recovers from. */
  function discVelocity(G, mEnc, r, eps) {
    r = Math.max(1e-6, r);
    eps = eps || 0;
    var d2 = r * r + eps * eps;
    return Math.sqrt(G * mEnc * r * r / (d2 * Math.sqrt(d2)));
  }

  /* Put satellites on circular orbits about a host, then shift the host onto
     the subsystem barycentre so the pair does not acquire a phantom kick.
     Only worth doing where the host's Hill sphere, r_H = a(m/3M)^⅓, is wide
     enough to hold them — which for a compressed solar system means Jupiter,
     not Earth. */
  function addMoons(host, defs, G, eps, rnd, out) {
    var hx = host.x, hy = host.y, hvx = host.vx, hvy = host.vy;
    var sx = 0, sy = 0, svx = 0, svy = 0, mm = 0;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i][0], m = defs[i][1], r = defs[i][2], nm = defs[i][3];
      var ang = rnd() * Math.PI * 2;
      var ux = Math.cos(ang), uy = Math.sin(ang);
      var px = -uy, py = ux;                     /* prograde */
      var vRel = discVelocity(G, host.m + m, d, eps);
      sx += m * ux * d;  sy += m * uy * d;
      svx += m * px * vRel;  svy += m * py * vRel;
      mm += m;
      var moon = new Body(hx + ux * d, hy + uy * d,
                          hvx + px * vRel, hvy + py * vRel,
                          m, r, 'planet', host.g);
      moon.name = nm;
      out.push(moon);
    }
    host.x = hx - sx / host.m;      host.y = hy - sy / host.m;
    host.vx = hvx - svx / host.m;   host.vy = hvy - svy / host.m;
    return mm;
  }

  /* 1. Solar system — Sun, eight planets, three Galilean moons, a belt.
     Masses are exaggerated (real Jupiter/Sun is 1:1047, this is 1:200) because
     a true-ratio system is dynamically invisible at this scale, but they are
     kept low enough that secular perturbations do not pump the inner planets
     onto visibly eccentric orbits. */
  function solar(seed, scale) {
    var rnd = makeRandom(seed, 'solar');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, M = 4000, EPS = 0.45;
    var bodies = [new Body(0, 0, 0, 0, M, 13, 'star', 0)];
    bodies[0].name = 'Sun';

    /* name, a, mass, drawn radius */
    var planets = [
      ['Mercury',  42,  0.05, 1.4],
      ['Venus',    60,  0.40, 2.1],
      ['Earth',    82,  0.45, 2.2],
      ['Mars',    108,  0.15, 1.7],
      ['Jupiter', 210, 45.00, 6.4],
      ['Saturn',  320, 15.00, 5.6],
      ['Uranus',  450,  0.90, 3.6],
      ['Neptune', 560,  1.10, 3.6]
    ];
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      var a = p[1] * (1 + (rnd() - 0.5) * 0.01);
      var th = rnd() * Math.PI * 2;
      var v = discVelocity(G, M, a, EPS);
      var pl = new Body(
        Math.cos(th) * a, Math.sin(th) * a,
        -Math.sin(th) * v, Math.cos(th) * v,
        p[2], p[3], 'planet', i + 1
      );
      pl.name = p[0];
      bodies.push(pl);
    }

    /* Jupiter's Hill sphere is r_H = a(m/3M)^⅓ ≈ 33 at a = 210. Prograde
       satellites are only stable inside ~0.49 r_H (Hamilton & Burns 1992) —
       an earlier build put Ganymede at 0.56 r_H and the Sun stripped it after
       about 1200 steps, exactly as that limit predicts. A second build at
       0.44 r_H survived but the solar tide pumped its eccentricity to 0.10 —
       the tide scales as (d/r_H)³, so it is not a small perturbation out
       there. These sit at 0.25, 0.33 and 0.40. Earth's Hill sphere is under
       a unit at this mass scale,
       so a Luna would not survive; the moons live on Jupiter instead. */
    addMoons(bodies[5], [
      [8.0,  0.010, 0.44, 'Io'],
      [10.6, 0.008, 0.40, 'Europa'],
      [13.2, 0.014, 0.54, 'Ganymede']
    ], G, EPS, rnd, bodies);

    /* Asteroid belt between Mars and Jupiter. */
    var belt = Math.round(420 * scale);
    for (var k = 0; k < belt; k++) {
      var rr = 138 + Math.pow(rnd(), 0.8) * 42;
      var t2 = rnd() * Math.PI * 2;
      var vv = discVelocity(G, M, rr, EPS) * (1 + (rnd() - 0.5) * 0.03);
      bodies.push(new Body(
        Math.cos(t2) * rr, Math.sin(t2) * rr,
        -Math.sin(t2) * vv, Math.cos(t2) * vv,
        0.002, 0.40, 'dust', 8
      ));
    }

    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.012, substeps: 3, softening: EPS,
      merge: false, name: 'Solar System', colorMode: 'group', trailMode: 'glow', particles: 420, viewSpan: 1180, trailSpan: 70,
      blurb: 'A Sun, eight planets, three Galilean moons and 420 belt rocks on softened-Keplerian circular orbits. Zoom into Jupiter to watch its moons; then throw a black hole through the belt and see what survives.'
    };
  }

  /* 2. Binary stars with a circumbinary debris disc. */
  function binary(seed, scale) {
    var rnd = makeRandom(seed, 'binary');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, m = 900, d = 150;
    var v = Math.sqrt(G * m / (2 * d));
    var bodies = [
      new Body(-d / 2, 0, 0, -v, m, 11, 'star', 0),
      new Body(d / 2, 0, 0, v, m, 9, 'star', 1)
    ];

    for (var i = 0; i < Math.round(700 * scale); i++) {
      var rr = 300 + Math.pow(rnd(), 0.7) * 460;
      var t = rnd() * Math.PI * 2;
      var vv = discVelocity(G, 2 * m, rr, 3) * (1 + (rnd() - 0.5) * 0.05);
      bodies.push(new Body(
        Math.cos(t) * rr, Math.sin(t) * rr,
        -Math.sin(t) * vv, Math.cos(t) * vv,
        0.02, 0.7, 'dust', 2
      ));
    }

    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.05, substeps: 3, softening: 3,
      merge: false, name: 'Binary Stars', colorMode: 'group', trailMode: 'glow', particles: 700, viewSpan: 1500, trailSpan: 140,
      blurb: 'Two 900-mass stars in a close circular binary, ringed by a circumbinary disc. The inner disc is unstable \u2014 you can see it clear a gap.'
    };
  }

  /* 3. Galaxy collision — the Toomre & Toomre money shot. */
  function galaxies(seed, scale) {
    var rnd = makeRandom(seed, 'galaxies');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1;

    function galaxy(cx, cy, vx, vy, bulgeM, nStars, rIn, rOut, g, tilt) {
      var out = [];
      var discM = nStars * 1.2;
      out.push(new Body(cx, cy, vx, vy, bulgeM, 9, 'star', g));

      for (var i = 0; i < nStars; i++) {
        var rr = rIn + Math.pow(rnd(), 0.75) * (rOut - rIn);
        var t = rnd() * Math.PI * 2;
        var frac = (rr - rIn) / (rOut - rIn);
        var mEnc = bulgeM + discM * Math.min(1, frac);
        var vv = discVelocity(G, mEnc, rr, 4) * (1 + (rnd() - 0.5) * 0.06);
        /* elliptical-ish tilt so the disc reads as inclined, not a perfect ring */
        var sx = Math.cos(tilt), sy = Math.sin(tilt);
        var px = Math.cos(t) * rr, py = Math.sin(t) * rr * 0.86;
        var rx = px * sx - py * sy, ry = px * sy + py * sx;
        var dvx = -Math.sin(t) * vv, dvy = Math.cos(t) * vv * 0.86;
        var rvx = dvx * sx - dvy * sy, rvy = dvx * sy + dvy * sx;
        out.push(new Body(cx + rx, cy + ry, vx + rvx, vy + rvy, 1.2, 1.1, 'dust', g));
      }
      return out;
    }

    var sep = 900, ip = 170, sp = 2.35;
    var nA = Math.round(620 * scale), nB = Math.round(520 * scale);
    var bodies = galaxy(-sep / 2, -ip / 2, sp, 0.35, 2200, nA, 40, 210, 0, 0.22)
      .concat(galaxy(sep / 2, ip / 2, -sp, -0.15, 1800, nB, 35, 180, 1, -0.5));

    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.06, substeps: 3, softening: 4,
      merge: false, name: 'Galaxy Collision', colorMode: 'group', trailMode: 'glow', particles: 1140, viewSpan: 1500, trailSpan: 110,
      blurb: 'Two disc galaxies, 1140 stars between them, on a prograde off-centre pass. Long tidal tails rip out on first approach \u2014 colour by group and watch them braid.'
    };
  }

  /* 4. The figure-eight — Chenciner & Montgomery's exact three-body
        choreography. Three equal masses chasing each other round one closed
        curve. Scaled from the canonical G = m = 1 solution. */
  function figure8(seed, scale) {
    var P = [
      [-0.97000436, 0.24308753],
      [0.97000436, -0.24308753],
      [0, 0]
    ];
    var V = [
      [0.4662036850, 0.4323657300],
      [0.4662036850, 0.4323657300],
      [-0.9324073700, -0.8647314600]
    ];
    var s = 62;                 /* world units for the canonical unit length */
    var G = 1;
    var m = s * s * s / G;      /* chosen so the period stays a few seconds */
    var vs = Math.sqrt(G * m / s);

    var bodies = [];
    for (var i = 0; i < 3; i++) {
      bodies.push(new Body(P[i][0] * s, P[i][1] * s, V[i][0] * vs, V[i][1] * vs, m, 1.1, 'star', i));
    }
    return {
      bodies: bodies, G: G, dt: 0.0022, substeps: 4, softening: 0.35,
      merge: false, name: 'Figure-Eight', colorMode: 'group', trailMode: 'world', particles: 0, viewSpan: 150, trailSpan: 620,
      blurb: 'A proven solution to the three-body problem: three equal masses on one closed curve, chasing each other forever. Turn on world-space trails and it draws itself.'
    };
  }

  /* 5. Black hole with an accretion disc. */
  function blackhole(seed, scale) {
    var rnd = makeRandom(seed, 'blackhole');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, M = 26000;
    var bodies = [new Body(0, 0, 0, 0, M, 15, 'bh', 0)];

    for (var i = 0; i < Math.round(1400 * scale); i++) {
      var rr = 55 + Math.pow(rnd(), 0.62) * 520;
      var t = rnd() * Math.PI * 2;
      var vk = discVelocity(G, M, rr, 2);
      /* slightly sub-Keplerian: the disc loses support and spirals inward */
      var vv = vk * (0.955 + rnd() * 0.035);
      var jitter = (rnd() - 0.5) * vk * 0.03;
      bodies.push(new Body(
        Math.cos(t) * rr, Math.sin(t) * rr,
        -Math.sin(t) * vv - Math.cos(t) * jitter,
        Math.cos(t) * vv - Math.sin(t) * jitter,
        0.05, 0.85, 'dust', 1 + (i % 3)
      ));
    }

    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.026, substeps: 3, softening: 2,
      merge: true, name: 'Black Hole', colorMode: 'speed', trailMode: 'glow', particles: 1400, viewSpan: 760, trailSpan: 130,
      blurb: 'A 26,000-mass hole with a deliberately sub-Keplerian disc. Matter loses support, spirals in and is swallowed \u2014 merging is on, so the hole grows. Colour by speed.'
    };
  }

  /* 6. Plummer-sphere star cluster — sampled from the real distribution
        function (Aarseth et al.), so it is in virial equilibrium and lives
        for a long time before it starts to evaporate. */
  function cluster(seed, scale) {
    var rnd = makeRandom(seed, 'cluster');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, N = Math.round(1200 * scale), M = 2400, a = 100;
    var m = M / Math.max(1, N);
    var gmax = 0.0917;   /* max of q²(1+q²)^(-7/2) at q = sqrt(2/5) */

    var bodies = [];
    for (var i = 0; i < N; i++) {
      var X = rnd() * 0.9595;   /* truncated Plummer: r ≤ 6a, 96% of the mass */
      var r = a * Math.pow(X, 1 / 3) / Math.sqrt(Math.max(1e-9, 1 - Math.pow(X, 2 / 3)));
      var th = rnd() * Math.PI * 2;

      /* rejection-sample the speed from the Plummer DF */
      var q = 0;
      for (var tries = 0; tries < 64; tries++) {
        var qc = rnd();
        var g = qc * qc / Math.pow(1 + qc * qc, 3.5);
        if (rnd() < g / gmax) { q = qc; break; }
      }
      var vesc = Math.sqrt(2 * G * M / Math.sqrt(r * r + a * a));
      var v = q * vesc;
      var phi = rnd() * Math.PI * 2;

      bodies.push(new Body(
        Math.cos(th) * r, Math.sin(th) * r,
        Math.cos(phi) * v, Math.sin(phi) * v,
        m, 1.25, 'dust', i % 5
      ));
    }

    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.05, substeps: 3, softening: 3.5,
      merge: false, name: 'Star Cluster', colorMode: 'speed', trailMode: 'glow', particles: 1200, viewSpan: 900, trailSpan: 90,
      blurb: 'A Plummer sphere: 1200 stars sampled from the real cluster distribution function, in virial equilibrium. It should hold together \u2014 two-body relaxation slowly boils stars off the core.'
    };
  }

  /* 7. Big bang — Hubble flow plus perturbation, gravity builds the web. */
  function bigbang(seed, scale) {
    var rnd = makeRandom(seed, 'bigbang');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, N = Math.round(1600 * scale), R = 780;
    var m = 1.4;
    var M = N * m;
    /* Hubble constant tuned so the outer edge is marginally bound:
       H·R ≈ 0.85 · sqrt(2GM/R). Unbound and you get a featureless explosion;
       too bound and the whole sheet recollapses into one blob. */
    var H = 0.85 * Math.sqrt(2 * G * M / R) / R;
    var bodies = [];
    for (var i = 0; i < N; i++) {
      var rr = R * Math.sqrt(rnd());
      /* angular overdensities — m=3 and m=5 — give gravity something to bite on */
      var th = 0, w = 0;
      for (var t = 0; t < 24; t++) {
        th = rnd() * Math.PI * 2;
        w = 1 + 0.42 * Math.sin(3 * th + 0.7) + 0.30 * Math.sin(5 * th - 1.3)
              + 0.22 * Math.sin(2 * th + 2.1);
        if (rnd() * 1.95 < w) break;
      }
      var x = Math.cos(th) * rr, y = Math.sin(th) * rr;
      var pert = 0.30;
      bodies.push(new Body(
        x, y,
        H * x + (rnd() - 0.5) * pert,
        H * y + (rnd() - 0.5) * pert,
        m, 1.0, 'dust', 0
      ));
    }
    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.08, substeps: 2, softening: 8,
      merge: false, name: 'Big Bang', colorMode: 'speed', trailMode: 'glow', particles: 1600, viewSpan: 1700, trailSpan: 160,
      blurb: 'An expanding uniform sheet on a Hubble flow, nudged with noise. Expansion wins globally, but locally gravity wins \u2014 filaments and clumps condense out of nothing.'
    };
  }

  /* 8. Cold collapse — a box of dust at rest, no angular momentum at all. */
  function collapse(seed, scale) {
    var rnd = makeRandom(seed, 'collapse');
    scale = Math.max(0.05, Math.min(4, scale || 1));
    var G = 1, N = Math.round(1100 * scale), S = 520;
    var bodies = [];
    for (var i = 0; i < N; i++) {
      bodies.push(new Body(
        (rnd() - 0.5) * S, (rnd() - 0.5) * S,
        (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.02,
        1.6, 1.5, 'dust', Math.floor(rnd() * 4)
      ));
    }
    removeBulkDrift(bodies);

    return {
      bodies: bodies, G: G, dt: 0.05, substeps: 3, softening: 4,
      merge: false, name: 'Cold Collapse', colorMode: 'group', trailMode: 'glow', particles: 1100, viewSpan: 700, trailSpan: 80,
      blurb: 'A cold, pressureless box of dust with essentially zero spin. Free-fall collapse and violent relaxation into a churning, lumpy core. Merging is off so the substructure survives \u2014 switch it on in the Physics panel to watch it coalesce.'
    };
  }

  var PRESETS = {
    solar:     { build: solar,     label: 'Solar System' },
    binary:    { build: binary,    label: 'Binary Stars' },
    galaxies:  { build: galaxies,  label: 'Galaxy Collision' },
    figure8:   { build: figure8,   label: 'Figure-Eight' },
    blackhole: { build: blackhole, label: 'Black Hole' },
    cluster:   { build: cluster,   label: 'Star Cluster' },
    bigbang:   { build: bigbang,   label: 'Big Bang' },
    collapse:  { build: collapse,  label: 'Cold Collapse' }
  };

  var PRESET_ORDER = ['solar', 'binary', 'galaxies', 'figure8', 'blackhole', 'cluster', 'bigbang', 'collapse'];

  /* Declared once, mirrored by the builders above, so panels can read a
     preset's tuning without instantiating a few thousand bodies. */
  var DEFAULTS = {
    solar:     { G: 1,    dt: 0.012,  substeps: 3, softening: 0.45, merge: false, colorMode: 'group', trailMode: 'glow',  particles: 420 },
    binary:    { G: 1,    dt: 0.050,  substeps: 3, softening: 3.00, merge: false, colorMode: 'group', trailMode: 'glow',  particles: 700 },
    galaxies:  { G: 1,    dt: 0.060,  substeps: 3, softening: 4.00, merge: false, colorMode: 'group', trailMode: 'glow',  particles: 1140 },
    figure8:   { G: 1,    dt: 0.0022, substeps: 4, softening: 0.35, merge: false, colorMode: 'group', trailMode: 'world', particles: 0 },
    blackhole: { G: 1,    dt: 0.026,  substeps: 3, softening: 2.00, merge: true,  colorMode: 'speed', trailMode: 'glow',  particles: 1400 },
    cluster:   { G: 1,    dt: 0.050,  substeps: 3, softening: 3.50, merge: false, colorMode: 'speed', trailMode: 'glow',  particles: 1200 },
    bigbang:   { G: 1,    dt: 0.080,  substeps: 2, softening: 8.00, merge: false, colorMode: 'speed', trailMode: 'glow',  particles: 1600 },
    collapse:  { G: 1,    dt: 0.050,  substeps: 3, softening: 4.00, merge: false,  colorMode: 'group', trailMode: 'glow',  particles: 1100 }
  };

  function load(key, seed, scale) {
    var def = PRESETS[key] || PRESETS.solar;
    var cfg = def.build(seed, scale);
    var st = new State({
      G: cfg.G, dt: cfg.dt, substeps: cfg.substeps, softening: cfg.softening,
      merge: cfg.merge, name: cfg.name, colorMode: cfg.colorMode,
      trailMode: cfg.trailMode, seed: seed
    });
    st.bodies = cfg.bodies.slice(0, MAX_BODIES);
    st.blurb = cfg.blurb || '';
    st.trailSpan = cfg.trailSpan || 0;
    st.viewSpan = cfg.viewSpan || 0;
    st.applyTrailSpan();
    st.defaultParticles = cfg.particles || 0;
    st.preset = PRESETS[key] ? key : 'solar';
    return st;
  }

  /* ── public surface ───────────────────────────────────── */

  global.SimPhysics = {
    Body: Body,
    State: State,
    step: step,
    stepOnce: stepOnce,
    buildTree: buildTree,
    computeAccel: computeAccel,
    mergePass: mergePass,
    kineticEnergy: kineticEnergy,
    potentialEnergy: potentialEnergy,
    momentum: momentum,
    bounds: bounds,
    load: load,
    makeRandom: makeRandom,
    PRESETS: PRESETS,
    PRESET_ORDER: PRESET_ORDER,
    DEFAULTS: DEFAULTS,
    defaultsFor: function (k) { return DEFAULTS[k] || DEFAULTS.solar; },
    MAX_BODIES: MAX_BODIES,
    nodeCount: function () { return nodeCount; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
