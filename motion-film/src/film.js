/* PARTH- · THE REPOSITORY IS A LIVING PLANET — live design stage (Canvas 2D).
   Same 45s timeline, palette and (verified) on-screen facts as the Python
   master render in render/render.py. Deterministic: seed 541087 (first commit 5a41087).
   This stage is for art-directing edits quickly; the MP4 above is the final render. */
"use strict";
const DUR = 45, CX = 960, CY = 540;
const ICE = "#EAF6FF", CYAN = "#5FF5E2", AMBER = "#FFB347", VIOLET = "#7C5CFF", DIM = "#7896B4";
let seed = 541087;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const STARS = Array.from({ length: 380 }, () => [rnd(), rnd(), rnd(), 0.4 + rnd()]);
const DUST = Array.from({ length: 170 }, () => [rnd() * Math.PI * 2, 120 + rnd() * 760, 0.5 + rnd(), rnd()]);
const SKIN = (() => { const p = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 420; i += 2) { const y = 1 - (i / 418) * 2, r = Math.sqrt(Math.max(0, 1 - y * y));
    p.push([Math.cos(g * i) * r, y, Math.sin(g * i) * r]); } return p; })();

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const env = (t, a, b, fi = 1, fo = 1) => smooth((t - a) / fi) * (1 - smooth((t - (b - fo)) / fo));

const cv = document.getElementById("stage"), ctx = cv.getContext("2d");
const S = cv.width / 1920;
const X = v => v * S;
function txt(s, x, y, size, font, colour, alpha, tracking = 0, align = "center") {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = colour;
  ctx.font = `${font} ${X(size)}px "Space Grotesk", sans-serif`;
  if (font === "mono") ctx.font = `${X(size)}px "DejaVu Sans Mono", monospace`;
  try { ctx.letterSpacing = `${X(tracking)}px`; } catch (e) {}
  ctx.textAlign = align; ctx.textBaseline = "top"; ctx.fillText(s, X(x), X(y)); ctx.restore();
}
function dot(x, y, r, colour, alpha, glow = 0) {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  if (glow) { const g = ctx.createRadialGradient(X(x), X(y), 0, X(x), X(y), X(r * glow));
    g.addColorStop(0, colour); g.addColorStop(1, "transparent"); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X(x), X(y), X(r * glow), 0, 7); ctx.fill(); }
  ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(X(x), X(y), Math.max(0.6, X(r)), 0, 7); ctx.fill(); ctx.restore();
}
function orbit(rx, ry, tilt, colour, alpha, width = 2, dash = 0, cy = CY, arc = 1) {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, X(width));
  ctx.shadowColor = colour; ctx.shadowBlur = X(7);
  if (dash) ctx.setLineDash([X(dash * 5), X(dash * 5)]);
  ctx.translate(X(CX), X(cy)); ctx.rotate(tilt); ctx.scale(1, ry / rx);
  ctx.beginPath(); ctx.arc(0, 0, X(rx), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arc); ctx.stroke(); ctx.restore();
}
const opoint = (a, rx, ry, tilt, cy = CY) => { const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  return [CX + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]; };

