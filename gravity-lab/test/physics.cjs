/* Numerical acceptance test for the physics core.
   Runs every preset for a fixed number of steps in plain Node (no DOM) and
   fails on the things that actually matter: NaN, energy blow-up, particles
   escaping to infinity, and a Moon that gets stripped by the Sun.

     node test/physics.cjs            # all presets
     node test/physics.cjs solar      # one preset, verbose */

const path = require('path');

/* jsdom-free: physics.js only needs a global object to hang itself off */
global.window = global;
require(path.join(__dirname, '..', 'assets', 'physics.js'));
const P = global.SimPhysics;

const only = process.argv[2] || null;

function energyDrift(st, e0) {
  const ke = P.kineticEnergy(st.bodies);
  const pe = P.potentialEnergy(st);
  const e = ke + pe;
  return { e, drift: e0 ? ((e - e0) / Math.abs(e0)) * 100 : 0 };
}

function finite(bodies) {
  for (const b of bodies) {
    if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy) || !isFinite(b.m)) return false;
  }
  return true;
}

function percentileRadius(bodies, q) {
  const rs = bodies.map(b => Math.hypot(b.x, b.y)).sort((a, b) => a - b);
  return rs.length ? rs[Math.min(rs.length - 1, Math.floor(q * rs.length))] : 0;
}

const MOONS = ['Io', 'Europa', 'Ganymede'];

const STEPS = {
  solar: 1400, binary: 900, galaxies: 900, figure8: 3000,
  blackhole: 1400, cluster: 900, bigbang: 700, collapse: 900
};

let failures = 0;
const rows = [];

for (const key of P.PRESET_ORDER) {
  if (only && key !== only) continue;

  const st = P.load(key, 12345, 1);
  const n0 = st.bodies.length;
  const bounds0 = P.bounds(st.bodies);
  const r99_0 = percentileRadius(st.bodies, 0.99);

  /* prime accelerations, the way ui.js does */
  st.tree = P.buildTree(st.bodies);
  P.computeAccel(st);
  st.accValid = true;
  const e0 = energyDrift(st, null).e;

  const nSteps = STEPS[key] || 800;
  const t0 = Date.now();
  for (let i = 0; i < nSteps; i++) P.step(st);
  const ms = Date.now() - t0;

  const ok = finite(st.bodies);
  const { drift } = energyDrift(st, e0);
  const r99 = percentileRadius(st.bodies, 0.99);
  const b = P.bounds(st.bodies);
  const span = Math.max(b.w, b.h);

  /* per-preset expectations */
  const notes = [];
  let pass = ok;
  if (!ok) notes.push('NaN/Inf');

  /* Energy: merging presets legitimately lose energy (inelastic), so only
     demand conservation where it should hold. */
  if (!st.merge && Math.abs(drift) > 12) { pass = false; notes.push('energy drift ' + drift.toFixed(1) + '%'); }

  /* Nothing should fly off to absurd distances relative to where it started. */
  if (key !== 'bigbang' && r99 > Math.max(r99_0 * 6, 4000)) { pass = false; notes.push('escape: r99 ' + r99.toFixed(0) + ' from ' + r99_0.toFixed(0)); }
  if (key === 'bigbang' && r99 < r99_0 * 1.05) { pass = false; notes.push('no expansion'); }

  if (!pass) failures++;

  rows.push({
    key, n0, n: st.bodies.length, steps: nSteps, ms,
    drift: drift.toFixed(3) + '%',
    r99_0: r99_0.toFixed(0), r99: r99.toFixed(0),
    span: span.toFixed(0), nodes: P.nodeCount(),
    pass: pass ? 'PASS' : 'FAIL ' + notes.join(', ')
  });
}

console.log('');
console.log('preset      n0     n   steps   ms/total  E-drift      r99(0)→r99   span    nodes  result');
console.log('─'.repeat(104));
for (const r of rows) {
  console.log(
    r.key.padEnd(11),
    String(r.n0).padStart(5),
    String(r.n).padStart(5),
    String(r.steps).padStart(6),
    (r.ms + 'ms').padStart(9),
    String(r.drift).padStart(10),
    (r.r99_0 + '→' + r.r99).padStart(13),
    String(r.span).padStart(7),
    String(r.nodes).padStart(6),
    '  ' + r.pass
  );
}

