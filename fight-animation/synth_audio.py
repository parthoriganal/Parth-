#!/usr/bin/env python3
"""
Procedural 48 kHz stereo anime battle soundtrack & foley synthesizer
for KAGE // CRIMSON ECLIPSE (22.0s @ 24fps = 528 frames — Studio Sakuga Cut).
Synced to the exact millisecond of every cut, impact frame, bullet-time freeze,
screen-tear severance, and katana sheathe click.
"""
import os
import sys
import wave
import numpy as np

SR = 48000
DUR = 22.0
N = int(SR * DUR)

rng = np.random.default_rng(20261120)


def fft_bandpass(x: np.ndarray, low_hz: float, high_hz: float) -> np.ndarray:
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    center = np.sqrt(max(low_hz, 1.0) * max(high_hz, 2.0))
    bw = max((high_hz - low_hz) * 0.55, 1.0)
    mask = np.exp(-0.5 * ((np.clip(freqs, 1.0, None) - center) / bw) ** 2)
    mask[(freqs < low_hz * 0.45) | (freqs > high_hz * 1.8)] *= 0.04
    return np.fft.irfft(X * mask, n=len(x))


def add_stereo(L: np.ndarray, R: np.ndarray, sig: np.ndarray, t0: float, gain: float = 1.0, pan: float = 0.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    end = min(N, i0 + len(sig))
    seg = sig[: end - i0]
    gL = gain * np.cos((pan + 1.0) * np.pi * 0.25)
    gR = gain * np.sin((pan + 1.0) * np.pi * 0.25)
    L[i0:end] += seg * gL
    R[i0:end] += seg * gR


def synth_taiko(dur=0.52, f0=125.0, f1=42.0, punch=1.2):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = f1 + (f0 - f1) * np.exp(-t * 26.0)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 6.5) + 0.38 * np.sin(phase * 1.97) * np.exp(-t * 14.0)
    slap = fft_bandpass(rng.standard_normal(len(t)) * np.exp(-t * 95.0), 500, 3600) * 0.5 * punch
    return np.tanh((body + slap) * 1.7)


def synth_sub_drop(dur=1.5, f0=105.0, f1=28.0):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = f1 + (f0 - f1) * np.exp(-t * 4.5)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(t / 0.006, 1.0) * np.exp(-t * 2.0)
    sig = np.sin(phase) + 0.4 * np.sin(phase * 2.0) * np.exp(-t * 5.0)
    click = rng.standard_normal(len(t)) * np.exp(-t * 140.0) * 0.45
    return np.tanh((sig * env + click) * 1.6)


def synth_whoosh(dur=0.30, f_start=420.0, f_end=3200.0):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = rng.standard_normal(n)
    env = np.sin(np.pi * (t / dur)) ** 1.35
    freq = f_start * (f_end / f_start) ** (t / dur)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    whistle = np.sin(phase) * 0.16 * env
    air = fft_bandpass(noise, min(f_start, f_end) * 0.8, max(f_start, f_end) * 1.25) * env * 0.9
    return air + whistle


def synth_sword_clash(dur=0.95, base=1620.0, intensity=1.1):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    ratios = [1.0, 1.47, 2.09, 2.86, 3.74, 4.92, 6.18]
    decays = [4.2, 5.8, 8.0, 10.8, 14.2, 18.5, 24.0]
    sig = np.zeros(n)
    for r, d in zip(ratios, decays):
        f = base * r
        fm = np.sin(2.0 * np.pi * f * 0.63 * t) * 1.5 * np.exp(-t * 18.0)
        sig += np.sin(2.0 * np.pi * f * t + fm) * np.exp(-t * d) / (r ** 0.45)
    spark = fft_bandpass(rng.standard_normal(n), 2800, 11500) * np.exp(-t * 42.0) * 0.95
    thud = synth_taiko(min(0.32, dur), 155.0, 44.0, punch=1.3)
    out = sig * 0.44 + spark * 0.62
    out[: len(thud)] += thud * 0.6
    return np.tanh(out * intensity * 1.55)


