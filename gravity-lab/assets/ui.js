/* Gravity Lab — chrome wiring: main loop, camera input, tools, panels,
   deep links, keyboard shortcuts and PNG capture. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ── boot ─────────────────────────────────────────────── */

  var viewport = $('viewport');
  var bgC = $('bg'), sceneC = $('scene'), overC = $('overlay');

  var R = new LabRenderer.Renderer({ bg: bgC, scene: sceneC, overlay: overC });

  var params = new URLSearchParams(location.search);
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('gravitylab.' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('gravitylab.' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var PRESET_ORDER = SimPhysics.PRESET_ORDER;

  var want = {
    preset: PRESET_ORDER.indexOf(params.get('preset')) >= 0 ? params.get('preset')
            : (PRESET_ORDER.indexOf(store.get('preset', null)) >= 0 ? store.get('preset') : 'solar'),
    seed: clampInt(params.get('seed') || store.get('seed', 1), 1, 999999),
    particles: clampInt(params.get('particles') || store.get('particles', 1000), 50, 4000)
  };

  function clampInt(v, lo, hi) {
    v = parseInt(v, 10);
    if (!isFinite(v)) v = lo;
    return Math.max(lo, Math.min(hi, v));
  }

  var st = null;
  var running = true;
  var tool = 'camera';
  var stepAcc = 0;
  var e0 = null;
  var fps = 60, fpsSmooth = 60;
  var frameMs = 0, physMs = 0;
  var uiState = { drag: null, grabbed: null, hovered: null };
  var mouse = { x: -999, y: -999, inside: false };
  var pointers = new Map();
  var pinch = 0;
  var toastTimer = 0;

  /* ── scale helper: preset particle population → slider ── */

  function scaleFor(presetKey) {
    var base = SimPhysics.defaultsFor(presetKey).particles || 0;
    if (base <= 0) return 1;
    return want.particles / base;
  }

  /* ── build ────────────────────────────────────────────── */

  function rebuild(fit) {
    var s = scaleFor(want.preset);
    st = SimPhysics.load(want.preset, want.seed, s);

    /* honour any UI overrides that differ from the preset default */
    st.G = st.G * gMul();
    st.dt = dtValue();
    st.substeps = parseInt($('subSlider').value, 10);
    st.softening = softValue();
    st.theta = thetaValue();
    st.merge = $('mergeChk').checked;

    R.style.colorMode = $('colorMode').value;
    R.style.trailMode = $('trailMode').value;
    st.trailMode = R.style.trailMode === 'off' ? 'glow' : R.style.trailMode;
    st.trailLen = R.style.trailMode === 'world' ? trailLenFor(st.bodies.length) : 8;
    st.applyTrailSpan();

    /* prime the tree so energies and the debug overlay work while paused */
    st.tree = SimPhysics.buildTree(st.bodies);
    SimPhysics.computeAccel(st);
    st.accValid = true;

    e0 = null;
    stepAcc = 0;
    R.hardClear();
    R.markCameraDirty();
    if (fit !== false) fitScene();

    $('sceneName').textContent = st.name;
    $('sceneBlurb').textContent = st.blurb;
    if (!store.get('cardHidden', false)) $('sceneCard').hidden = false;

    syncPresetUI();
    syncStatus();
    updateURL();
    store.set('preset', want.preset);
    store.set('seed', want.seed);
    store.set('particles', want.particles);
  }

  /* Frame what is interesting, not merely what exists: presets may declare a
     viewSpan, otherwise fall back to the full bounding box. */
  function fitScene() {
    var b = SimPhysics.bounds(st.bodies);
    if (st.viewSpan) {
      var cx = b.x + b.w * 0.5, cy = b.y + b.h * 0.5, h = st.viewSpan * 0.5;
      b = { x: cx - h, y: cy - h, w: st.viewSpan, h: st.viewSpan };
    }
    R.fit(b);
  }

  function trailLenFor(n) {
    if (n > 1500) return 20;
    if (n > 600) return 34;
    return 64;
  }

  /* ── slider maths ─────────────────────────────────────── */

  function gMul() { var v = Number($('gSlider').value) / 100; return v * v; }
  function softValue() { return 0.01 * Math.pow(10, Number($('softSlider').value) / 28); }
  function thetaValue() { return Number($('thetaSlider').value) / 100 * 1.5; }
  function newMass() { return Math.pow(10, (Number($('newMass').value) / 100) * 6 - 2); }
  function speedMul() { var v = Number($('speed').value) / 100; return v * v; }

  /* The preset's own dt, before the UI multiplier — read from the declared
     defaults table, which costs nothing. Building the preset to find out would
     mean instantiating thousands of bodies just to read one number. */
  function dtValue() {
    return SimPhysics.defaultsFor(want.preset).dt * Math.pow(10, (Number($('dtSlider').value) - 50) / 50);
  }

  function radiusForMass(m) {
    return Math.max(0.45, Math.cbrt(m) * 0.62);
  }

  /* ── UI sync ──────────────────────────────────────────── */

  function syncPresetUI() {
    $('preset').value = want.preset;
    $('seed').value = want.seed;
    $('bodyCount').value = want.particles;
    var tabs = $('presetTabs').children;
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-preset') === want.preset;
      tabs[i].classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var base = st ? st.defaultParticles : 0;
    $('bodyCount').disabled = base <= 0;
    $('bodyCountOut').textContent = base > 0 ? String(st.bodies.length) : 'fixed (3)';
  }

  function syncStatus() {
    $('statusLeft').innerHTML =
      '<b>' + escapeHtml(st.name) + '</b> · seed <span class="accent">' + want.seed + '</span>' +
      ' · ' + st.bodies.length + ' bodies · G ' + fmt(st.G, 3) +
      ' · dt ' + st.dt.toExponential(2) + ' ×' + st.substeps;
  }

  function syncOutputs() {
    $('gOut').textContent = gMul().toFixed(2) + '×';
    $('dtOut').textContent = dtValue().toFixed(4);
    $('subOut').textContent = $('subSlider').value;
    $('softOut').textContent = softValue().toFixed(3);
    $('thetaOut').textContent = thetaValue().toFixed(2);
    $('newMassOut').textContent = newMass().toPrecision(3);
    $('speedOut').textContent = speedMul().toFixed(2) + '×';
    $('trailOut').textContent = (Number($('trailSlider').value) / 100).toFixed(2);
    $('glowOut').textContent = (Number($('glowSlider').value) / 100).toFixed(2);
    $('sizeOut').textContent = (Number($('sizeSlider').value) / 100).toFixed(2);
    $('trailField').style.opacity = R.style.trailMode === 'glow' ? '1' : '.4';
  }

  function fmt(n, d) {
    if (!isFinite(n)) return '∞';
    var a = Math.abs(n);
    if (a !== 0 && (a < 1e-3 || a >= 1e7)) return n.toExponential(2);
    return n.toFixed(d === undefined ? 2 : d);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateURL() {
    var q = new URLSearchParams();
    q.set('preset', want.preset);
    q.set('seed', String(want.seed));
    if (st.defaultParticles > 0) q.set('particles', String(want.particles));
    var url = location.pathname + '?' + q.toString();
    if (history.replaceState) history.replaceState(null, '', url);
  }

  function toast(msg, isErr) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ── build the preset tabs + select ───────────────────── */

  (function buildPresetUI() {
    var tabs = $('presetTabs'), sel = $('preset');
    PRESET_ORDER.forEach(function (k, i) {
      var label = SimPhysics.PRESETS[k].label;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ws';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-preset', k);
      b.textContent = label;
      b.title = label + ' (' + (i + 1) + ')';
      tabs.appendChild(b);

      var o = document.createElement('option');
      o.value = k; o.textContent = label;
      sel.appendChild(o);
    });
  })();

  /* ── main loop ────────────────────────────────────────── */

  var lastT = performance.now();
  var frameNo = 0;
  var energyTick = 0;

  function frame(now) {
    var rawDt = now - lastT;
    lastT = now;
    if (rawDt > 0) fps = 1000 / rawDt;
    fpsSmooth += (fps - fpsSmooth) * 0.08;

    var t0 = performance.now();
    if (running) {
      stepAcc += speedMul();
      var guard = 0;
      while (stepAcc >= 1 && guard < 14) {
        SimPhysics.step(st);
        stepAcc -= 1;
        guard++;
      }
      if (stepAcc > 14) stepAcc = 0;
      if (guard >= 14) stepAcc = 0;
    } else if (pendingSingleStep) {
      SimPhysics.step(st);
      pendingSingleStep = false;
    }
    physMs = performance.now() - t0;

    if (uiState.grabbed) applyGrab();
    pickHover();

    R.draw(st, uiState);
    frameMs = performance.now() - t0;

    if ((frameNo++ % 6) === 0) updateHud();
    if ((frameNo % 24) === 0) updateEnergy();
    if ((frameNo % 30) === 0) syncStatus();

    requestAnimationFrame(frame);
  }

  var pendingSingleStep = false;

  function updateHud() {
    $('hFps').textContent = fpsSmooth.toFixed(0);
    $('hCount').textContent = String(st.bodies.length);
    $('hNodes').textContent = String(SimPhysics.nodeCount());
    $('hTime').textContent = st.time < 1000 ? st.time.toFixed(1) : st.time.toExponential(2);
    $('hSteps').textContent = String(st.steps);
    $('statusPerf').textContent = 'phys ' + physMs.toFixed(1) + 'ms · draw ' + (frameMs - physMs).toFixed(1) + 'ms';
    $('statusZoom').textContent = 'zoom ' + zoomLabel(R.cam.zoom);
    var f = $('hFps');
    f.className = fpsSmooth < 26 ? 'warn' : 'good';
  }

  function zoomLabel(z) {
    if (z >= 100) return z.toFixed(0);
    if (z >= 1) return z.toFixed(2);
    return z.toFixed(4);
  }

  function updateEnergy() {
    var ke = SimPhysics.kineticEnergy(st.bodies);
    var pe = SimPhysics.potentialEnergy(st);
    var mom = SimPhysics.momentum(st.bodies);
    var e = ke + pe;
    if (e0 === null && isFinite(e) && e !== 0) e0 = e;
    var drift = e0 ? (e - e0) / Math.abs(e0) * 100 : 0;

    $('hKe').textContent = fmt(ke, 3);
    $('hPe').textContent = fmt(pe, 3);
    $('hDrift').textContent = (drift >= 0 ? '+' : '') + drift.toFixed(3) + '%';
    $('hDrift').className = Math.abs(drift) > 2 ? 'warn' : 'good';
    $('hMom').textContent = fmt(mom, 3);
  }

  /* ── picking ──────────────────────────────────────────── */

  function pickHover() {
    if (!mouse.inside || uiState.drag || tool === 'erase') { uiState.hovered = null; return; }
    uiState.hovered = pickAt(mouse.x, mouse.y);
  }

  function pickAt(px, py) {
    var best = null, bestD = Infinity;
    var bodies = st.bodies;
    var lim = 9;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var dx = R.sx(b.x) - px, dy = R.sy(b.y) - py;
      var d = Math.sqrt(dx * dx + dy * dy) - Math.min(lim, b.r * R.cam.zoom);
      if (d < bestD && d <= lim) { bestD = d; best = b; }
    }
    return best;
  }

  /* ── camera input ─────────────────────────────────────── */

  function localPos(ev) {
    var r = viewport.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  viewport.addEventListener('pointerdown', function (ev) {
    if (ev.button === 2) return;                 /* context menu handles right-click */
    var p = localPos(ev);
    pointers.set(ev.pointerId, p);
    try { viewport.setPointerCapture(ev.pointerId); } catch (e) {}

    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      uiState.drag = null; uiState.grabbed = null;
      return;
    }

    var panIntent = tool === 'camera' || ev.button === 1 || ev.shiftKey || ev.altKey;

    if (panIntent) {
      uiState.drag = { kind: 'pan', x0: p.x, y0: p.y, camx: R.cam.x, camy: R.cam.y };
      viewport.classList.add('is-dragging');
      return;
    }

    if (tool === 'spawn' || tool === 'hole') {
      var massive = tool === 'hole';
      var m = massive ? newMass() * 900 : newMass();
      uiState.drag = {
        kind: 'spawn', x0: p.x, y0: p.y, x1: p.x, y1: p.y,
        mass: m, massive: massive, r: radiusForMass(m)
      };
      return;
    }

    if (tool === 'grab') {
      var b = pickAt(p.x, p.y);
      if (b) {
        uiState.grabbed = b;
        uiState.grabPrev = { x: R.wx(p.x), y: R.wy(p.y) };
        b.vx = 0; b.vy = 0;
      } else {
        uiState.drag = { kind: 'pan', x0: p.x, y0: p.y, camx: R.cam.x, camy: R.cam.y };
      }
      return;
    }

    if (tool === 'erase') { eraseAt(p.x, p.y); return; }
  });

  viewport.addEventListener('pointermove', function (ev) {
    var p = localPos(ev);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, p);

    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch > 0 && d > 0) {
        var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        R.zoomAt(mid.x, mid.y, d / pinch);
      }
      pinch = d;
      return;
    }

    var drag = uiState.drag;
    if (drag) {
      if (drag.kind === 'pan') {
        R.cam.x = drag.camx - (p.x - drag.x0) / R.cam.zoom;
        R.cam.y = drag.camy + (p.y - drag.y0) / R.cam.zoom;
        R.markCameraDirty();
      } else if (drag.kind === 'spawn') {
        drag.x1 = p.x; drag.y1 = p.y;
      }
      return;
    }

    if (uiState.grabbed) {
      var b = uiState.grabbed;
      b.x = R.wx(p.x); b.y = R.wy(p.y);
      st.accValid = false;
    }
  });

  function endPointer(ev) {
    var p = localPos(ev);
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = 0;

    var drag = uiState.drag;
    if (drag && drag.kind === 'spawn') {
      var wx = R.wx(drag.x0), wy = R.wy(drag.y0);
      var vx = (drag.x1 - drag.x0) / R.cam.zoom;
      var vy = -(drag.y1 - drag.y0) / R.cam.zoom;
      spawnBody(wx, wy, vx, vy, drag.mass, drag.massive ? 'bh' : 'custom');
    }
    if (drag && drag.kind === 'pan') viewport.classList.remove('is-dragging');

    if (uiState.grabbed) {
      var b = uiState.grabbed;
      var step = Math.max(1e-6, st.dt * st.substeps);
      var nvx = (b.x - uiState.grabPrev.x) / step * 0.35;
      var nvy = (b.y - uiState.grabPrev.y) / step * 0.35;
      var cap = 400;
      var mag = Math.hypot(nvx, nvy);
      if (mag > cap) { nvx *= cap / mag; nvy *= cap / mag; }
      b.vx = nvx; b.vy = nvy;
      uiState.grabbed = null;
      st.accValid = false;
    }

    uiState.drag = null;
  }

  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('pointerleave', function () { mouse.inside = false; });
  viewport.addEventListener('pointerenter', function () { mouse.inside = true; });

  viewport.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var p = localPos(ev);
    var f = Math.pow(1.0016, -ev.deltaY * (ev.deltaMode === 1 ? 18 : 1));
    R.zoomAt(p.x, p.y, f);
  }, { passive: false });

  viewport.addEventListener('dblclick', function () { fitScene(); });

  /* ── spawn / erase ────────────────────────────────────── */

  function spawnBody(x, y, vx, vy, m, kind) {
    if (st.bodies.length >= SimPhysics.MAX_BODIES) {
      toast('Body limit reached (' + SimPhysics.MAX_BODIES + ')', true);
      return;
    }
    var b = new SimPhysics.Body(x, y, vx, vy, m, radiusForMass(m), kind || 'custom', 7);
    b.name = kind === 'bh' ? 'black hole' : 'new body';
    st.bodies.push(b);
    st.accValid = false;
    syncStatus();
  }

  function eraseAt(px, py) {
    var keep = [], removed = 0;
    for (var i = 0; i < st.bodies.length; i++) {
      var b = st.bodies[i];
      var dx = R.sx(b.x) - px, dy = R.sy(b.y) - py;
      var rad = Math.max(14, b.r * R.cam.zoom);
      if (dx * dx + dy * dy < rad * rad) { removed++; continue; }
      keep.push(b);
    }
    if (removed) {
      st.bodies = keep;
      st.accValid = false;
      toast(removed + ' bod' + (removed === 1 ? 'y' : 'ies') + ' deleted');
      syncStatus();
    }
  }

  function applyGrab() {
    if (!uiState.grabbed) return;
    uiState.grabPrev = { x: uiState.grabbed.x, y: uiState.grabbed.y };
  }

  /* ── keyboard ─────────────────────────────────────────── */

  var KEY_PRESETS = {};
  PRESET_ORDER.forEach(function (k, i) { KEY_PRESETS[String(i + 1)] = k; });

  window.addEventListener('keydown', function (ev) {
    var tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (ev.key === 'Escape') ev.target.blur();
      return;
    }

    var k = ev.key;
    if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); togglePlay(); return; }
    if (k === 'F12') { ev.preventDefault(); capture(); return; }
    if (k === '.' || k === '>') { pendingSingleStep = true; return; }
    if (k === 'r' || k === 'R') { rebuild(true); toast('Universe rebuilt from seed ' + want.seed); return; }
    if (k === 'f' || k === 'F') { fitScene(); return; }
    if (k === 'v' || k === 'V') { toggleShow('vectors'); return; }
    if (k === 'q' || k === 'Q') { toggleShow('quadtree'); return; }
    if (k === 'g' || k === 'G') { setTool('grab'); return; }
    if (k === 'c' || k === 'C') { setTool('camera'); return; }
    if (k === 's' || k === 'S') { setTool('spawn'); return; }
    if (k === 'h' || k === 'H') { setTool('hole'); return; }
    if (k === 'x' || k === 'X') { setTool('erase'); return; }
    if (k === 't' || k === 'T') { cycleTrails(); return; }
    if (k === 'Escape') { closeMenu(); $('sceneCard').hidden = true; return; }
    if (k === '+' || k === '=') { bumpSpeed(12); return; }
    if (k === '-' || k === '_') { bumpSpeed(-12); return; }
    if (KEY_PRESETS[k]) { choosePreset(KEY_PRESETS[k]); return; }
  });

  function bumpSpeed(d) {
    var el = $('speed');
    el.value = Math.max(0, Math.min(300, Number(el.value) + d));
    syncOutputs();
  }

  function togglePlay() {
    running = !running;
    $('playBtn').classList.toggle('paused', !running);
    $('playBtn').classList.toggle('is-on', running);
    $('vpHint').innerHTML = running
      ? 'drag to pan · scroll to zoom · <kbd>space</kbd> pause'
      : 'paused · <kbd>space</kbd> resume · <kbd>.</kbd> single step';
  }

  function cycleTrails() {
    var order = ['glow', 'world', 'off'];
    var sel = $('trailMode');
    var i = order.indexOf(sel.value);
    sel.value = order[(i + 1) % order.length];
    sel.dispatchEvent(new Event('change'));
    toast('Trails: ' + sel.options[sel.selectedIndex].textContent);
  }

  /* ── tools ────────────────────────────────────────────── */

  function setTool(t) {
    tool = t;
    var btns = document.querySelectorAll('.tool[data-tool]');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('is-active', btns[i].getAttribute('data-tool') === t);
    viewport.className = 'viewport tool-' + t;
    $('statusTool').textContent = t;
    uiState.grabbed = null;
    uiState.drag = null;
  }

  function toggleShow(key) {
    R.show[key] = !R.show[key];
    if (key === 'grid') R.markCameraDirty();
    var btn = document.querySelector('.tool[data-show="' + key + '"]');
    if (btn) btn.classList.toggle('is-on', R.show[key]);
  }

  document.querySelectorAll('.tool[data-tool]').forEach(function (b) {
    b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); });
  });
  document.querySelectorAll('.tool[data-show]').forEach(function (b) {
    b.addEventListener('click', function () { toggleShow(b.getAttribute('data-show')); });
  });

  /* ── panels ───────────────────────────────────────────── */

  function choosePreset(key) {
    want.preset = key;
    $('dtSlider').value = 50;
    var probe = SimPhysics.defaultsFor(key);
    $('gSlider').value = 100;
    $('softSlider').value = Math.round(28 * Math.log(Math.max(0.01, probe.softening) / 0.01) / Math.LN10);
    $('subSlider').value = probe.substeps;
    $('mergeChk').checked = probe.merge;
    $('colorMode').value = probe.colorMode;
    $('trailMode').value = probe.trailMode;
    syncOutputs();
    rebuild(true);
    toast(st.name);
  }

  $('presetTabs').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-preset]');
    if (b) choosePreset(b.getAttribute('data-preset'));
  });

  $('preset').addEventListener('change', function () { choosePreset(this.value); });

  $('seed').addEventListener('change', function () {
    want.seed = clampInt(this.value, 1, 999999);
    this.value = want.seed;
    rebuild(true);
  });

  $('diceBtn').addEventListener('click', function () {
    want.seed = 1 + Math.floor(Math.random() * 999999);
    rebuild(true);
    toast('Seed ' + want.seed);
  });

  $('bodyCount').addEventListener('input', function () {
    $('bodyCountOut').textContent = this.value;
  });
  $('bodyCount').addEventListener('change', function () {
    want.particles = clampInt(this.value, 50, 4000);
    rebuild(true);
  });

  $('regenBtn').addEventListener('click', function () { rebuild(true); toast('Universe rebuilt'); });

  $('playBtn').addEventListener('click', togglePlay);
  $('stepBtn').addEventListener('click', function () { pendingSingleStep = true; });
  $('resetBtn').addEventListener('click', function () { rebuild(true); });
  $('fitBtn').addEventListener('click', fitScene);
  $('renderBtn').addEventListener('click', capture);

  $('gSlider').addEventListener('input', function () {
    if (st) st.G = SimPhysics.defaultsFor(want.preset).G * gMul();
    st.accValid = false;
    syncOutputs();
  });
  $('dtSlider').addEventListener('input', function () { st.dt = dtValue(); syncOutputs(); syncStatus(); });
  $('subSlider').addEventListener('input', function () { st.substeps = parseInt(this.value, 10); syncOutputs(); syncStatus(); });
  $('softSlider').addEventListener('input', function () { st.softening = softValue(); st.accValid = false; syncOutputs(); });
  $('thetaSlider').addEventListener('input', function () { st.theta = thetaValue(); st.accValid = false; syncOutputs(); });
  $('mergeChk').addEventListener('change', function () { st.merge = this.checked; });
  $('newMass').addEventListener('input', syncOutputs);

  $('colorMode').addEventListener('change', function () { R.style.colorMode = this.value; });
  $('trailMode').addEventListener('change', function () {
    R.style.trailMode = this.value;
    st.trailMode = this.value === 'off' ? 'glow' : this.value;
    st.trailLen = this.value === 'world' ? trailLenFor(st.bodies.length) : 8;
    st.applyTrailSpan();
    if (this.value !== 'world') {
      for (var i = 0; i < st.bodies.length; i++) { st.bodies[i].trail = null; st.bodies[i].tLen = 0; }
    }
    R.hardClear();
    syncOutputs();
  });
  $('trailSlider').addEventListener('input', function () { R.style.trail = Number(this.value) / 100; syncOutputs(); });
  $('glowSlider').addEventListener('input', function () { R.style.glow = Number(this.value) / 100; syncOutputs(); });
  $('sizeSlider').addEventListener('input', function () { R.style.size = Number(this.value) / 100; syncOutputs(); });
  $('starChk').addEventListener('change', function () { R.show.starfield = this.checked; R.markCameraDirty(); });
  $('clearTrails').addEventListener('click', function () { R.hardClear(); toast('Trails cleared'); });

  $('cardClose').addEventListener('click', function () { $('sceneCard').hidden = true; });
  $('cardHide').addEventListener('click', function () {
    store.set('cardHidden', true);
    $('sceneCard').hidden = true;
  });

  $('sidebarBtn').addEventListener('click', function () {
    document.body.classList.toggle('sidebar-open');
  });

  document.querySelectorAll('.panel-head').forEach(function (h) {
    h.addEventListener('click', function () {
      var body = h.nextElementSibling;
      var collapsed = body.classList.toggle('is-collapsed');
      h.classList.toggle('is-collapsed', collapsed);
    });
  });

  /* ── context menu ─────────────────────────────────────── */

  var menu = $('menuPop');

  viewport.addEventListener('contextmenu', function (ev) {
    ev.preventDefault();
    var p = localPos(ev);
    openMenu(ev.clientX, ev.clientY, [
      { label: 'Frame scene', kbd: 'F', fn: fitScene },
      { label: 'Add body here', kbd: 'S', fn: function () {
          var m = newMass();
          spawnBody(R.wx(p.x), R.wy(p.y), 0, 0, m, 'custom');
        } },
      { label: 'Add black hole here', kbd: 'H', fn: function () {
          var m = newMass() * 900;
          spawnBody(R.wx(p.x), R.wy(p.y), 0, 0, m, 'bh');
        } },
      { sep: true },
      { label: 'Clear trails', fn: function () { R.hardClear(); } },
      { label: 'Rebuild universe', kbd: 'R', fn: function () { rebuild(true); } },
      { sep: true },
      { label: 'Save still as PNG', kbd: 'F12', fn: capture }
    ]);
  });

  function openMenu(cx, cy, items) {
    menu.innerHTML = '';
    items.forEach(function (it) {
      if (it.sep) { menu.appendChild(document.createElement('hr')); return; }
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span>' + escapeHtml(it.label) + '</span>' + (it.kbd ? '<kbd>' + it.kbd + '</kbd>' : '');
      b.addEventListener('click', function () { closeMenu(); it.fn(); });
      menu.appendChild(b);
    });
    menu.hidden = false;
    var r = menu.getBoundingClientRect();
    menu.style.left = Math.min(cx, window.innerWidth - r.width - 8) + 'px';
    menu.style.top = Math.min(cy, window.innerHeight - r.height - 8) + 'px';
  }

  function closeMenu() { menu.hidden = true; }
  window.addEventListener('pointerdown', function (ev) {
    if (!menu.hidden && !menu.contains(ev.target)) closeMenu();
  }, true);

  /* ── capture ──────────────────────────────────────────── */

  function capture() {
    try {
      var k = Math.max(1, Math.min(3, Math.round(1920 / Math.max(1, R.w))));
      var caption = st.name + ' · seed ' + want.seed + ' · t=' + st.time.toFixed(1) +
                    ' · ' + st.bodies.length + ' bodies · Gravity Lab';
      var cv = R.capture(Math.round(R.w * k), Math.round(R.h * k), caption);
      var url = cv.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = url;
      a.download = 'gravity-lab-' + want.preset + '-' + want.seed + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Saved ' + cv.width + '×' + cv.height + ' PNG');
    } catch (e) {
      toast('Capture failed: ' + e.message, true);
    }
  }

  /* ── resize ───────────────────────────────────────────── */

  function onResize() {
    var r = viewport.getBoundingClientRect();
    R.resize(Math.max(1, r.width), Math.max(1, r.height));
  }

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(onResize).observe(viewport);
  } else {
    window.addEventListener('resize', onResize);
  }

  /* ── go ───────────────────────────────────────────────── */

  function init() {
    /* preset defaults into the panel controls, before the first build */
    var probe = SimPhysics.defaultsFor(want.preset);
    $('gSlider').value = 100;
    $('dtSlider').value = 50;
    $('subSlider').value = probe.substeps;
    $('softSlider').value = Math.round(28 * Math.log(Math.max(0.01, probe.softening) / 0.01) / Math.LN10);
    $('thetaSlider').value = 47;
    $('mergeChk').checked = probe.merge;
    $('colorMode').value = probe.colorMode;
    $('trailMode').value = probe.trailMode;
    $('trailSlider').value = 22;
    $('glowSlider').value = Math.round(R.style.glow * 100);
    $('sizeSlider').value = Math.round(R.style.size * 100);
    $('starChk').checked = R.show.starfield !== false;
    $('speed').value = 100;

    if (store.get('cardHidden', false)) $('sceneCard').hidden = true;

    onResize();
    rebuild(true);
    syncOutputs();
    setTool('camera');
    $('playBtn').classList.add('is-on');

    if (window.innerWidth <= 860) document.body.classList.remove('sidebar-open');

    requestAnimationFrame(frame);
  }

  init();

  /* exposed for the headless smoke test */
  window.GravityLab = {
    renderer: R,
    state: function () { return st; },
    rebuild: rebuild,
    capture: capture,
    choosePreset: choosePreset,
    setTool: setTool,
    togglePlay: togglePlay,
    frame: function () { SimPhysics.step(st); R.draw(st, uiState); }
  };
})();
