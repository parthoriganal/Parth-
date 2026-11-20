#!/usr/bin/env python3
"""
Procedural 48 kHz stereo cinematic battle score & foley synthesizer
for KAGE // CRIMSON ECLIPSE (24.0s @ 24fps = 576 frames).
Zero external audio assets — pure NumPy DSP synced to every animation beat.
"""
import os
import sys
import wave
import numpy as np

SR = 48000
DUR = 24.0
N = int(SR * DUR)

rng = np.random.default_rng(20261120)


def one_pole_lp(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    rc = 1.0 / (2.0 * np.pi * max(cutoff_hz, 1.0))
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    out = np.empty_like(x)
    y = 0.0
    for i in range(len(x)):
        y += alpha * (x[i] - y)
        out[i] = y
    return out


def fft_bandpass(x: np.ndarray, low_hz: float, high_hz: float) -> np.ndarray:
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    mask = np.exp(-0.5 * ((np.clip(freqs, 1.0, None) - np.sqrt(low_hz * high_hz)) / max((high_hz - low_hz) * 0.55, 1.0)) ** 2)
    mask[(freqs < low_hz * 0.45) | (freqs > high_hz * 1.8)] *= 0.05
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


def synth_taiko(dur=0.55, f0=115.0, f1=44.0, punch=1.0):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = f1 + (f0 - f1) * np.exp(-t * 24.0)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 6.5) + 0.35 * np.sin(phase * 1.98) * np.exp(-t * 14.0)
    slap = rng.standard_normal(len(t)) * np.exp(-t * 95.0) * 0.45 * punch
    slap = fft_bandpass(slap, 500, 3200)
    return np.tanh((body + slap) * 1.6)


def synth_sub_drop(dur=1.4, f0=95.0, f1=30.0):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = f1 + (f0 - f1) * np.exp(-t * 4.2)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(t / 0.008, 1.0) * np.exp(-t * 2.1)
    sig = np.sin(phase) + 0.35 * np.sin(phase * 2.0) * np.exp(-t * 5.0)
    click = rng.standard_normal(len(t)) * np.exp(-t * 140.0) * 0.4
    return np.tanh((sig * env + click) * 1.5)


def synth_whoosh(dur=0.28, f_start=450.0, f_end=2600.0):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = rng.standard_normal(n)
    env = np.sin(np.pi * (t / dur)) ** 1.4
    # Sweep resonant tone + filtered air
    freq = f_start * (f_end / f_start) ** (t / dur)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    whistle = np.sin(phase) * 0.16 * env
    air = fft_bandpass(noise, min(f_start, f_end) * 0.8, max(f_start, f_end) * 1.2) * env * 0.85
    return air + whistle


def synth_sword_clash(dur=0.85, base=1680.0, intensity=1.0):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    # Inharmonic metallic partials + FM ring
    ratios = [1.0, 1.47, 2.09, 2.86, 3.74, 4.92, 6.18]
    decays = [4.5, 6.0, 8.2, 11.0, 14.5, 19.0, 25.0]
    sig = np.zeros(n)
    for r, d in zip(ratios, decays):
        f = base * r
        fm = np.sin(2.0 * np.pi * f * 0.63 * t) * 1.4 * np.exp(-t * 18.0)
        sig += np.sin(2.0 * np.pi * f * t + fm) * np.exp(-t * d) / (r ** 0.45)
    spark = fft_bandpass(rng.standard_normal(n), 2800, 11000) * np.exp(-t * 45.0) * 0.9
    thud = synth_taiko(min(0.3, dur), 150.0, 48.0, punch=1.2)
    out = sig * 0.42 + spark * 0.6
    out[: len(thud)] += thud * 0.55
    return np.tanh(out * intensity * 1.5)


