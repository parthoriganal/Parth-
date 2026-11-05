// AETHERBOUND — procedural score.
// A slow, breathing synthesizer score with a noise "air" bed, a reverb built
// from generated impulse noise, and three transition gestures. No audio files.

const CHORDS = [
  [73.42, 110.0, 174.61, 220.0],   // D minor — the quiet between
  [58.27, 87.31, 146.83, 174.61],  // Bb major — the engine
  [98.0, 146.83, 233.08, 293.66],  // G minor — the rift
  [87.31, 130.81, 174.61, 261.63], // F major — the other side
  [73.42, 110.0, 185.0, 277.18],   // D major — aetherbound
];

export class Score {
  constructor() {
    this.available = false;
    this.started = false;
    this.muted = false;
    this.ctx = null;
    this.master = null;
    this.reverb = null;
    this.oscillators = [];
    this.lastTime = 0;
    this.lastScene = -1;
    this.events = [
      { t: 28.0, fn: 'rise' },
      { t: 33.5, fn: 'chime' },
      { t: 51.2, fn: 'impact' },
      { t: 62.0, fn: 'chime' },
      { t: 76.2, fn: 'resolve' },
    ];
    this.pulses = [30, 33, 36, 39, 42, 45, 48];
  }

  start() {
    if (this.started) {
      this.resume();
      return;
    }
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return;
    try {
      const ctx = new Ctx();
      this.ctx = ctx;
      this.available = true;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.55;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 22;
      comp.ratio.value = 4;
      comp.attack.value = 0.02;
      comp.release.value = 0.3;
      master.connect(comp);
      comp.connect(ctx.destination);
      this.master = master;

      // generated reverb
      const convolver = ctx.createConvolver();
      convolver.buffer = this.makeImpulse(ctx, 2.8, 2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.32;
      convolver.connect(wet);
      wet.connect(master);
      this.reverb = convolver;

      // air bed
      const air = ctx.createBufferSource();
      air.buffer = this.makeNoise(ctx, 4.0);
      air.loop = true;
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'highpass';
      airFilter.frequency.value = 1800;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.012;
      air.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(master);
      air.start();

      // drone voices
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.6;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.0;
      filter.connect(droneGain);
      droneGain.connect(master);
      droneGain.connect(convolver);
      this.droneGain = droneGain;
      this.droneFilter = filter;

      const chord = CHORDS[0];
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
        osc.frequency.value = chord[i];
        osc.detune.value = (i - 1.5) * 4;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.16 : 0.07;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        this.oscillators.push({ osc, gain: g, index: i });
      }

      // sub
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = chord[0] / 2;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.1;
      sub.connect(subGain);
      subGain.connect(filter);
      sub.start();
      this.oscillators.push({ osc: sub, gain: subGain, index: 4 });

      // shimmer
      const shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = chord[2] * 4;
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.012;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(shimmerGain.gain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(master);
      shimmerGain.connect(convolver);
      shimmer.start();
      lfo.start();
      this.shimmer = { osc: shimmer, gain: shimmerGain };

      droneGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2.0);
      this.started = true;
      this.setScene(0, true);
      this.resume();
    } catch (err) {
      this.available = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  makeNoise(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  makeImpulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buffer;
  }

  setScene(index, immediate = false) {
    if (!this.available || !this.ctx) return;
    const chord = CHORDS[Math.max(0, Math.min(CHORDS.length - 1, index))];
    const now = this.ctx.currentTime;
    const glide = immediate ? 0.05 : 2.2;
    for (const v of this.oscillators) {
      const target = v.index < 4 ? chord[v.index] : chord[0] / 2;
      v.osc.frequency.setTargetAtTime(target, now, glide);
    }
    if (this.shimmer) {
      this.shimmer.osc.frequency.setTargetAtTime(chord[2] * 4, now, glide);
    }
    if (this.droneFilter) {
      const cutoff = [420, 560, 760, 680, 820][index] ?? 560;
      this.droneFilter.frequency.setTargetAtTime(cutoff, now, 1.8);
    }
    this.lastScene = index;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.available || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.55, now, 0.15);
  }

  whoosh(intensity = 1, duration = 1.8) {
    if (!this.available || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(ctx, duration);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(180, now);
    bp.frequency.exponentialRampToValueAtTime(2400, now + duration * 0.55);
    bp.frequency.exponentialRampToValueAtTime(320, now + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12 * intensity, now + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  impact() {
    if (!this.available || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(62, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.42, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 1.5);

    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(ctx, 0.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 0.8);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    ng.connect(this.reverb);
    src.start(now);
    src.stop(now + 0.95);
  }

  chime(freq = 880, gain = 0.05) {
    if (!this.available || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    osc.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 2.7);
  }

  pulse() {
    if (!this.available || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(48, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.13, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  update(t, state) {
    if (!this.available || !this.started) return;
    if (state && state.chapterIndex !== this.lastScene) {
      this.setScene(state.chapterIndex);
    }

    const last = this.lastTime;
    if (t < last - 0.5) {
      // a seek backwards: do not fire the transition gestures
      this.lastTime = t;
      return;
    }

    for (const ev of this.events) {
      if (last < ev.t && t >= ev.t) {
        if (ev.fn === 'rise') {
          this.whoosh(0.8, 2.6);
          this.chime(392, 0.035);
        } else if (ev.fn === 'chime') {
          this.chime(784, 0.04);
          this.chime(1174, 0.025);
        } else if (ev.fn === 'impact') {
          this.impact();
          this.whoosh(1.4, 1.2);
        } else if (ev.fn === 'resolve') {
          this.chime(587, 0.04);
          this.chime(880, 0.03);
        }
      }
    }
    for (const p of this.pulses) {
      if (last < p && t >= p) this.pulse();
    }
    this.lastTime = t;
  }

  reset() {
    this.lastTime = 0;
    this.lastScene = -1;
    if (this.available && this.ctx) this.setScene(0, true);
  }

  dispose() {
    if (this.ctx) {
      try { this.ctx.close(); } catch (err) { /* no-op */ }
    }
    this.ctx = null;
    this.available = false;
    this.started = false;
  }
}