/* ── targeted checks ─────────────────────────────────────── */

function check(label, cond) {
  console.log((cond ? '  ok   ' : '  FAIL ') + label);
  if (!cond) failures++;
}

console.log('\ntargeted:');

/* Solar system: planets must stay on their orbits, and the Moon must survive. */
{
  const st = P.load('solar', 7, 1);
  st.tree = P.buildTree(st.bodies); P.computeAccel(st); st.accValid = true;
  const planets = st.bodies.filter(b => b.kind === 'planet' && b.name && MOONS.indexOf(b.name) < 0);
  const a0 = planets.map(p => Math.hypot(p.x - st.bodies[0].x, p.y - st.bodies[0].y));
  const jup = st.bodies.find(b => b.name === 'Jupiter');
  const moons = MOONS.map(n => st.bodies.find(b => b.name === n));
  const d0 = moons.map(m => Math.hypot(m.x - jup.x, m.y - jup.y));

  /* Derive the Hill sphere from the scene itself rather than hard-coding it,
     so the check survives future retuning: r_H = a·(m/3M)^⅓ */
  const aJ = Math.hypot(jup.x - st.bodies[0].x, jup.y - st.bodies[0].y);
  const rH = aJ * Math.cbrt(jup.m / (3 * st.bodies[0].m));
  /* prograde stability limit is ≈0.49 r_H; assert we stay clearly inside it */
  const worstAllowed = 0.47 * rH;

  let moonWorst = 0, moonFinal = 0;
  for (let i = 0; i < 2600; i++) {
    P.step(st);
    /* widest separation seen at ANY point — an escape can happen mid-run and
       the body may not be far away yet when we sample only the final state */
    const jj = st.bodies.find(b => b.name === 'Jupiter');
    moons.forEach(m => {
      if (!m) return;
      moonWorst = Math.max(moonWorst, Math.hypot(m.x - jj.x, m.y - jj.y));
    });
  }

  const sun = st.bodies[0];
  let worst = 0, worstName = '';
  planets.forEach((p, i) => {
    /* heliocentric radius: the Sun is the reference, not the origin, because
       the barycentre is at rest but the Sun still wobbles around it */
    const a = Math.hypot(p.x - sun.x, p.y - sun.y);
    const rel = Math.abs(a - a0[i]) / a0[i];
    if (rel > worst) { worst = rel; worstName = p.name; }
  });
  check('planets hold their radii to <8% over 2600 steps (worst ' + (worst * 100).toFixed(2) + '%, ' + worstName + ')', worst < 0.08);

  const jup2 = st.bodies.find(b => b.name === 'Jupiter');
  moons.forEach(m => { if (m) moonFinal = Math.max(moonFinal, Math.hypot(m.x - jup2.x, m.y - jup2.y)); });
  check('Galilean moons never exceed 0.47·r_H = ' + worstAllowed.toFixed(1) +
        ' (widest over run ' + moonWorst.toFixed(2) + ', final ' + moonFinal.toFixed(2) +
        ', started ' + d0.map(x => x.toFixed(1)).join('/') + ')',
        moonWorst < worstAllowed);
  check('no moon was lost entirely (all three still present)', moons.every(m => m && st.bodies.indexOf(m) >= 0));
}

/* Figure-eight: the whole point is that it is a closed orbit — after one
   period (T ≈ 6.3252 in canonical units) the bodies must return home. */
{
  const st = P.load('figure8', 1, 1);
  st.tree = P.buildTree(st.bodies); P.computeAccel(st); st.accValid = true;
  const p0 = st.bodies.map(b => ({ x: b.x, y: b.y }));
  const e0 = energyDrift(st, null).e;

  /* the preset is scaled so the canonical period is T_sim = 6.3252 units */
  const T = 6.3252;
  while (st.time < T) P.stepOnce(st);

  let worst = 0;
  st.bodies.forEach((b, i) => {
    worst = Math.max(worst, Math.hypot(b.x - p0[i].x, b.y - p0[i].y));
  });
  const { drift } = energyDrift(st, e0);
  check('figure-8 closes on itself after one period (max return error ' + worst.toFixed(2) + ' of a 62-unit orbit)', worst < 9);
  check('figure-8 energy drift over one period < 2% (got ' + drift.toFixed(3) + '%)', Math.abs(drift) < 2);
}

