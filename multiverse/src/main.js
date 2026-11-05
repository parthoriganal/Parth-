import * as THREE from '../vendor/three.module.min.js';
import { createWorld } from './world/world.js';
import { PostPipeline } from './core/post.js';
import { Timeline, CHAPTERS, FILM_DURATION } from './film/timeline.js';
import { Score } from './film/score.js';
import { Hud } from './ui/hud.js';
import { clamp, smoothstep } from './core/math.js';

const ids = ['app','scene','chapterStrip','coverChapters','timelineTicks','timeTotal','timeNow','playBtn','restartBtn','soundBtn','coverSoundBtn','fullBtn','startBtn','replayBtn','timeline','timelineFill','timelineHead','coverLoaderFill','coverLoadingText','cover','caption','captionNum','captionTitle','captionDesc','coverSoundLabel','endcard','toast','fallback'];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const hud = new Hud({ chapters: CHAPTERS, duration: FILM_DURATION, elements: el });
const score = new Score();
const params = new URLSearchParams(location.search);
let renderer, world, post, timeline, camera;
let ready = false, started = false, playing = false, time = 0, last = performance.now();
let ratio = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.5);
let idleAt = performance.now();
let hiddenPlaying = false;
const center = new THREE.Vector3(), projected = new THREE.Vector3();
const screen = new THREE.Vector2();

function resize() {
  if (!renderer) return;
  const w = el.app.clientWidth, h = el.app.clientHeight;
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  post.setSize(w, h, ratio);
}
function renderAt(t, dt = 1 / 60) {
  const state = timeline.sample(t);
  world.update(dt, t, state, ratio);
  camera.position.copy(state.camera.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(state.camera.target);
  camera.rotateZ(state.camera.roll * Math.PI / 180);
  camera.fov = state.camera.fov + (camera.aspect < 1 ? 16 : 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  post.setGrade(state.palette);
  projected.copy(center).project(camera);
  screen.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
  post.setPortal(screen, Math.min(0.65, 8 / Math.max(8, camera.position.length())), state.effects.portalForm * (1 - smoothstep(49, 53, t)));
  post.setEffects({ ...state.effects, time: t, flash: clamp(state.effects.flash), fade: started ? state.effects.fade : 1 });
  post.render(world.scene, camera);
  if (started) {
    hud.update(state);
    if (playing) score.update(t, state);
    if (state.effects.endCard) hud.showEndCard();
  }
  return state;
}
function setPlaying(v) {
  playing = v;
  hud.setPlaying(v);
  if (score.ctx) {
    if (v) score.resume();
    else score.ctx.suspend().catch(() => {});
  }
}
function begin(at = 0) {
  if (!ready) return;
  if (!started) { started = true; hud.beginFilm(); score.start(); }
  time = clamp(at, 0, FILM_DURATION);
  score.lastTime = time;
  hud.hideEndCard();
  setPlaying(true);
  renderAt(time, 1);
}
function seek(t) {
  if (!started) return begin(t);
  time = clamp(t, 0, FILM_DURATION);
  score.lastTime = time;
  if (time < 76.2) hud.hideEndCard();
  renderAt(time, 1);
}
function sound() {
  score.setMuted(!score.muted);
  hud.setMuted(score.muted);
  if (started) score.resume();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el.app.requestFullscreen) await el.app.requestFullscreen();
    else hud.toast('Fullscreen is not supported here');
  } catch { hud.toast('Open the hosted page for fullscreen'); }
}
hud.setCallbacks({
  onStart: () => begin(0), onRestart: () => { score.reset(); begin(0); },
  onToggle: () => started ? setPlaying(!playing) : begin(),
  onChapter: i => started ? seek(CHAPTERS[i].start + 0.1) : begin(CHAPTERS[i].start + 0.1),
  onSeek: seek, onSound: sound, onFullscreen: fullscreen,
});
hud.setMuted(false);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenPlaying = playing; setPlaying(false); }
  else if (hiddenPlaying) { setPlaying(true); last = performance.now(); }
});
document.addEventListener('pointermove', () => { idleAt = performance.now(); hud.setIdle(false); });
document.addEventListener('keydown', e => {
  if (e.target.closest('button, a, [role="slider"]')) return;
  if (e.code === 'Space') { e.preventDefault(); started ? setPlaying(!playing) : begin(); }
  if (e.key.toLowerCase() === 'r') begin(0);
  if (e.key.toLowerCase() === 'm') sound();
  if (e.key.toLowerCase() === 'f') fullscreen();
  if (/^[1-5]$/.test(e.key)) begin(CHAPTERS[Number(e.key)-1].start + 0.1);
});

async function init() {
  try {
    hud.setLoadProgress(0.1, 'Lighting the deep field');
    renderer = new THREE.WebGLRenderer({ canvas: el.scene, antialias: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor('#02030a');
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
    timeline = new Timeline(THREE);
    await new Promise(requestAnimationFrame);
    world = createWorld({ starCount: innerWidth < 700 ? 1100 : 1700 });
    hud.setLoadProgress(0.65, 'Opening the iris');
    post = new PostPipeline(THREE, renderer, { quality: innerWidth < 700 ? 'medium' : 'high' });
    resize();
    renderer.compile(world.scene, camera);
    renderAt(19, 1);
    ready = true;
    hud.setReady();
    // Deterministic inspection API, also useful for capturing a hosted frame.
    window.aetherbound = { seek, play: () => begin(time), pause: () => setPlaying(false),
      renderAt: t => { started = true; time = t; return renderAt(t, 1); },
      get time() { return time; }, get renderer() { return renderer; } };
    if (params.has('t')) { begin(Number(params.get('t')) || 0); setPlaying(false); }
    if (params.has('autoplay')) begin(0);
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (document.hidden) return;
      if (playing) {
        time = Math.min(FILM_DURATION, time + dt);
        if (time >= FILM_DURATION) setPlaying(false);
      }
      if (playing || !started) renderAt(started ? time : 19 + Math.sin(now * 0.00008) * 0.3, dt);
      if (started && playing && now - idleAt > 6000) hud.setIdle(true);
    }
    requestAnimationFrame(frame);
  } catch (err) {
    console.error('AETHERBOUND initialization failed:', err);
    hud.showFallback();
  }
}
el.scene.addEventListener('webglcontextlost', e => { e.preventDefault(); setPlaying(false); hud.toast('Graphics context lost — reload to restore'); });
init();
