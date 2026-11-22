/* Renders the palette + type specimens from tokens.json and wires up copying.
   Single source of truth: ./tokens.json (decoded from the Figma document tree). */

const grid = document.getElementById('swatch-grid');
const typeList = document.getElementById('type-list');
const toastEl = document.getElementById('toast');

// app.js lives next to tokens.json, so a document-relative path is enough
// (and keeps the script runnable in environments without import.meta).
const TOKENS_URL = './tokens.json';

/* ---------------------------------------------------------------- helpers */

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API needs a secure context; fall back to a hidden textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* give up quietly */ }
    ta.remove();
  }
  toast(label || `Copied ${text}`);
}

/* WCAG relative luminance + contrast ratio ------------------------------- */
function srgbToLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(hexA, hexB) {
  const a = luminance(hexA), b = luminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/* Where each palette entry actually gets used on this page ---------------- */
const USAGE = {
  'Fuschia/100': ['btn-fuschia', 'tick', 'gradient-end', 'hero-bloom'],
  'Fuschia/80':  ['hover state'],
  'Fuschia/60':  ['badge-fuschia', 'hero-wash'],
  'Iris/100':    ['btn-primary', 'dot', 'meter', 'link-focus'],
  'Iris/80':     ['btn-primary hover'],
  'Iris/60':     ['badge-iris', 'meter track', 'hero-wash']
};

// Figma names them "Fuschia/100" - keep that casing on screen.
const FAMILY_LABEL = { fuschia: 'Fuschia', iris: 'Iris' };

// Shown 100 → 60, exactly the order the styles appear in the Figma panel,
// and explicit because numeric object keys are reordered by JS.
const SHADE_ORDER = ['100', '80', '60'];

/* ---------------------------------------------------------------- palette */

function swatchCard(family, shade, entry, index) {
  const hex = entry.value;
  const name = entry.figmaStyle || `${FAMILY_LABEL[family] || family}/${shade}`;
  const onWhite = contrast(hex, '#ffffff');
  const onInk = contrast(hex, '#000000');
  const best = onWhite >= onInk
    ? { ratio: onWhite, against: 'white' }
    : { ratio: onInk, against: 'ink' };
  const passes = best.ratio >= 4.5;

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'swatch';
  el.style.setProperty('--c', hex);
  el.style.setProperty('--delay', `${index * 55}ms`);
  el.setAttribute('aria-label', `${name}, ${hex}. Activate to copy the hex value.`);

  const uses = USAGE[entry.figmaStyle] || [];
  el.innerHTML = `
    <div class="swatch-chip">
      <span class="swatch-copy">Copy</span>
      <span class="swatch-contrast" data-fail="${!passes}"
            title="Best text contrast on ${best.against}: ${best.ratio.toFixed(2)}:1">
        ${best.ratio.toFixed(2)}:1
      </span>
    </div>
    <div class="swatch-body">
      <div class="swatch-name">${name}</div>
      <div class="swatch-hex">${hex}</div>
      <div class="swatch-use">
        ${uses.map(u => `<span class="chip-mini" style="background:${hex}" title="${u}"></span>`).join('')}
      </div>
    </div>`;

  el.addEventListener('click', () => copy(hex, `${name} → ${hex}`));
  return el;
}

function renderPalette(tokens) {
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const [family, shades] of Object.entries(tokens.color)) {
    if (family !== 'fuschia' && family !== 'iris') continue; // published fills only
    // Object keys that look like integers get reordered by JS, so walk the
    // shades light-to-dark from an explicit order that matches the file.
    for (const shade of SHADE_ORDER) {
      const entry = shades[shade];
      if (!entry) continue;
      frag.appendChild(swatchCard(family, shade, entry, i++));
    }
  }
  grid.replaceChildren(frag);
}

/* ------------------------------------------------------------------- type */

const SPECIMENS = {
  'header-1': '<div class="spec-h1">Build your own team library</div>',
  'header-2': '<div class="spec-h2">Edit team color styles</div>',
  'body': '<p class="spec-body">Published styles are shared with everyone on the team — they can be used by all team members in any of their files. Changing these styles will update them everywhere they\'re used.</p>'
};

function renderType(tokens) {
  const frag = document.createDocumentFragment();

  for (const [key, style] of Object.entries(tokens.typography)) {
    const v = style.value;
    const row = document.createElement('div');
    row.className = 'type-row';
    row.innerHTML = `
      <div class="type-specimen">
        <span class="spec-label">${style.figmaStyle}</span>
        ${SPECIMENS[key] || ''}
      </div>
      <dl class="type-specs">
        <dt>family</dt><dd>${v.fontFamily}</dd>
        <dt>weight</dt><dd>${v.fontWeight}</dd>
        <dt>size</dt><dd>${v.fontSize}px</dd>
        <dt>line</dt><dd>${v.lineHeight}</dd>
        <dt>track</dt><dd>${v.letterSpacing}</dd>
        <dt>node</dt><dd>${style.nodeId}</dd>
      </dl>`;
    row.addEventListener('click', () => copy(
      `${v.fontFamily} ${v.fontWeight} ${v.fontSize}px / ${v.lineHeight} / ${v.letterSpacing}`,
      `${style.figmaStyle} copied`
    ));
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Copy ${style.figmaStyle} font settings`);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
    frag.appendChild(row);
  }
  typeList.replaceChildren(frag);
}

/* ------------------------------------------------------------- css export */

function cssVariables(tokens) {
  const lines = [':root {'];

  for (const [family, shades] of Object.entries(tokens.color)) {
    for (const [shade, entry] of Object.entries(shades)) {
      lines.push(`  --${family}-${shade}: ${entry.value};`);
    }
  }

  lines.push('', '  /* type */');
  for (const [key, style] of Object.entries(tokens.typography)) {
    const v = style.value;
    lines.push(
      `  --${key}-family: "${v.fontFamily}";`,
      `  --${key}-size: ${v.fontSize}px;`,
      `  --${key}-weight: ${v.fontWeight};`,
      `  --${key}-leading: ${v.lineHeight};`,
      `  --${key}-track: ${v.letterSpacing};`
    );
  }

  lines.push('}');
  return lines.join('\n');
}

/* ------------------------------------------------------------------- boot */

async function init() {
  let tokens;
  try {
    const res = await fetch(TOKENS_URL);
    if (!res.ok) throw new Error(`tokens.json → ${res.status}`);
    tokens = await res.json();
  } catch (err) {
    grid.innerHTML = `<p class="t-body" style="grid-column:1/-1">
      Could not load tokens.json (${err.message}). Serve this folder over HTTP —
      <span class="mono">npm run figma</span> — rather than opening the file directly.</p>`;
    return;
  }

  renderPalette(tokens);
  renderType(tokens);

  document.getElementById('copy-css')
    .addEventListener('click', () => copy(cssVariables(tokens), 'CSS variables copied'));

  document.getElementById('download-tokens')
    .addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tokens.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('tokens.json downloaded');
    });
}

init();