/* Barnes–Hut must agree with the exact O(n²) sum. */
{
  const rnd = P.makeRandom('bh-accuracy', 'x');
  const bodies = [];
  for (let i = 0; i < 400; i++) {
    const r = 60 + rnd() * 300, t = rnd() * Math.PI * 2;
    bodies.push(new P.Body(Math.cos(t) * r, Math.sin(t) * r, 0, 0, 1 + rnd() * 5, 1, 'dust', 0));
  }
  const G = 1, eps = 3, eps2 = eps * eps;

  /* exact */
  const ex = bodies.map(() => ({ ax: 0, ay: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const dx = bodies[j].x - bodies[i].x, dy = bodies[j].y - bodies[i].y;
      const inv = G * bodies[j].m / Math.pow(dx * dx + dy * dy + eps2, 1.5);
      ex[i].ax += dx * inv; ex[i].ay += dy * inv;
    }
  }

  for (const theta of [0.0, 0.35, 0.7, 1.0]) {
    const st = { bodies, G, softening: eps, theta };
    st.tree = P.buildTree(bodies);
    P.computeAccel(st);
    let num = 0, den = 0;
    bodies.forEach((b, i) => {
      num += Math.hypot(b.ax - ex[i].ax, b.ay - ex[i].ay);
      den += Math.hypot(ex[i].ax, ex[i].ay);
    });
    const rel = num / den * 100;
    const limit = theta === 0 ? 1e-6 : theta <= 0.35 ? 1.0 : theta <= 0.7 ? 4.0 : 12.0;
    check('θ=' + theta.toFixed(2) + ' relative force error ' + rel.toFixed(3) + '% (limit ' + limit + '%)', rel < limit);
  }
}

/* Merging conserves momentum and mass. */
{
  const st = new P.State({ G: 0, dt: 0.05, substeps: 1, softening: 1, merge: true });
  st.bodies = [
    new P.Body(-20, 0, 2, 0, 10, 3, 'dust', 0),
    new P.Body(20, 0, -1, 0, 5, 2, 'dust', 1)
  ];
  const m0 = 15, p0 = { x: 10 * 2 + 5 * -1, y: 0 };
  for (let i = 0; i < 400; i++) P.step(st);  /* head-on: 40 units at closing speed 3 */
  const b = st.bodies[0];
  check('merge reduced 2 bodies to ' + st.bodies.length, st.bodies.length === 1);
  check('merge conserved mass (' + b.m.toFixed(6) + ' == ' + m0 + ')', Math.abs(b.m - m0) < 1e-9);
  check('merge conserved momentum (' + (b.m * b.vx).toFixed(4) + ',' + (b.m * b.vy).toFixed(4) + ' == ' + p0.x + ',' + p0.y + ')',
    Math.abs(b.m * b.vx - p0.x) < 1e-6 && Math.abs(b.m * b.vy - p0.y) < 1e-6);
  check('merge conserved volume (r=' + b.r.toFixed(4) + ' == ' + Math.cbrt(27 + 8).toFixed(4) + ')',
    Math.abs(b.r - Math.cbrt(35)) < 1e-9);
}

/* Determinism: same seed twice ⇒ identical universe. */
{
  const a = P.load('galaxies', 99, 1);
  const b = P.load('galaxies', 99, 1);
  let same = a.bodies.length === b.bodies.length;
  for (let i = 0; same && i < a.bodies.length; i++) {
    same = a.bodies[i].x === b.bodies[i].x && a.bodies[i].vy === b.bodies[i].vy;
  }
  const c = P.load('galaxies', 100, 1);
  check('same seed ⇒ identical universe', same);
  check('different seed ⇒ different universe', c.bodies[5].x !== a.bodies[5].x);
}

console.log('');
if (failures) {
  console.log(failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('all checks passed');