def synth_slash(dur=0.22, high=3800.0):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = fft_bandpass(rng.standard_normal(n), 1500, high * 1.65)
    env = np.minimum(t / 0.005, 1.0) * np.exp(-t * 15.5)
    ring = (np.sin(2 * np.pi * high * t) + 0.55 * np.sin(2 * np.pi * high * 1.52 * t)) * np.exp(-t * 21.0) * 0.28
    return np.tanh((noise * env * 1.15 + ring) * 1.45)


def synth_plasma_crackle(dur=0.65):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    bursts = (rng.random(n) > 0.991).astype(float) * rng.standard_normal(n) * 3.2
    buzz = np.sign(np.sin(2 * np.pi * (92.0 + 38.0 * np.sin(2 * np.pi * 15 * t)) * t)) * 0.14
    raw = fft_bandpass(bursts + buzz, 900, 9800)
    env = np.sin(np.pi * t / dur) ** 0.6
    return np.tanh(raw * env * 1.65)


def synth_sheathe_click():
    dur = 0.50
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    slide = fft_bandpass(rng.standard_normal(n), 3200, 9000) * np.exp(-((t - 0.04) / 0.03) ** 2) * 0.35
    click_t = np.maximum(t - 0.08, 0.0)
    mask = (t >= 0.08).astype(float)
    click = mask * (
        np.sin(2 * np.pi * 3100 * click_t) * np.exp(-click_t * 32.0) * 0.72
        + np.sin(2 * np.pi * 4850 * click_t) * np.exp(-click_t * 45.0) * 0.5
        + np.sin(2 * np.pi * 660 * click_t) * np.exp(-click_t * 58.0) * 0.55
    )
    return np.tanh((slide + click) * 1.85)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/kage_audio.wav"
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    L = np.zeros(N, dtype=np.float64)
    R = np.zeros(N, dtype=np.float64)
    t_all = np.linspace(0, DUR, N, endpoint=False)

    # Storm rain bed + dark Phrygian anime-phonk bassline
    L += fft_bandpass(rng.standard_normal(N), 900, 6200) * 0.045
    R += fft_bandpass(rng.standard_normal(N), 950, 6500) * 0.045

    # Aggressive bass notes (D1 -> Eb1 -> F1 -> Eb1 -> D1)
    drone_freq = np.where(
        t_all < 7.4, 36.71,
        np.where(t_all < 10.3, 38.89,
                 np.where(t_all < 12.8, 43.65,
                          np.where(t_all < 15.1, 38.89, 36.71)))
    )
    phase = 2.0 * np.pi * np.cumsum(drone_freq) / SR
    bass = np.tanh((0.65 * np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.2 * np.sin(3 * phase)) * 1.8)
    # 135 BPM energetic sidechain pump during active combat (3.7s -> 15.1s)
    pulse = np.where((t_all >= 3.7) & (t_all < 15.1), 0.45 + 0.55 * (0.5 - 0.5 * np.cos(2 * np.pi * 4.5 * t_all)), 0.42)
    env = np.clip(t_all / 0.8, 0, 1) * np.where(t_all > 19.6, np.exp(-(t_all - 19.6) * 1.0), 1.0)

    # High-tension dissonant anime string shimmer during Overdrive (12.8s - 15.1s)
    shimmer = (np.sin(2 * np.pi * 293.66 * t_all) * 0.055 + np.sin(2 * np.pi * 311.13 * t_all) * 0.05)
    shimmer *= np.where((t_all >= 12.8) & (t_all < 15.1), np.sin(np.pi * np.clip((t_all - 12.8) / 2.3, 0, 1)), 0.0)

    L += (bass * pulse * env * 0.24) + shimmer
    R += (bass * pulse * env * 0.24) - shimmer * 0.85

    # Beat 1 (0.0s - 2.5s): Standoff + Title Slice at 1.20s
    add_stereo(L, R, synth_sub_drop(1.6, 82, 30), 0.10, gain=0.68, pan=0.0)
    add_stereo(L, R, synth_slash(0.26, 4400), 1.20, gain=0.62, pan=0.1)

    # Beat 2 (2.5s - 3.7s): Eye Clash Slam
    add_stereo(L, R, synth_taiko(0.60, 115, 40, 1.4), 2.50, gain=0.85, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(0.95), 2.52, gain=0.45, pan=0.0)

    # Beat 3 (3.7s - 5.0s): Supersonic Dash Launch
    add_stereo(L, R, synth_taiko(0.45, 140, 44, 1.5), 3.70, gain=0.82, pan=-0.3)
    add_stereo(L, R, synth_whoosh(0.45, 320, 3600), 3.85, gain=0.78, pan=-0.4)
    add_stereo(L, R, synth_plasma_crackle(0.85), 3.90, gain=0.42, pan=-0.2)
    add_stereo(L, R, synth_whoosh(0.32, 480, 4200), 4.65, gain=0.85, pan=0.15)

    # Driving Taiko War Groove (3.7s -> 15.0s)
    beat = 0.222  # ~135 BPM 8th-note drive
    tb = 3.7
    idx = 0
    while tb < 14.95:
        if not (5.0 <= tb <= 5.45) and not (8.1 <= tb <= 8.35):
            if idx % 4 == 0:
                add_stereo(L, R, synth_taiko(0.42, 125, 42, 1.3), tb, gain=0.62, pan=-0.12)
            elif idx % 4 == 2:
                add_stereo(L, R, synth_taiko(0.30, 178, 66, 1.5), tb, gain=0.48, pan=0.18)
            elif idx % 8 == 7:
                add_stereo(L, R, synth_taiko(0.20, 230, 90, 1.1), tb, gain=0.38, pan=-0.22)
        tb += beat
        idx += 1

    # Beat 4 (5.00s - 7.40s): HUGE BLADE CLASH + IMPACT FRAME
    add_stereo(L, R, synth_sword_clash(1.25, 1480.0, 1.35), 5.00, gain=1.05, pan=0.0)
    add_stereo(L, R, synth_sub_drop(1.25, 125, 30), 5.00, gain=0.95, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(1.2), 5.20, gain=0.48, pan=0.0)
    add_stereo(L, R, synth_sword_clash(0.55, 2050.0, 0.9), 6.55, gain=0.72, pan=-0.15)

    # Beat 5 (7.40s - 8.10s): Rapid Oni Reaction Punch-In
    add_stereo(L, R, synth_taiko(0.45, 98, 34, 1.4), 7.40, gain=0.82, pan=0.25)
    add_stereo(L, R, synth_whoosh(0.35, 240, 1800), 7.75, gain=0.75, pan=0.15)

    # Beat 6 (8.10s - 10.30s): COLOSSAL BRIDGE GROUND SMASH
    add_stereo(L, R, synth_sub_drop(1.4, 135, 26), 8.10, gain=1.05, pan=0.0)
    add_stereo(L, R, synth_taiko(0.68, 95, 30, 1.6), 8.10, gain=0.95, pan=0.0)
    add_stereo(L, R, synth_sword_clash(0.85, 1100.0, 0.95), 8.14, gain=0.72, pan=0.0)
    add_stereo(L, R, synth_whoosh(0.38, 1200, 3800), 9.95, gain=0.68, pan=-0.35)

    # Beat 7 (10.30s - 12.80s): 7-SLASH SUPERSONIC AERIAL BARRAGE
    slash_times = [10.45, 10.72, 10.98, 11.24, 11.50, 11.78, 12.06]
    for k, st in enumerate(slash_times):
        pan = -0.65 + (k / 6.0) * 1.3
        add_stereo(L, R, synth_slash(0.20, 3200 + k * 240), st, gain=0.78, pan=pan)
        if k >= 3:
            add_stereo(L, R, synth_sword_clash(0.38, 1900 + k * 160, 0.95), st + 0.03, gain=0.76, pan=pan)

    # Beat 8 (12.80s - 15.10s): CRIMSON ECLIPSE OVERDRIVE
    add_stereo(L, R, synth_sub_drop(1.8, 90, 28), 12.80, gain=0.95, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(1.7), 12.90, gain=0.52, pan=0.0)
    add_stereo(L, R, synth_sword_clash(0.65, 960.0, 0.95), 13.45, gain=0.72, pan=-0.45)
    add_stereo(L, R, synth_whoosh(0.85, 220, 3200), 14.15, gain=0.95, pan=0.1)

    # Beat 9 (15.10s - 16.75s): BULLET-TIME SILENCE + HEARTBEAT!
    duck = np.ones(N, dtype=np.float64)
    i0, i1 = int(15.10 * SR), int(16.75 * SR)
    duck[i0:i1] = 0.06
    ramp = int(0.04 * SR)
    duck[i0 : i0 + ramp] = np.linspace(1.0, 0.06, ramp)
    duck[i1 - ramp : i1] = np.linspace(0.06, 1.0, ramp)
    L *= duck
    R *= duck

    add_stereo(L, R, synth_taiko(0.36, 68, 32, 0.15), 15.48, gain=0.62, pan=0.0)
    add_stereo(L, R, synth_taiko(0.28, 62, 30, 0.15), 15.78, gain=0.45, pan=0.0)
    # Subtle steel-draw whisper as thumb pushes blade 1 inch out
    add_stereo(L, R, synth_slash(0.32, 5200), 16.15, gain=0.38, pan=-0.1)

    # Beat 10 (16.75s - 17.55s): ZERO-POINT SCREEN-TEAR SEVERANCE!!
    add_stereo(L, R, synth_slash(0.32, 5800), 16.74, gain=1.08, pan=-0.2)
    add_stereo(L, R, synth_sword_clash(1.6, 1420.0, 1.45), 16.78, gain=1.12, pan=0.0)
    add_stereo(L, R, synth_sub_drop(2.2, 150.0, 26.0), 16.80, gain=1.25, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(1.3), 16.95, gain=0.62, pan=0.0)

    # Beat 11 (17.55s - 22.00s): KATANA SHEATHE CLICK (19.20s) + DELAYED SHATTER (19.45s)
    add_stereo(L, R, synth_sheathe_click(), 19.12, gain=0.98, pan=0.2)
    add_stereo(L, R, synth_sub_drop(1.6, 92.0, 28.0), 19.45, gain=0.82, pan=-0.2)
    add_stereo(L, R, synth_plasma_crackle(0.85), 19.50, gain=0.35, pan=-0.25)

    # Clean fade-in / fade-out & broadcast-grade mastering limiter
    fi, fo = int(0.12 * SR), int(0.95 * SR)
    L[:fi] *= np.linspace(0, 1, fi)
    R[:fi] *= np.linspace(0, 1, fi)
    L[-fo:] *= np.linspace(1, 0, fo)
    R[-fo:] *= np.linspace(1, 0, fo)

    stereo = np.tanh(np.stack([L, R], axis=1) * 0.85)
    peak = np.max(np.abs(stereo)) + 1e-9
    stereo *= (10 ** (-1.2 / 20.0)) / peak

    pcm = np.clip(stereo * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())

    rms_db = 20.0 * np.log10(np.sqrt(np.mean(stereo ** 2)) + 1e-9)
    peak_db = 20.0 * np.log10(np.max(np.abs(stereo)) + 1e-9)
    print(f"Synthesized {out_path}: {DUR:.1f}s @ {SR}Hz stereo | RMS={rms_db:.1f} dBFS | Peak={peak_db:.1f} dBFS")


if __name__ == "__main__":
    main()
