/* Contribution City — chrome wiring: camera input, panels, render dialog,
   keyboard shortcuts, and the little Blender-ish menus. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var viewport = $('viewport');
  var canvas = $('scene');
  var view = ContributionView.create(canvas);

  var yearSelect = $('year');
  var usernameInput = $('username');
  var tooltip = $('tooltip');
  var hint = $('vpHint');

  var hoverCell = null;
  var mouse = { x: -999, y: -999 };
  var drag = null;
  var pointers = new Map();
  var pinchDistance = 0;
  var toastTimer = 0;
  var renderTimer = 0;

  /* ── years ───────────────────────────────────────────── */

  var thisYear = new Date().getFullYear();
  var years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  years.forEach(function (y) {
    var opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  });

  var params = new URLSearchParams(location.search);
  if (params.get('user')) usernameInput.value = params.get('user').replace(/^@+/, '');
  if (years.indexOf(Number(params.get('year'))) >= 0) yearSelect.value = params.get('year');

  /* ── data ────────────────────────────────────────────── */

  function numberWithCommas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function rebuild() {
    var data = ContributionData.generate(usernameInput.value, Number(yearSelect.value));
    view.setData(data);

    var best = data.best;
    $('statusLeft').innerHTML =
      'GitHub · <b>@' + escapeHtml(data.username) + '</b> ' + data.year +
      ' · <span class="accent">' + numberWithCommas(data.total) + '</span> contributions' +
      ' · ' + data.activeDays + ' active days' +
      ' · longest streak <b>' + data.longestStreak + '</b>d' +
      (best ? ' · best day <b>' + best.count + '</b>' : '');
    $('statusYear').textContent = data.year;

    var url = '?user=' + encodeURIComponent(data.username) + '&year=' + data.year;
    try { history.replaceState(null, '', url); } catch (e) { /* file:// */ }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var rebuildTimer = 0;
  usernameInput.addEventListener('input', function () {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 220);
  });
  usernameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      clearTimeout(rebuildTimer);
      rebuild();
      usernameInput.blur();
    }
  });
  yearSelect.addEventListener('change', rebuild);

  /* ── pointer / camera ────────────────────────────────── */

  function hideHint() {
    if (!hint) return;
    hint.classList.add('is-hidden');
  }

  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      drag = null;
      hideHint();
      e.preventDefault();
      return;
    }
    drag = {
      x: e.clientX,
      y: e.clientY,
      mode: (e.shiftKey || e.button === 1 || e.button === 2) ? 'pan' : 'orbit'
    };
    canvas.classList.add('is-dragging');
    hideHint();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDistance > 0 && d > 0) view.zoom(pinchDistance / d);
      pinchDistance = d;
      e.preventDefault();
      return;
    }

    var p = localPoint(e);
    mouse.x = p.x;
    mouse.y = p.y;
    view.setMouse(p.x, p.y, true);

    if (drag) {
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (drag.mode === 'pan') view.pan(dx, dy);
      else view.orbit(dx * 0.0062, -dy * 0.0052);
    }
    positionTooltip();
    e.preventDefault();
  });

  function endDrag(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (!drag) return;
    drag = null;
    canvas.classList.remove('is-dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', function () {
    view.setMouse(-999, -999, false);
    tooltip.hidden = true;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    hideHint();
    view.zoom(e.deltaY > 0 ? 1.075 : 0.93);
  }, { passive: false });

  canvas.addEventListener('dblclick', function () { view.preset('iso'); });

  window.addEventListener('blur', function () {
    drag = null;
    pointers.clear();
    canvas.classList.remove('is-dragging');
  });

  /* ── tooltip ─────────────────────────────────────────── */

  function positionTooltip() {
    if (!hoverCell) { tooltip.hidden = true; return; }
    var x = Math.min(Math.max(mouse.x, 62), viewport.clientWidth - 62);
    var y = Math.max(mouse.y, 52);
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  view.setHoverCallback(function (cell) {
    hoverCell = cell;
    if (!cell) { tooltip.hidden = true; return; }
    $('ttValue').textContent = cell.count;
    $('ttUnit').textContent = cell.count === 1 ? 'contribution' : 'contributions';
    $('ttDate').textContent = cell.label;
    tooltip.hidden = false;
    positionTooltip();
    if (cell.count > 0) hideHint();
  });

  /* ── sidebar ─────────────────────────────────────────── */

  function setToggle(btn, on) {
    btn.classList.toggle('is-active', !!on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.dataset.on = on ? '1' : '0';
  }

  var turntableBtn = $('turntableBtn');
  var wireBtn = $('wireBtn');
  var tTurntable = $('tTurntable');
  var tWire = $('tWire');
  var tShadow = $('tShadow');

  function syncToggles() {
    var p = view.state.params;
    setToggle(turntableBtn, p.turntable);
    setToggle(wireBtn, p.wire);
    setToggle(tTurntable, p.turntable);
    setToggle(tWire, p.wire);
    setToggle(tShadow, p.contact);
  }

  function toggleParam(key, btn) {
    var next = !view.getParam(key);
    view.setParam(key, next);
    if (btn) setToggle(btn, next);
    syncToggles();
    hideHint();
  }

  turntableBtn.addEventListener('click', function () { toggleParam('turntable', turntableBtn); });
  wireBtn.addEventListener('click', function () { toggleParam('wire', wireBtn); });
  tTurntable.addEventListener('click', function () { toggleParam('turntable', tTurntable); });
  tWire.addEventListener('click', function () { toggleParam('wire', tWire); });
  tShadow.addEventListener('click', function () { toggleParam('contact', tShadow); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (btn) {
    btn.addEventListener('click', function () { view.preset(btn.dataset.preset); hideHint(); });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      if (btn.dataset.tool === 'pan') toast('Shift + drag anywhere to pan the view');
      if (btn.dataset.tool === 'zoom') toast('Scroll to zoom the camera');
      if (btn.dataset.tool === 'orbit') toast('Drag to orbit · double-click to reset');
    });
  });

  /* sliders */

  function bindSlider(id, label, key, transform, format) {
    var input = $(id);
    var out = $(label);
    function apply() {
      var v = Number(input.value);
      var mapped = transform ? transform(v) : v;
      view.setParam(key, mapped);
      if (out) out.textContent = format(mapped, v);
    }
    input.addEventListener('input', apply);
    apply();
  }

  bindSlider('sunAz', 'vAz', 'sunAz', null, function (v) { return Math.round(v) + '°'; });
  bindSlider('sunEl', 'vEl', 'sunEl', null, function (v) { return Math.round(v) + '°'; });
  bindSlider('sunStrength', 'vStr', 'sunStrength', function (v) { return v / 100; },
    function (v) { return v.toFixed(2); });
  bindSlider('heightScale', 'vH', 'heightScale', function (v) { return v / 100; },
    function (v) { return v.toFixed(2) + '×'; });
  bindSlider('glow', 'vGlow', 'glow', function (v) { return v / 100; },
    function (v) { return Math.round(v * 100) + '%'; });

  /* engine + palette chips */

  Array.prototype.forEach.call(document.querySelectorAll('[data-engine]'), function (chip) {
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-engine]'), function (c) {
        c.classList.toggle('is-active', c === chip);
      });
      view.setParam('engine', chip.dataset.engine);
      $('statEngine').textContent = chip.dataset.engine === 'cycles' ? 'CYCLES' : 'EEVEE';
      toast(chip.dataset.engine === 'cycles'
        ? 'Cycles — softer bounce light, wider highlights'
        : 'EEVEE — crisp key light, tight specular');
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-palette]'), function (chip) {
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-palette]'), function (c) {
        c.classList.toggle('is-active', c === chip);
      });
      view.setPalette(chip.dataset.palette);
    });
  });

  /* outliner */

  Array.prototype.forEach.call(document.querySelectorAll('.outliner .row[data-object]'), function (row) {
    var object = row.dataset.object;
    var eye = row.querySelector('.eye');

    row.addEventListener('click', function (e) {
      if (e.target === eye) return;
      Array.prototype.forEach.call(document.querySelectorAll('.outliner .row'), function (r) {
        r.classList.remove('is-active');
      });
      row.classList.add('is-active');
      if (object === 'cam') { view.preset('iso'); toast('Camera reset to isometric'); }
    });

    if (!eye) return;
    eye.addEventListener('click', function (e) {
      e.stopPropagation();
      var hidden = row.classList.toggle('is-hidden');
      if (object === 'city') view.setParam('city', !hidden);
      if (object === 'floor') view.setParam('floor', !hidden);
      if (object === 'key') view.setParam('keyLight', !hidden);
    });
  });

  /* ── toast ───────────────────────────────────────────── */

  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.hidden = true;
  viewport.appendChild(toastEl);

  function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
      setTimeout(function () { toastEl.hidden = true; }, 240);
    }, 2600);
  }

  /* ── render panel ────────────────────────────────────── */

  var renderPanel = $('renderPanel');
  var renderBar = $('renderBar');
  var renderThumb = $('renderThumb');
  var savePng = $('savePng');

  function closeRender() { renderPanel.hidden = true; }

  $('renderClose').addEventListener('click', closeRender);

  function startRender() {
    renderPanel.hidden = false;
    savePng.hidden = true;
    renderThumb.classList.remove('is-clean');
    renderThumb.style.backgroundImage = 'none';
    renderBar.style.width = '0%';
    $('rEngine').textContent = view.getParam('engine') === 'cycles' ? 'Cycles' : 'EEVEE';
    $('rRes').textContent = canvas.width + ' × ' + canvas.height;
    $('rSamples').textContent = '0 / 128';
    $('rTime').textContent = '0.00s';

    var started = performance.now();
    var duration = 1500;

    cancelAnimationFrame(renderTimer);

    function tick(now) {
      var t = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - t, 1.7);
      renderBar.style.width = (eased * 100).toFixed(1) + '%';
      $('rSamples').textContent = Math.round(eased * 128) + ' / 128';
      $('rTime').textContent = ((now - started) / 1000).toFixed(2) + 's';

      if (t < 1) {
        renderTimer = requestAnimationFrame(tick);
      } else {
        var dataUrl = view.snapshot();
        if (dataUrl) {
          renderThumb.style.backgroundImage = 'url(' + dataUrl + ')';
          renderThumb.classList.add('is-clean');
          var name = 'contribution-city-' + (view.getData() ? view.getData().username : 'city') +
                     '-' + yearSelect.value + '.png';
          savePng.href = dataUrl;
          savePng.download = name;
          savePng.hidden = false;
        }
        toast('Render complete — save it as a PNG');
      }
    }
    renderTimer = requestAnimationFrame(tick);
  }

  $('renderBtn').addEventListener('click', startRender);

  /* ── workspaces (they actually do something) ─────────── */

  Array.prototype.forEach.call(document.querySelectorAll('.ws'), function (tab) {
    tab.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.ws'), function (t) {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      var name = tab.textContent.trim().toLowerCase();
      if (name === 'layout') {
        view.setParam('wire', false);
        view.preset('iso');
        syncToggles();
      } else if (name === 'modeling') {
        view.setParam('wire', true);
        view.preset('front');
        syncToggles();
        toast('Modeling — wireframe on, front view');
      } else if (name === 'shading') {
        var order = ['moss', 'ember', 'ice', 'mono'];
        var idx = (order.indexOf(view.state.paletteKey) + 1) % order.length;
        var next = order[idx];
        view.setPalette(next);
        Array.prototype.forEach.call(document.querySelectorAll('[data-palette]'), function (c) {
          c.classList.toggle('is-active', c.dataset.palette === next);
        });
        toast('Shading — ' + next + ' palette');
      } else if (name === 'render') {
        startRender();
      }
    });
  });

  /* ── menus ───────────────────────────────────────────── */

  var openMenu = null;

  function closeMenus() {
    if (!openMenu) return;
    openMenu.pop.remove();
    openMenu.btn.classList.remove('is-open');
    openMenu = null;
  }

  var MENUS = {
    file: [
      ['Render still (F12)', startRender],
      ['Save last render as PNG', function () {
        if (savePng.hidden) return startRender();
        savePng.click();
      }],
      ['Reset camera', function () { view.preset('iso'); }],
      ['Random handle', function () {
        var handles = ['octocat', 'torvalds', 'gaearon', 'sindresorhus', 'tj', 'addyosmani',
                       'kentcdodds', 'cassidoo', 'mrdoob', 'you'];
        usernameInput.value = handles[Math.floor(Math.random() * handles.length)];
        rebuild();
      }]
    ],
    edit: [
      ['Toggle wireframe (W)', function () { toggleParam('wire', wireBtn); }],
      ['Toggle turntable (T)', function () { toggleParam('turntable', turntableBtn); }],
      ['Toggle contact shadows', function () { toggleParam('contact', tShadow); }]
    ],
    render: [
      ['Render still (F12)', startRender],
      ['Use EEVEE', function () { view.setParam('engine', 'eevee'); syncEngineChip('eevee'); }],
      ['Use Cycles', function () { view.setParam('engine', 'cycles'); syncEngineChip('cycles'); }]
    ],
    help: [
      ['Drag — orbit', function () { toast('Drag to orbit · Shift+drag to pan · scroll to zoom'); }],
      ['1 / 2 / 3 — view presets', function () { view.preset('iso'); }],
      ['About this toy', function () {
        toast('A software renderer in ~700 lines of vanilla JS. No dependencies.');
      }]
    ]
  };

  function syncEngineChip(engine) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-engine]'), function (c) {
      c.classList.toggle('is-active', c.dataset.engine === engine);
    });
    $('statEngine').textContent = engine === 'cycles' ? 'CYCLES' : 'EEVEE';
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-menu]'), function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (openMenu && openMenu.btn === btn) { closeMenus(); return; }
      closeMenus();
      var items = MENUS[btn.dataset.menu] || [];
      var pop = document.createElement('div');
      pop.className = 'menu-pop';
      items.forEach(function (item) {
        var el = document.createElement('button');
        el.type = 'button';
        el.textContent = item[0];
        el.addEventListener('click', function () {
          closeMenus();
          item[1]();
        });
        pop.appendChild(el);
      });
      btn.classList.add('is-open');
      document.body.appendChild(pop);
      var r = btn.getBoundingClientRect();
      pop.style.left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 8) + 'px';
      pop.style.top = r.bottom + 4 + 'px';
      openMenu = { btn: btn, pop: pop };
    });
  });

  document.addEventListener('click', function () { closeMenus(); });

  /* ── keyboard ────────────────────────────────────────── */

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

    if (e.key === 'F12' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      startRender();
      return;
    }
    if (e.key === 'Escape') { closeRender(); closeMenus(); return; }

    var key = e.key.toLowerCase();
    if (key === 'w') { toggleParam('wire', wireBtn); }
    else if (key === 't') { toggleParam('turntable', turntableBtn); }
    else if (key === 's') { toggleParam('contact', tShadow); }
    else if (key === '1') { view.preset('iso'); }
    else if (key === '2') { view.preset('front'); }
    else if (key === '3') { view.preset('top'); }
  });

  /* ── stats + layout ──────────────────────────────────── */

  function refreshStats() {
    var s = view.getStats();
    $('statVerts').textContent = numberWithCommas(s.verts);
    $('statFaces').textContent = numberWithCommas(s.faces);
    $('statFps').textContent = s.fps;
    $('fpsLabel').textContent = s.fps + ' fps';
  }

  setInterval(refreshStats, 500);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () { view.resize(); }).observe(viewport);
  } else {
    window.addEventListener('resize', function () { view.resize(); });
  }

  /* ── boot ────────────────────────────────────────────── */

  setToggle(tShadow, true);
  setToggle(tWire, false);
  setToggle(tTurntable, false);
  rebuild();
  view.start();
  refreshStats();

  setTimeout(hideHint, 9000);

  /* expose for tinkering in the console */
  window.city = { view: view, rebuild: rebuild };
})();
