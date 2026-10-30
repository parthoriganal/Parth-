/* ═══════════════════════════════════════════════════════════════════
   app.js — wires the HUD, the GitHub data, the galaxy and the sound
   ═══════════════════════════════════════════════════════════════════ */

import { Cosmos, LAYOUT_LABELS } from './engine.js';
import { Sonifier } from './audio.js';

const $ = (id) => document.getElementById(id);

/* ── formatting ─────────────────────────────────────────────────── */

const compact = (n) =>
  n == null
    ? '—'
    : n >= 1e6
      ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'
      : n >= 1e3
        ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k'
        : String(n);

const monthYear = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

const fullDate = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Rust: '#dea584',
  Go: '#00ADD8', C: '#8b949e', 'C++': '#f34b7d', Java: '#b07219', PHP: '#4F5D95',
  Ruby: '#701516', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Shell: '#89e051',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Elixir: '#6e4a7e',
  'C#': '#178600', Vue: '#41b883', Svelte: '#ff3e00', 'Objective-C': '#438eff',
  Haskell: '#5e5086', Lua: '#000080', Dockerfile: '#384d54', Nix: '#7e7eff',
  Zig: '#ec915c', Makefile: '#427819', PowerShell: '#012456', Assembly: '#6E4C13',
};

const langColor = (name) =>
  LANG_COLORS[name] || `hsl(${(name.length * 47) % 360} 68% 60%)`;

/* ── boot ───────────────────────────────────────────────────────── */

const cosmos = new Cosmos({
  bgCanvas: $('bg'),
  fxCanvas: $('fx'),
  onIgnite: (commit, index) => sonifier.noteForCommit(commit, index, cosmos.commits.length),
  onTick: (t, date) => updateTimeline(t, date),
  onHover: (commit, x, y) => showTooltip(commit, x, y),
  onSelect: (commit) => selectCommit(commit),
});

// posterize the background while nothing is loaded
cosmos.paintBackground();

const sonifier = new Sonifier();
cosmos.muted = new Set();

const state = {
  loaded: null,
  loading: false,
  entered: false,
  speedIdx: 0,
  speeds: [1, 2, 4, 0.5],
  soundOn: true,
  warp: false,
  scrub: false,
};

/* ── loader ─────────────────────────────────────────────────────── */

const LOADER_LINES = [
  'Pulling commits from orbit…',
  'Colouring stars by author…',
  'Bench-pressing the GitHub API…',
  'Replaying years of history…',
  'Tuning the reverb to your repo…',
  'Aligning spiral arms…',
  'Asking the maintainers nicely…',
];

let loaderTimer = null;
function showLoader(text) {
  const el = $('loader');
  el.hidden = false;
  $('loaderText').textContent = text || LOADER_LINES[0];
  clearInterval(loaderTimer);
  let i = 0;
  loaderTimer = setInterval(() => {
    i = (i + 1) % LOADER_LINES.length;
    $('loaderText').textContent = LOADER_LINES[i];
  }, 1100);
}
function hideLoader() {
  $('loader').hidden = true;
  clearInterval(loaderTimer);
}

let toastTimer = null;
function toast(msg, bad = false) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('bad', bad);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3400);
}

/* ── data loading ───────────────────────────────────────────────── */

