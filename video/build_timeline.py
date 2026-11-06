#!/usr/bin/env python3
"""build_timeline.py - measure the narration clips and emit the render timeline.

    python3 video/build_timeline.py

Durations come from decoding each TTS clip, so the picture is synced to the audio
that actually exists rather than to a word-count estimate. Also concatenates the
clips with a fixed pause between beats into video/narration.m4a.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")
FF = os.environ.get("FFMPEG") or "ffmpeg"
GAP = 0.50          # pause between beats, in seconds
WAV = os.path.join(HERE, "_wav")

BEATS = [
    ("b1_hook.mp3",   "hook",     "THE HOOK",   {"drop": 3,
        "line": "You're probably installing AI skills you never actually run."}),
    ("b2_turn.mp3",   "counters", "THE CLAIM",  {}),
    ("b3_claim.mp3",  "twocol",   "BEAT 1",     {}),
    ("b4_audit.mp3",  "imports",  "BEAT 2",     {}),
    ("b5_break.mp3",  "checks",   "BEAT 3",     {}),
    ("b6_payoff.mp3", "verify",   "THE PAYOFF", {}),
    ("b7_bars.mp3",   "bars",     "BEAT 4",     {}),
    ("b8_close.mp3",  "close",    "CLOSE",      {}),
]

NAMES = ["yt-audit", "yt-chapters", "yt-comment", "yt-edit", "yt-package", "yt-plan",
         "yt-retention", "yt-script", "yt-seo", "yt-shorts", "yt-viral"]

VERIFY_ROWS = [
    "\u2713 install root exists",
    "\u2713 all 11 skills present  11/11",
    "\u2713 hooks.json has 21 formulas  found 21",
    "\u2713 run yt-viral/swipe.py  output ok",
    "\u2713 chapters.py imports deadair at runtime",
]


def duration(path):
    """Decode to null and read the reported time - works for any container."""
    r = subprocess.run([FF, "-i", path, "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"time=(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if m:
        h, mi, s = m.groups()
        return int(h) * 3600 + int(mi) * 60 + float(s)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    if not m:
        raise SystemExit(f"could not read duration of {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def main():
    os.makedirs(WAV, exist_ok=True)
    clips, durs = [], []
    for fname, _, _, _ in BEATS:
        src = os.path.join(AUDIO, fname)
        if not os.path.exists(src):
            raise SystemExit(f"missing narration clip: {src}")
        dst = os.path.join(WAV, fname.rsplit(".", 1)[0] + ".wav")
        subprocess.run([FF, "-y", "-i", src, "-ar", "48000", "-ac", "2", dst],
                       capture_output=True, check=True)
        d = duration(dst)
        clips.append(dst)
        durs.append(d)
        print(f"  {fname:16} {d:6.2f}s")

    sil = os.path.join(WAV, "_silence.wav")
    subprocess.run([FF, "-y", "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo",
                    "-t", str(GAP), sil], capture_output=True, check=True)

    # narration = clip, gap, clip, gap, ... (trailing gap keeps audio == video length)
    lst = os.path.join(WAV, "concat.txt")
    with open(lst, "w") as fh:
        for c in clips:
            fh.write(f"file '{c}'\nfile '{sil}'\n")
    narr = os.path.join(HERE, "narration.m4a")
    r = subprocess.run([FF, "-y", "-f", "concat", "-safe", "0", "-i", lst,
                        "-c:a", "aac", "-b:a", "192k", narr], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("audio concat failed:\n" + r.stderr[-1500:])

    beats, t = [], 0.0
    for (fname, kind, label, extra), d in zip(BEATS, durs):
        b = {"id": kind, "label": label, "start": round(t, 3), "dur": round(d + GAP, 3),
             "kind": kind, "names": NAMES, "rows": VERIFY_ROWS}
        b.update(extra)
        beats.append(b)
        t += d + GAP

    out = os.path.join(HERE, "timeline.json")
    json.dump({"fps": 24, "gap": GAP, "beats": beats}, open(out, "w"), indent=1)
    audio_len = duration(narr)
    print(f"\n  speech total   {sum(durs):.2f}s")
    print(f"  timeline total {t:.2f}s  ({int(round(t * 24))} frames @24fps)")
    print(f"  narration.m4a  {audio_len:.2f}s   drift {abs(audio_len - t):.3f}s")
    print(f"  -> {out}")


if __name__ == "__main__":
    main()