def synth_slash(dur=0.22, high=3600.0):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = fft_bandpass(rng.standard_normal(n), 1400, high * 1.6)
    env = np.minimum(t / 0.006, 1.0) * np.exp(-t * 16.0)
    ring = (np.sin(2 * np.pi * high * t) + 0.5 * np.sin(2 * np.pi * high * 1.53 * t)) * np.exp(-t * 22.0) * 0.25
    return np.tanh((noise * env * 1.1 + ring) * 1.4)


def synth_plasma_crackle(dur=0.6):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    bursts = (rng.random(n) > 0.992).astype(float) * rng.standard_normal(n) * 3.0
    buzz = np.sign(np.sin(2 * np.pi * (95.0 + 35.0 * np.sin(2 * np.pi * 14 * t)) * t)) * 0.14
    raw = fft_bandpass(bursts + buzz, 900, 9500)
    env = np.sin(np.pi * t / dur) ** 0.6
    return np.tanh(raw * env * 1.6)


def synth_sheathe_click():
    dur = 0.45
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    # Metallic slide + crisp tsuba lock click at 0.08s
    slide = fft_bandpass(rng.standard_normal(n), 3000, 8500) * np.exp(-((t - 0.04) / 0.03) ** 2) * 0.35
    click_t = np.maximum(t - 0.09, 0.0)
    mask = (t >= 0.09).astype(float)
    click = mask * (
        np.sin(2 * np.pi * 2950 * click_t) * np.exp(-click_t * 35.0) * 0.65
        + np.sin(2 * np.pi * 4620 * click_t) * np.exp(-click_t * 48.0) * 0.45
        + np.sin(2 * np.pi * 640 * click_t) * np.exp(-click_t * 60.0) * 0.5
    )
    return np.tanh((slide + click) * 1.8)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "fight-animation/audio.wav"
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    L = np.zeros(N, dtype=np.float64)
    R = np.zeros(N, dtype=np.float64)
    t_all = np.linspace(0, DUR, N, endpoint=False)

    # 1. Atmospheric rain bed + brooding dark cyber-drone (D minor / Phrygian: D1=36.71Hz, Eb1=38.89Hz, A1=55Hz)
    rain_L = fft_bandpass(rng.standard_normal(N), 900, 6200) * 0.045
    rain_R = fft_bandpass(rng.standard_normal(N), 950, 6500) * 0.045
    L += rain_L
    R += rain_R

    # Dark pulsing synth bassline across acts (active 0.4s -> 16.5s, drops out during bullet-time, returns softly)
    drone_freq = np.where(t_all < 12.5, 36.71, np.where(t_all < 16.5, 38.89, 36.71))
    drone_phase = 2.0 * np.pi * np.cumsum(drone_freq) / SR
    saw = 0.55 * np.sin(drone_phase) + 0.28 * np.sin(2 * drone_phase) + 0.14 * np.sin(3 * drone_phase)
    # 16th-note cyberpunk sidechain pulse during combat (3.5s -> 16.5s)
    pulse = np.where((t_all >= 3.5) & (t_all < 16.5), 0.55 + 0.45 * (0.5 - 0.5 * np.cos(2 * np.pi * 5.0 * t_all)), 0.45)
    drone_env = np.clip(t_all / 1.2, 0, 1) * np.where(t_all > 21.8, np.exp(-(t_all - 21.8) * 1.2), 1.0)
    # High-tension dissonant shimmer pad in Act IV (12.5s - 16.5s)
    shimmer = np.sin(2 * np.pi * 293.66 * t_all) * 0.05 + np.sin(2 * np.pi * 311.13 * t_all) * 0.045
    shimmer *= np.where((t_all >= 12.5) & (t_all < 16.5), np.sin(np.pi * np.clip((t_all - 12.5) / 4.0, 0, 1)), 0.0)

    L += (saw * pulse * drone_env * 0.22) + shimmer
    R += (saw * pulse * drone_env * 0.22) - shimmer * 0.8

    # 2. Act I — Title slash & Eye Cut-in (0.0s - 3.5s)
    add_stereo(L, R, synth_sub_drop(1.6, 80, 32), 0.15, gain=0.65, pan=0.0)
    add_stereo(L, R, synth_slash(0.28, 4200), 1.05, gain=0.55, pan=0.1)  # Title slice!
    add_stereo(L, R, synth_taiko(0.6, 100, 42), 2.40, gain=0.72, pan=-0.2)  # Eye cut-in slam
    add_stereo(L, R, synth_plasma_crackle(0.8), 2.45, gain=0.35, pan=0.2)
    add_stereo(L, R, synth_taiko(0.45, 130, 50), 3.15, gain=0.65, pan=0.25)

    # 3. Driving Taiko / Industrial battle groove during Acts II–IV (3.5s - 16.3s)
    beat = 0.25  # 120 BPM 8th-note grid (240 pulses/min feel)
    t_beat = 3.5
    idx = 0
    while t_beat < 16.2:
        # Pause percussion during first clash hit-stop (4.60 - 5.15)
        if not (4.60 <= t_beat <= 5.15):
            if idx % 4 == 0:
                add_stereo(L, R, synth_taiko(0.45, 120, 42, 1.2), t_beat, gain=0.58, pan=-0.12)
            elif idx % 4 == 2:
                add_stereo(L, R, synth_taiko(0.32, 170, 65, 1.4), t_beat, gain=0.44, pan=0.18)
            elif idx % 8 == 7:
                add_stereo(L, R, synth_taiko(0.22, 220, 88, 1.0), t_beat, gain=0.34, pan=-0.25)
        t_beat += beat
        idx += 1

    # 4. Act II — Dash & First Blade Clash (3.5s - 7.5s)
    add_stereo(L, R, synth_whoosh(0.35, 350, 3200), 3.95, gain=0.65, pan=-0.5)
    add_stereo(L, R, synth_whoosh(0.35, 300, 2600), 4.05, gain=0.65, pan=0.5)
    # HUGE FIRST CLASH at 4.60s!
    add_stereo(L, R, synth_sword_clash(1.1, 1520.0, 1.25), 4.60, gain=0.95, pan=0.0)
    add_stereo(L, R, synth_sub_drop(1.1, 110, 34), 4.62, gain=0.88, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(0.95), 4.85, gain=0.45, pan=0.0)
    # Lock scrape & pushback
    add_stereo(L, R, synth_sword_clash(0.55, 2100.0, 0.85), 6.45, gain=0.72, pan=-0.15)
    add_stereo(L, R, synth_whoosh(0.32, 1800, 420), 6.85, gain=0.55, pan=0.3)

    # 5. Act III — Ground Slam + 7-Slash Aerial Flurry + Counter Kick (7.5s - 12.5s)
    # Oni-Zero colossal downward ground cleave at 7.90s
    add_stereo(L, R, synth_whoosh(0.32, 260, 1400), 7.60, gain=0.68, pan=0.2)
    add_stereo(L, R, synth_sub_drop(1.2, 125, 28), 7.90, gain=0.95, pan=0.0)
    add_stereo(L, R, synth_taiko(0.65, 95, 32, 1.5), 7.90, gain=0.85, pan=0.0)
    # 7-slash supersonic aerial barrage (8.8s - 11.2s)
    slash_times = [8.85, 9.18, 9.48, 9.76, 10.05, 10.35, 10.68]
    for k, st in enumerate(slash_times):
        pan = -0.6 + (k / 6.0) * 1.2
        add_stereo(L, R, synth_slash(0.20, 3100 + k * 240), st, gain=0.72, pan=pan)
        if k >= 4:  # Oni-Zero parries final 3 slashes!
            add_stereo(L, R, synth_sword_clash(0.42, 1850 + k * 140, 0.9), st + 0.04, gain=0.72, pan=pan)
    # Counter-kick + billboard shatter at 11.55s
    add_stereo(L, R, synth_taiko(0.45, 140, 38, 1.6), 11.55, gain=0.88, pan=-0.35)
    add_stereo(L, R, synth_plasma_crackle(0.55), 11.62, gain=0.52, pan=-0.4)

    # 6. Act IV — Crimson Eclipse Overdrive (12.5s - 16.5s)
    add_stereo(L, R, synth_sub_drop(2.2, 75, 28), 12.60, gain=0.85, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(1.8), 12.80, gain=0.45, pan=0.0)
    # Lightning pillars
    add_stereo(L, R, synth_sword_clash(0.6, 980, 0.9), 13.50, gain=0.65, pan=-0.5)
    add_stereo(L, R, synth_sword_clash(0.6, 1120, 0.9), 14.20, gain=0.65, pan=0.5)
    # Colossal crimson wave launch at 15.10s
    add_stereo(L, R, synth_whoosh(0.85, 180, 2900), 15.10, gain=0.92, pan=0.15)
    add_stereo(L, R, synth_sub_drop(1.3, 130, 30), 15.20, gain=0.92, pan=0.0)

    # 7. Act V — Bullet-Time Silence & Zero-Point Eclipse Severance (16.5s - 21.0s)
    # Dramatic vacuum silence duck from 16.55s to 17.55s (only heartbeat + faint high ring!)
    duck_mask = np.ones(N, dtype=np.float64)
    i_d0, i_d1 = int(16.55 * SR), int(17.60 * SR)
    duck_mask[i_d0:i_d1] = 0.08
    # Smooth 40ms edges
    ramp = int(0.04 * SR)
    duck_mask[i_d0 : i_d0 + ramp] = np.linspace(1.0, 0.08, ramp)
    duck_mask[i_d1 - ramp : i_d1] = np.linspace(0.08, 1.0, ramp)
    L *= duck_mask
    R *= duck_mask

    # Heartbeat thump inside bullet-time silence
    add_stereo(L, R, synth_taiko(0.35, 68, 34, 0.2), 16.85, gain=0.52, pan=0.0)
    add_stereo(L, R, synth_taiko(0.28, 62, 32, 0.2), 17.12, gain=0.38, pan=0.0)

    # ULTIMATE FLASH-STEP SEVERANCE at 17.65s!!
    add_stereo(L, R, synth_slash(0.30, 5400), 17.62, gain=1.0, pan=-0.3)
    add_stereo(L, R, synth_sword_clash(1.5, 1440.0, 1.35), 17.68, gain=1.05, pan=0.0)
    add_stereo(L, R, synth_sub_drop(2.1, 140.0, 26.0), 17.70, gain=1.15, pan=0.0)
    add_stereo(L, R, synth_plasma_crackle(1.2), 17.85, gain=0.55, pan=0.0)

    # 8. Act VI — Katana Sheathe Click & Eclipse Shatter (21.0s - 24.0s)
    add_stereo(L, R, synth_sheathe_click(), 21.65, gain=0.92, pan=-0.15)
    # Delayed shockwave shatter right after click!
    add_stereo(L, R, synth_sub_drop(1.6, 88.0, 28.0), 21.95, gain=0.78, pan=0.1)
    add_stereo(L, R, synth_plasma_crackle(0.85), 22.00, gain=0.32, pan=0.2)

    # Global gentle fade-in (0.15s) and fade-out (0.8s)
    fi = int(0.15 * SR)
    fo = int(0.8 * SR)
    L[:fi] *= np.linspace(0, 1, fi)
    R[:fi] *= np.linspace(0, 1, fi)
    L[-fo:] *= np.linspace(1, 0, fo)
    R[-fo:] *= np.linspace(1, 0, fo)

    # Soft mastering limiter & normalize to -1.5 dBFS
    stereo = np.stack([L, R], axis=1)
    stereo = np.tanh(stereo * 0.82)
    peak = np.max(np.abs(stereo)) + 1e-9
    target_peak = 10 ** (-1.5 / 20.0)
    stereo = stereo * (target_peak / peak)

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