async function loadRepo(input, { enter = true, silent = false } = {}) {
  const repo = String(input || '').trim();
  if (!repo || state.loading) return;

  state.loading = true;
  showLoader();

  try {
    const res = await fetch(`/api/repo?repo=${encodeURIComponent(repo)}&limit=300`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load that repo.');

    if (!data.commits || data.commits.length < 2) {
      throw new Error(`"${data.repo.fullName}" has almost no commit history to draw.`);
    }

    cosmos.setData(data);
    renderRepoCard(data);
    renderCast(data);
    state.loaded = data;

    const canonical = data.repo.fullName;
    $('repoLink').href = data.repo.url;
    if (!silent) {
      history.replaceState(null, '', `#${canonical}`);
      $('hudInput').value = canonical;
      document.title = `${canonical} · Repo Cosmos`;
    }

    if (enter && !state.entered) enterApp();
    if (state.entered) setTimeout(() => cosmos.drawSparkline(), 60);
    if (state.entered) {
      sonifier.flourish();
      toast(`✦ ${canonical} — ${data.commits.length} commits turned into stars`);
    }
  } catch (err) {
    toast(err.message || 'Something went sideways.', true);
    if (!state.entered) $('introInput').focus();
  } finally {
    state.loading = false;
    hideLoader();
  }
}

/* ── repo card ──────────────────────────────────────────────────── */

function renderRepoCard(data) {
  const r = data.repo;
  $('repoAvatar').src = r.avatar || '';
  $('repoAvatar').alt = r.owner || '';
  $('repoOwner').textContent = r.owner || '';
  $('repoName').textContent = r.name || '';
  $('repoDesc').textContent = r.description || 'No description. Mysterious.';
  $('statStars').textContent = compact(r.stars);
  $('statForks').textContent = compact(r.forks);
  $('statCommits').textContent = compact(data.commits.length);
  $('statAuthors').textContent = String(data.contributors.length || cosmos.authors.length);

  // languages
  const bar = $('langBar');
  const legend = $('langLegend');
  bar.innerHTML = '';
  legend.innerHTML = '';
  for (const l of data.languages.slice(0, 6)) {
    const color = langColor(l.name);
    const seg = document.createElement('i');
    seg.style.flex = `${Math.max(2, l.pct)}`;
    seg.style.background = color;
    seg.title = `${l.name} ${l.pct}%`;
    bar.appendChild(seg);

    const item = document.createElement('span');
    item.innerHTML = `<em style="background:${color}"></em>${l.name} ${l.pct}%`;
    legend.appendChild(item);
  }

  const first = data.commits[0].date;
  const last = data.commits[data.commits.length - 1].date;
  const years = ((last - first) / (1000 * 3600 * 24 * 365.25)).toFixed(1);
  $('repoSpan').textContent =
    `${fullDate(first)} → ${fullDate(last)} · ${years} yrs` +
    (data.truncated ? ' · last 300 commits' : '');

  $('tlStart').textContent = monthYear(first);
  $('tlEnd').textContent = monthYear(last);
  $('readoutLeft').textContent = `${data.commits.length} stars · ${cosmos.authors.length} authors`;
  $('readoutRight').textContent = data.cached ? 'served from cache' : 'live from github api';
}

/* ── cast ───────────────────────────────────────────────────────── */

function renderCast(data) {
  const list = $('castList');
  list.innerHTML = '';
  const authors = cosmos.authors.slice(0, 24);
  $('castMeta').textContent = `${cosmos.authors.length} authors`;

  for (const a of authors) {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${a.avatar || ''}" alt="" loading="lazy" />
      <span class="who" style="color:${a.color}">${escapeHtml(a.login)}</span>
      <span class="num">${a.count}</span>`;
    li.title = `${a.login} · ${a.count} commits in view (click to isolate)`;
    li.dataset.key = a.key;
    li.addEventListener('click', () => {
      const on = !cosmos.muted.has(a.key);
      if (on) cosmos.muted.add(a.key);
      else cosmos.muted.delete(a.key);
      li.classList.toggle('muted', on);
      if (on) showTooltip(null);
      toast(
        on
          ? `muted ${a.login} — ${a.count} stars dimmed`
          : `unmuted ${a.login}`
      );
    });
    list.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ── timeline ───────────────────────────────────────────────────── */

function updateTimeline(t, date) {
  const pct = (t * 100).toFixed(2);
  $('tlFill').style.width = pct + '%';
  $('tlHead').style.left = pct + '%';
  $('tlNow').textContent = date ? fullDate(date) : '—';
}

function scrubFromEvent(e) {
  const rect = $('timeline').getBoundingClientRect();
  const t = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  cosmos.pause();
  cosmos.setPlayT(t);
  updatePlayButton();
}

/* ── tooltip ────────────────────────────────────────────────────── */

function showTooltip(commit, x, y) {
  const tip = $('tooltip');
  if (!commit) {
    tip.hidden = true;
    return;
  }
  tip.hidden = false;
  $('ttAuthor').textContent = commit.login || commit.authorName || 'anonymous';
  $('ttAuthor').style.color = commit.color;
  tip.querySelector('.tt-dot').style.background = commit.color;
  tip.querySelector('.tt-dot').style.color = commit.color;
  $('ttMsg').textContent = commit.message || '(no message)';
  $('ttDate').textContent = fullDate(commit.date);
  $('ttSha').textContent = commit.short;

  const pad = 14;
  const w = tip.offsetWidth;
  const left = Math.min(window.innerWidth - w / 2 - pad, Math.max(w / 2 + pad, x));
  tip.style.left = left + 'px';
  tip.style.top = Math.max(tip.offsetHeight + 18, y) + 'px';
}

/* ── commit inspector ───────────────────────────────────────────── */

async function selectCommit(commit) {
  const panel = $('inspectPanel');
  if (!commit) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  $('inspectAvatar').src = commit.avatar || '';
  $('inspectAuthor').textContent = commit.login || commit.authorName;
  $('inspectAuthor').style.color = commit.color;
  $('inspectDate').textContent = `${fullDate(commit.date)} · ${commit.short}`;
  $('inspectMsg').textContent = commit.message || '(no message)';
  $('inspectDiff').innerHTML = '';
  $('inspectFiles').innerHTML = '';
  $('inspectLink').href = commit.url;

  if (!state.loaded) return;
  const repo = state.loaded.repo.fullName;
  const stash = commit.sha;

  try {
    const res = await fetch(
      `/api/commit?repo=${encodeURIComponent(repo)}&sha=${commit.sha}`
    );
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'no stats');
    if (cosmos.selected?.c?.sha !== stash) return; // user moved on
    $('inspectDiff').innerHTML = `
      <span class="add">+${d.additions.toLocaleString()}</span>
      <span class="del">−${d.deletions.toLocaleString()}</span>
      <span style="color:var(--faint)">${d.files.length} files</span>`;
    $('inspectFiles').innerHTML = d.files
      .slice(0, 8)
      .map(
        (f) =>
          `<div><span>${escapeHtml(f.name)}</span><span style="color:#6ee7a8">+${f.additions}</span></div>`
      )
      .join('');
  } catch {
    $('inspectDiff').innerHTML = '<span style="color:var(--faint)">diff stats unavailable</span>';
  }
}

/* ── transport ──────────────────────────────────────────────────── */

function updatePlayButton() {
  const btn = $('playBtn');
  const playing = cosmos.playing;
  btn.classList.toggle('playing', playing);
  btn.querySelector('.ic-play').hidden = playing;
  btn.querySelector('.ic-pause').hidden = !playing;
}

async function togglePlay() {
  await sonifier.ensure();
  cosmos.toggle();
  if (cosmos.playing) sonifier.startDrone();
  updatePlayButton();
}

function setSound(on) {
  state.soundOn = on;
  sonifier.setEnabled(on);
  const btn = $('soundBtn');
  btn.classList.toggle('on', on);
  btn.querySelector('.eq').classList.toggle('live', on && cosmos.playing);
  btn.lastChild.textContent = on ? ' SOUND' : ' MUTED';
  if (on) sonifier.ensure().then(() => sonifier.startDrone());
}

function setWarp(on) {
  state.warp = on;
  cosmos.setWarp(on);
  sonifier.setWarping(on);
  $('warpBtn').classList.toggle('warping', on);
  if (on) {
    if (!cosmos.playing) cosmos.play();
    updatePlayButton();
  }
}

function cycleLayout() {
  const next = cosmos.cycleLayout();
  $('layoutBtn').textContent = LAYOUT_LABELS[next];
  toast(`layout → ${next}`);
}

/* ── keyboard ───────────────────────────────────────────────────── */

function onKey(e) {
  if (e.target.matches('input, textarea')) return;

  if (!$('helpModal').hidden) {
    if (e.key === 'Escape' || e.key === '?') $('helpModal').hidden = true;
    return;
  }

  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (state.entered) togglePlay();
      break;
    case 'l':
    case 'L':
      cycleLayout();
      break;
    case 'w':
    case 'W':
      setWarp(!state.warp);
      break;
    case 'm':
    case 'M':
      setSound(!state.soundOn);
      break;
    case 'ArrowRight':
      if (state.entered) {
        cosmos.step(1);
        updatePlayButton();
        e.preventDefault();
      }
      break;
    case 'ArrowLeft':
      if (state.entered) {
        cosmos.step(-1);
        updatePlayButton();
        e.preventDefault();
      }
      break;
    case '?':
      $('helpModal').hidden = false;
      break;
    case 'Escape':
      $('helpModal').hidden = true;
      $('inspectPanel').hidden = true;
      cosmos.selected = null;
      break;
    default:
      break;
  }
}

/* ── intro / enter ──────────────────────────────────────────────── */

function enterApp() {
  state.entered = true;
  const intro = $('intro');
  intro.classList.add('leaving');
  setTimeout(() => (intro.hidden = true), 700);
  $('hud').hidden = false;
  setTimeout(() => {
    $('layoutBtn').textContent = LAYOUT_LABELS[cosmos.layout];
    cosmos.drawSparkline();
  }, 60);
}

/* ── events ─────────────────────────────────────────────────────── */

$('introForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const val = $('introInput').value.trim();
  await sonifier.ensure();
  if (!val) {
    // no input: just enter with the preloaded galaxy
    enterApp();
    sonifier.flourish();
    return;
  }
  await loadRepo(val, { enter: true });
});

$('hudForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadRepo($('hudInput').value, { enter: false });
});

$('surpriseBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/explore');
    const { items } = await res.json();
    const pick = items[Math.floor(Math.random() * items.length)];
    $('hudInput').value = pick.repo;
    await loadRepo(pick.repo);
  } catch {
    toast('Could not find a surprise. Rude.', true);
  }
});

$('playBtn').addEventListener('click', togglePlay);
$('layoutBtn').addEventListener('click', cycleLayout);
$('soundBtn').addEventListener('click', () => setSound(!state.soundOn));
$('speedBtn').addEventListener('click', () => {
  state.speedIdx = (state.speedIdx + 1) % state.speeds.length;
  const s = state.speeds[state.speedIdx];
  cosmos.setSpeed(s);
  $('speedBtn').textContent = s + '×';
});
$('warpBtn').addEventListener('click', () => setWarp(!state.warp));

$('helpBtn').addEventListener('click', () => ($('helpModal').hidden = false));
$('helpClose').addEventListener('click', () => ($('helpModal').hidden = true));
$('inspectClose').addEventListener('click', () => {
  $('inspectPanel').hidden = true;
  cosmos.selected = null;
});

const timeline = $('timeline');
timeline.addEventListener('pointerdown', (e) => {
  state.scrub = true;
  timeline.setPointerCapture(e.pointerId);
  scrubFromEvent(e);
});
timeline.addEventListener('pointermove', (e) => {
  if (state.scrub) scrubFromEvent(e);
});
timeline.addEventListener('pointerup', () => (state.scrub = false));
timeline.addEventListener('pointercancel', () => (state.scrub = false));
timeline.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') cosmos.step(1);
  if (e.key === 'ArrowLeft') cosmos.step(-1);
});


/* ── poster: composite both canvas layers into a shareable PNG ────── */

function posterBlurb() {
  const d = state.loaded;
  if (!d) return '';
  const r = d.repo;
  return `${r.fullName}  ·  ${d.commits.length} commits  ·  ${compact(r.stars)} stars`;
}

$('posterBtn').addEventListener('click', () => {
  if (!state.loaded) return;
  const W = cosmos.fx.width;
  const H = cosmos.fx.height;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');

  g.fillStyle = '#05030e';
  g.fillRect(0, 0, W, H);
  g.drawImage(cosmos.bg, 0, 0, W, H);
  g.drawImage(cosmos.fx, 0, 0, W, H);

  // caption block
  const pad = Math.round(W * 0.035);
  const s = W / 1440;
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(234,240,255,0.95)';
  g.font = `600 ${Math.round(30 * s)}px "Space Grotesk", system-ui, sans-serif`;
  g.fillText(state.loaded.repo.fullName, pad, H - pad - Math.round(42 * s));
  g.fillStyle = 'rgba(142,147,184,0.95)';
  g.font = `400 ${Math.round(16 * s)}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillText(posterBlurb(), pad, H - pad - Math.round(16 * s));
  g.fillStyle = 'rgba(124,243,255,0.85)';
  g.font = `500 ${Math.round(13 * s)}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillText('REPO COSMOS', W - pad - Math.round(110 * s), H - pad - Math.round(16 * s));

  const a = document.createElement('a');
  a.download = `${state.loaded.repo.fullName.replace('/', '-')}-cosmos.png`;
  a.href = out.toDataURL('image/png');
  a.click();
  toast('✦ poster saved — every star is a real commit');
});

window.addEventListener('keydown', onKey);
window.addEventListener('resize', () => cosmos.drawSparkline());

/* keep the eq animation honest */
setInterval(() => {
  const eq = $('soundBtn')?.querySelector('.eq');
  if (eq) eq.classList.toggle('live', state.soundOn && cosmos.playing);
  updatePlayButton();
}, 350);

/* ── presets + preload ──────────────────────────────────────────── */

const FALLBACK_PRESETS = [
  'facebook/react', 'torvalds/linux', 'microsoft/vscode',
  'rust-lang/rust', 'supabase/supabase', 'vercel/next.js',
  'sveltejs/svelte', 'd3/d3',
];

async function renderPresets() {
  let items = FALLBACK_PRESETS.map((repo) => ({ repo }));
  try {
    const res = await fetch('/api/explore');
    if (res.ok) items = (await res.json()).items;
  } catch { /* offline-ish: fallback */ }

  const host = $('introPresets');
  host.innerHTML = '';
  for (const item of items.slice(0, 8)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.textContent = item.repo;
    if (item.hint) b.title = item.hint;
    b.addEventListener('click', async () => {
      $('introInput').value = item.repo;
      await sonifier.ensure();
      loadRepo(item.repo, { enter: true });
    });
    host.appendChild(b);
  }
}

async function boot() {
  renderPresets();

  const fromHash = decodeURIComponent(location.hash.replace(/^#\/?/, '')).trim();
  const initial = fromHash || 'facebook/react';

  $('introInput').value = fromHash || '';
  if (!fromHash) $('introInput').placeholder = 'facebook/react';

  // preload a galaxy so the intro sits on top of a living cosmos
  await loadRepo(initial, { enter: !!fromHash, silent: !fromHash });
  cosmos.autoRotate = true;
}

boot();
