/* ═══════════════════════════════════════════════════════════════════
   audio.js — the repo, but you can hear it
   Tiny Web Audio synth: plucked strings in a minor pentatonic scale,
   a convolution reverb built from noise, and a sub drone for gravity.
   ═══════════════════════════════════════════════════════════════════ */

const PENTATONIC = [0, 3, 5, 7, 10]; // minor pentatonic, in semitones
const ROOT = 220; // A3

function freqFor(degree, octave = 0) {
  const semi = PENTATONIC[((degree % 5) + 5) % 5] + 12 * (Math.floor(degree / 5) + octave);
  return ROOT * Math.pow(2, semi / 12);
}

export class Sonifier {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.42;
    this.lastNote = 0;
    this.minGap = 52; // ms — keeps dense repos from turning into mush
    this.warping = false;
    this.droneOn = false;
  }

  /** must be called from a user gesture */
  async ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();

      // master chain
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 24;
      this.comp.ratio.value = 6;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.22;

      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);

      // reverb send
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.6, 2.6);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.5;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return true;
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * 0.004 ? i / (rate * 0.004) : 1);
      }
    }
    return buf;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        on ? this.volume : 0,
        this.ctx.currentTime + 0.15
      );
    }
    if (!on) this.stopDrone();
  }

  setWarping(on) {
    this.warping = on;
    if (on) this.minGap = 90;
    else this.minGap = 52;
  }

  /* ── one commit = one note ─────────────────────────────────────── */

  noteForCommit(commit, index, total) {
    if (!this.ctx || !this.enabled) return;

    const now = performance.now();
    if (now - this.lastNote < this.minGap) return;
    this.lastNote = now;

    // musical mapping: each author owns a scale degree, the repo climbs
    // an octave as its history progresses, merges add a raised colour tone.
    const author = commit.authorIdx ?? 0;
    const degree = (author % 5) + ((author * 7 + index) % 4 === 0 ? 5 : 0);
    const octave = commit.t > 0.62 ? 1 : 0;
    const freq = freqFor(degree, octave);
    const vel = 0.14 + Math.min(0.3, (commit.weight || 3) / 22);
    const pan = ((commit.seed ?? 0.5) - 0.5) * 1.4;

    this.pluck(freq, {
      vel,
      pan,
      when: this.ctx.currentTime + 0.005,
      decay: 1.35 + (commit.weight || 3) * 0.05,
      bright: commit.isMerge ? 0.6 : 1,
    });

    // merges get a soft noise tick — a hi-hat from the void
    if (commit.isMerge) this.tick(this.ctx.currentTime + 0.01, 0.05, pan);
    // every 16th commit, a low anchor note
    if (index % 16 === 0) this.bass(freqFor(0, 0) / 2, this.ctx.currentTime + 0.02, 0.1);
  }

  pluck(freq, { vel = 0.2, pan = 0, when = 0, decay = 1.4, bright = 1 } = {}) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;

    const out = ctx.createGain();
    out.gain.value = 0;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      out.connect(panner);
      panner.connect(this.master);
      panner.connect(this.reverb);
    } else {
      out.connect(this.master);
      out.connect(this.reverb);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(Math.min(9000, freq * (7 * bright)), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 2.2), t + 0.42);
    filter.connect(out);

    // fundamental + a quiet octave shimmer
    const oscs = [
      { type: 'triangle', mul: 1, gain: 1.0 },
      { type: 'sine', mul: 2.002, gain: 0.32 },
      { type: 'sine', mul: 1.5, gain: 0.14 },
    ];
    for (const o of oscs) {
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = freq * o.mul;
      const g = ctx.createGain();
      g.gain.value = o.gain;
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + decay + 0.25);
    }

    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vel, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0008, t + decay);

    // gentle noise attack for "string" feel
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer || (this._noiseBuffer = this._makeNoise(0.05));
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
    noise.connect(ng);
    ng.connect(out);
    noise.start(t);
  }

  bass(freq, when, vel = 0.1) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 2.2);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 2.4);
  }

  tick(when, vel, pan) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._tickBuffer || (this._tickBuffer = this._makeNoise(0.06));
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 6200;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.09);
    src.connect(bp);
    bp.connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      g.connect(p);
      p.connect(this.master);
      p.connect(this.reverb);
    } else {
      g.connect(this.master);
    }
    src.start(t);
  }

  _makeNoise(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = this.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ── ambient drone ───────────────────────────────────────────── */

  startDrone() {
    if (!this.ctx || this.droneOn) return;
    this.droneOn = true;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 3.5);
    g.connect(this.master);
    g.connect(this.reverb);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.connect(g);

    const oscs = [];
    [55, 82.5, 110, 164.81].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f * (1 + (i % 2 ? 0.0015 : -0.001));
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 0.9 : 0.22 / i;

      // slow LFO per voice for a breathing pad
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.03 + i * 0.017;
      const lg = ctx.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(og.gain);

      o.connect(og);
      og.connect(lp);
      o.start();
      lfo.start();
      oscs.push(o, lfo);
    });

    this.drone = { g, oscs };
  }

  stopDrone() {
    if (!this.drone || !this.ctx) return;
    const { g, oscs } = this.drone;
    g.gain.cancelScheduledValues(this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
    oscs.forEach((o) => {
      try {
        o.stop(this.ctx.currentTime + 1.4);
      } catch { /* already stopped */ }
    });
    this.drone = null;
    this.droneOn = false;
  }

  /* ── flourishes ──────────────────────────────────────────────── */

  async flourish() {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + 0.05;
    const steps = [0, 2, 3, 5, 7, 10];
    steps.forEach((deg, i) => {
      this.pluck(freqFor(deg, 1 + Math.floor(i / 3)), {
        vel: 0.1 + i * 0.012,
        pan: (i / steps.length - 0.5) * 1.2,
        when: t0 + i * 0.085,
        decay: 1.8,
      });
    });
    this.bass(ROOT / 2, t0, 0.09);
    this.startDrone();
  }
}