function drawStars(t) {
  for (const [fx, fy, d, br] of STARS) {
    const x = CX + (fx * 1920 - CX) * (1 + 0.05 * smooth(t / DUR) * (0.4 + d)) + Math.sin(t * 0.05 + d * 9) * 6 * d;
    const y = CY + (fy * 1080 - CY) * (1 + 0.05 * smooth(t / DUR) * (0.4 + d));
    dot(x, y, 0.7 + d * 1.5, ICE, (0.25 + 0.75 * d) * (0.65 + 0.35 * Math.sin(t * (0.6 + d) + fx * 40)) * br);
  }
}
function act1(t) {
  const a = env(t, 0, 9.4, 0.8, 1), br = 0.5 + 0.5 * Math.sin(t * 1.35);
  dot(CX, CY, 3 + 2 * br, ICE, a, 11);
  for (const [a0, rad, spd, f] of DUST) { const ang = a0 + t * 0.02 * spd;
    dot(CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad * 0.62, 1 + f * 1.4, CYAN, a * (0.25 + 0.5 * f)); }
  txt("EVERY WORLD BEGINS", CX, 648, 74, "300", ICE, env(t, 1.6, 8.8, 1.6, 0.9), 10);
  txt("WITH A SINGLE LINE.", CX, 738, 74, "300", ICE, env(t, 3.4, 8.8, 1.6, 0.9), 10);
  txt("GITHUB.COM/PARTHORIGANAL/PARTH- · 2026 · 10 · 30", CX, 884, 24, "mono", DIM, env(t, 5.2, 8.8, 1.4, 0.9), 4);
}
const mpos = tau => { const e = Math.pow(clamp(tau), 2.1); return [lerp(210, CX, e), lerp(135, CY, Math.pow(e, 0.92)) + Math.sin(e * 2.2) * 26 * (1 - e)]; };
function act2(t) {
  const T0 = 9.4, TI = 12.15;
  if (t <= TI) { const tau = (t - T0) / (TI - T0), [hx, hy] = mpos(tau);
    for (let j = 0; j < 42; j++) { const [px, py] = mpos(Math.max(0, tau - j / 42 * 0.34)), f = Math.pow(1 - j / 42, 1.7);
      dot(px, py + Math.sin(j * 12.99) * j * 0.2, 1.2 + 3.2 * f, AMBER, f, 4); }
    dot(hx, hy, 9, ICE, 1, 5);
    if (hx > 330) txt("5A41087", hx - 168, hy + 44, 27, "mono", AMBER, 0.95, 6);
    return; }
  const dt = t - TI;
  for (let i = 0; i < 3; i++) { const rr = dt * [520, 380, 270][i], al = Math.exp(-dt * 1.15) * (0.8 - i * 0.18);
    if (al > 0.02 && rr < 1500) { ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = i ? CYAN : ICE;
      ctx.lineWidth = X(3 - i * 0.6); ctx.translate(X(CX), X(CY)); ctx.scale(1, 0.62);
      ctx.beginPath(); ctx.arc(0, 0, X(rr), 0, 7); ctx.stroke(); ctx.restore(); } }
  dot(CX, CY, 5, ICE, 1, 8);
  const arc = smooth((t - 13.2) / 2.6), ar = arc * (1 - smooth((t - 18.2) / 0.9));
  orbit(435, 252, -0.14, CYAN, ar * 0.95, 3, 0, CY, Math.max(arc, 0.001));
  if (ar > 0.02) { const [mx, my] = opoint(-0.7, 435, 252, -0.14); txt("BRANCH — MAIN", mx, my - 46, 24, "mono", CYAN, ar, 4); }
  txt("INITIAL COMMIT", CX, 812, 82, "300", ICE, env(t, 13.4, 18.6, 1.1, 0.8), 14);
  txt("THE FIRST LIGHT.", CX, 906, 26, "mono", ICE, env(t, 14.3, 18.6, 1.1, 0.8) * 0.85, 9);
  ["1 COMMIT", "1 BRANCH", "1 FILE"].forEach((s, i) => { const k = env(t, 15.2 + i * 0.45, 18.6, 0.8, 0.8);
    if (k > 0.02) { ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = CYAN; ctx.lineWidth = X(2);
      ctx.beginPath(); ctx.roundRect(X(CX + (i - 1) * 300 - 118), X(952), X(236), X(52), X(26)); ctx.stroke(); ctx.restore();
      txt(s, CX + (i - 1) * 300, 965, 26, "mono", ICE, k, 4); } });
}
function act3(t) {
  const a = env(t, 19, 31.2, 1.2, 1); if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = CYAN; ctx.lineWidth = X(3); ctx.shadowColor = CYAN; ctx.shadowBlur = X(16);
  ctx.fillStyle = "#070C18"; ctx.fillRect(X(420), X(250), X(400), X(660)); ctx.strokeRect(X(420), X(250), X(400), X(660));
  ctx.restore();
  txt("# Parth-", 464, 330, 64, "700", ICE, a, 1, "left");
  if ((t * 1.4) % 1 < 0.62) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = AMBER;
    ctx.fillRect(X(464) + ctx.measureText("# Parth-").width * 2.55, X(336), X(30), X(58)); ctx.restore(); }
  txt("README.MD", 464, 440, 26, "mono", CYAN, a, 5, "left");
  txt("1 LINE · 8 BYTES OF SKY", 464, 486, 23, "mono", DIM, a * 0.9, 3, "left");
  [[CYAN, 0], [VIOLET, 1.7], [AMBER, 3.4]].forEach(([col, ph]) => { const fi = smooth((t - 21.5 - ph * 0.6) / 1.6) * a;
    if (fi <= 0.02) return; ctx.save(); ctx.globalAlpha = fi * 0.9; ctx.strokeStyle = col; ctx.lineWidth = X(2.6);
    ctx.shadowColor = col; ctx.shadowBlur = X(8); ctx.beginPath();
    for (let i = 0; i <= 90; i++) { const u = i / 90, x = lerp(866, 1790, u),
      y = 706 + ph * 52 + Math.sin(u * 5.2 + ph + t * 0.55) * 32 * u + u * u * 110;
      i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y)); } ctx.stroke(); ctx.restore(); });
  txt("RIVERS OF LANGUAGE —", 1330, 566, 27, "mono", ICE, a * 0.95, 6);
  txt("NOT YET CHOSEN", 1330, 606, 27, "mono", AMBER, a, 6);
  const k = env(t, 21, 30.6, 1.4, 0.9);
  txt("A CATHEDRAL", 1330, 300, 76, "300", ICE, k, 6); txt("OF ONE LINE.", 1330, 392, 76, "300", ICE, k, 6);
  txt("STRUCTURE — 1 FILE · FOLDERS UNBORN", 620, 988, 23, "mono", VIOLET, a * 0.85, 4);
}
function planet(R, cy, t, alpha, skin = true) {
  if (R <= 12) return;
  const g = ctx.createRadialGradient(X(CX - R * 0.38), X(cy - R * 0.34), X(R * 0.1), X(CX), X(cy), X(R));
  g.addColorStop(0, "#3E8FA3"); g.addColorStop(0.45, "#1B4A5E"); g.addColorStop(0.8, "#0A2233"); g.addColorStop(1, "#050A18");
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(X(CX), X(cy), X(R), 0, 7); ctx.fill();
  ctx.strokeStyle = CYAN; ctx.globalAlpha = clamp(alpha) * 0.5; ctx.lineWidth = X(2); ctx.stroke(); ctx.restore();
  if (!skin) return;
  const rot = t * 0.16, tilt = -0.42;
  for (const [x, y, z] of SKIN) { const xr = x * Math.cos(rot) - z * Math.sin(rot), zr = x * Math.sin(rot) + z * Math.cos(rot);
    const yr = y * Math.cos(tilt) - zr * Math.sin(tilt), zz = y * Math.sin(tilt) + zr * Math.cos(tilt);
    if (zz < 0.05) continue; const tw = 0.5 + 0.5 * Math.sin(t * 1.1 + x * 7 + y * 5); if (tw < 0.45) continue;
    dot(CX + xr * R * 0.99, cy + yr * R * 0.99, 0.9 + 1.3 * zz, CYAN, alpha * zz * tw * 0.9); }
}
function act4(t) {
  const a = env(t, 31, 40.4, 1.2, 0.9), grow = easeOut((t - 31.4) / 3.4), PCY = 518, k = a * smooth((t - 33) / 1.6);
  planet(298 * grow, PCY, t, a * grow);
  orbit(500, 288, -0.15, CYAN, k * 0.9, 3, 0, PCY); orbit(612, 296, 0.09, VIOLET, k * 0.9, 2, 6, PCY);
  if (k > 0.02) { const [mx, my] = opoint(t * 0.42, 500, 288, -0.15, PCY); dot(mx, my, 5, ICE, k, 5);
    txt("5A41087 · MAIN", mx + (mx < CX ? -150 : 150), my - 14, 22, "mono", AMBER, k * 0.95, 3);
    const [lx, ly] = opoint(0.85, 612, 296, 0.09, PCY); txt("FUTURE BRANCH", lx, ly + 32, 21, "mono", VIOLET, k * 0.85, 4); }
  txt("NO RELEASES.  NO STARS YET.", CX, 100, 27, "mono", DIM, env(t, 34.2, 39.8, 1.3, 0.8), 8);
  txt("ONLY GRAVITY.", CX, 868, 94, "300", ICE, env(t, 35.8, 39.8, 1.4, 0.8), 16);
}
function act5(t) {
  const sink = easeOut((t - 40.1) / 2);
  planet(lerp(298, 470, sink), lerp(518, 1140, sink), t, 1, sink < 0.6);
  let x = CX - 430; const y = 252 - (1 - easeOut((t - 40.4) / 1.5)) * 40;
  "PARTH".split("").forEach((ch, i) => { const ka = smooth((t - 40.5 - i * 0.13) / 0.9);
    txt(ch, x, y + (1 - ka) * 30, 215, "700", ICE, ka, 2, "left");
    ctx.font = `700 ${X(215)}px "Space Grotesk", sans-serif`; x += ctx.measureText(ch).width / S + 8; });
  const kh = smooth((t - 41.3) / 0.9);
  if (kh > 0.02) { ctx.save(); ctx.globalAlpha = kh; ctx.fillStyle = AMBER; ctx.shadowColor = AMBER; ctx.shadowBlur = X(20);
    ctx.fillRect(X(x + 4), X(y + 108), X(96 * kh), X(26)); ctx.restore(); }
  txt("THE REPOSITORY IS A LIVING PLANET", CX, 548, 31, "mono", ICE, smooth((t - 42.3) / 1.2), 11);
  txt("IT HAS JUST BEGUN TO BREATHE", CX, 600, 27, "mono", CYAN, smooth((t - 43) / 1.2), 9);
  const k4 = smooth((t - 43.6) / 1);
  txt("1 FILE · 1 COMMIT · 1 BRANCH", CX, 856, 24, "mono", ICE, k4, 5);
  txt("EVERYTHING ELSE — UNWRITTEN", CX, 898, 23, "mono", DIM, k4, 5);
  txt("GITHUB.COM/PARTHORIGANAL/PARTH-", CX, 944, 21, "mono", DIM, k4 * 0.9, 4);
}
export function drawFrame(t) {
  const bg = ctx.createRadialGradient(X(CX), X(CY), 0, X(CX), X(CY), X(1200));
  bg.addColorStop(0, "#070B1C"); bg.addColorStop(0.6, "#04050F"); bg.addColorStop(1, "#010208");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  drawStars(t);
  if (t < 10) act1(t);
  if (t > 8.8 && t < 19.6) act2(t);
  if (t > 18.4 && t < 32) act3(t);
  if (t > 30.4 && t < 40.6) act4(t);
  if (t >= 39.9) act5(t);
  const bar = X(1080 * (0.045 + 0.05 * smooth((t - 40) / 2)));
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, bar); ctx.fillRect(0, cv.height - bar, cv.width, bar);
  const k = Math.min(smooth(t / 1.4), 1 - smooth((t - 44.55) / 0.45));
  if (k < 0.999) { ctx.fillStyle = `rgba(0,0,0,${1 - k})`; ctx.fillRect(0, 0, cv.width, cv.height); }
}
/* transport */
const $ = id => document.getElementById(id);
let playing = true, t0 = performance.now(), base = 0;
export function seek(sec, play = true) { base = clamp(sec, 0, DUR - 0.01); t0 = performance.now(); playing = play; syncBtn(); if (!play) drawFrame(base); }
function now() { return playing ? (base + (performance.now() - t0) / 1000) % DUR : base; }
function syncBtn() { $("playBtn").textContent = playing ? "❚❚ Pause" : "▶ Play"; }
$("playBtn").addEventListener("click", () => { playing ? (base = now()) : (t0 = performance.now()); playing = !playing; syncBtn(); });
$("scrub").addEventListener("input", e => seek(parseFloat(e.target.value), playing));
document.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => seek(parseFloat(b.dataset.act))));
(function loop() { const t = now(); drawFrame(t);
  $("tc").textContent = `${t.toFixed(1).padStart(4, "0")}s / 45.0s`;
  if (document.activeElement !== $("scrub")) $("scrub").value = t;
  requestAnimationFrame(loop); })();
syncBtn();
