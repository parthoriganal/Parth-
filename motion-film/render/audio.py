#!/usr/bin/env python3
"""
Original score for PARTH- · THE REPOSITORY IS A LIVING PLANET.
Fully synthesized with numpy — no samples, no copyrighted material.
45.0 s · 44.1 kHz · stereo 16-bit WAV -> ../out/film.wav

Map: 0–9 void drone · 9.4–12.15 meteor rise · 12.15 impact ·
19–31 monolith pad + river pings · 31–40 orbital swell · 40 title braam.
"""
import math, os, wave
import numpy as np

SR, DUR = 44100, 45.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(541087)
L = np.zeros(N); R = np.zeros(N)

def add(sig, start, pan=0.0, gain=1.0):
    i0 = int(start * SR); i1 = min(N, i0 + len(sig))
    if i1 <= i0: return
    s = sig[: i1 - i0] * gain
    L[i0:i1] += s * math.cos((pan + 1) * math.pi / 4)
    R[i0:i1] += s * math.sin((pan + 1) * math.pi / 4)

def env_ad(n, attack, decay_tau):
    tt = np.arange(n) / SR
    return (1 - np.exp(-tt / max(attack, 1e-4))) * np.exp(-tt / decay_tau)

# ── sub drone: A1/E2/A2, breathing slowly under everything ──────────────────
drone = (np.sin(2 * np.pi * 55 * t) * 0.55 + np.sin(2 * np.pi * 82.41 * t) * 0.30
         + np.sin(2 * np.pi * 110 * t) * 0.22)
drone *= (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t - 1.2))           # breath
drone *= np.clip(t / 3.0, 0, 1) * np.clip((DUR - t) / 2.2, 0, 1)       # head/tail fades
add(drone, 0, gain=0.30)

# ── evolving pad: A–E–B–C (add9 colour), swells per act ─────────────────────
for f, g, det in [(110.0, .20, 0), (164.81, .15, 0.4), (246.94, .10, -0.3), (261.63, .07, 0.2)]:
    wave_ = np.sin(2 * np.pi * (f + det) * t) + 0.35 * np.sin(2 * np.pi * 2 * (f + det) * t)
    swell = (0.25
             + 0.35 * np.clip((t - 8) / 8, 0, 1)
             + 0.40 * np.clip((t - 28) / 8, 0, 1)
             - 0.45 * np.clip((t - 42.5) / 2.5, 0, 1))
    add(wave_ * np.clip(swell, 0, 1), 0, pan=(-0.3 if f < 200 else 0.3), gain=g)

# ── meteor: filtered-noise whoosh + falling sine, pans with the flight ──────
mt0, mt1 = 9.4, 12.15
n = int((mt1 - mt0) * SR); tt = np.arange(n) / SR
noise = rng.standard_normal(n)
noise = np.convolve(noise, np.ones(24) / 24, mode="same")             # crude low-pass
whoosh_env = (tt / tt[-1]) ** 2.1
add_pan_env = np.linspace(-0.75, 0.0, n)
seg = noise * whoosh_env * 0.9 + np.sin(2 * np.pi * (850 * np.exp(-tt * 1.1) + 90) * tt) * whoosh_env * 0.25
i0 = int(mt0 * SR)
L[i0:i0 + n] += seg * np.cos((add_pan_env + 1) * np.pi / 4)
R[i0:i0 + n] += seg * np.sin((add_pan_env + 1) * np.pi / 4)

# ── impact: sub drop + burst ─────────────────────────────────────────────────
n = int(1.8 * SR); tt = np.arange(n) / SR
drop = np.sin(2 * np.pi * (32 + 95 * np.exp(-tt * 7)) * tt) * np.exp(-tt * 3.2)
burst = np.convolve(rng.standard_normal(n), np.ones(10) / 10, mode="same") * np.exp(-tt * 9)
add(drop + burst * 0.55, mt1, gain=0.95)

# ── river pings: sparse seeded pentatonic glass (Acts 3–4) ──────────────────
scale = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5]
ping_times = sorted(20 + rng.random(26) * 19)
for pt in ping_times:
    f = scale[int(rng.integers(0, len(scale)))]
    n = int(1.4 * SR); tt = np.arange(n) / SR
    ping = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2 * f * tt)) * env_ad(n, 0.004, 0.42)
    add(ping, pt, pan=float(rng.uniform(-0.6, 0.6)), gain=0.10)
    add(ping, pt + 0.34, pan=float(rng.uniform(-0.6, 0.6)), gain=0.045)   # single echo

# ── title braam at 40s: harmonic stack swell ────────────────────────────────
n = int(4.6 * SR); tt = np.arange(n) / SR
braam = sum(np.sin(2 * np.pi * 55 * h * tt) / h for h in [1, 2, 3, 4, 6, 8])
braam *= (1 - np.exp(-tt / 1.1)) * np.exp(-tt / 3.4)
add(braam, 40.05, gain=0.34)
# final heartbeat: two soft sub pulses under the closing line
for ht in [42.6, 43.75]:
    n = int(0.5 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 11), ht, gain=0.5)

# ── master: soft-clip safety + normalise to −3 dBFS ─────────────────────────
stereo = np.stack([L, R], axis=1)
stereo = np.tanh(stereo * 0.9)
peak = np.max(np.abs(stereo)) or 1.0
stereo *= (10 ** (-3 / 20)) / peak

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "film.wav")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
pcm = (stereo * 32767).astype(np.int16)
with wave.open(out_path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"audio -> {out_path}  {DUR}s  peak {peak:.3f} (pre-norm)")
