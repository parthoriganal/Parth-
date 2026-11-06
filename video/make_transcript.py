#!/usr/bin/env python3
"""make_transcript.py - emit video/narration.srt from the measured timeline.

Beat boundaries are exact (they come from decoding the real TTS clips). Within a beat,
cues are split on sentence boundaries and spread proportionally to character count,
which is an honest approximation - not a forced-alignment.

The result is a genuine transcript of what is spoken, so run the skill's own
yt-chapters and yt-edit tools against it.
"""
import json, os, re, textwrap

HERE = os.path.dirname(os.path.abspath(__file__))

SPOKEN = {
    "hook": "You're probably installing AI skills you never actually run. "
            "So I moved one folder out of a YouTube skill pack, and it broke somewhere I wasn't looking.",
    "counters": "Eleven skills, six Python tools, five hundred thirty-five lines of code. "
                "I installed all of it, and then I tried to break it. This is what broke.",
    "twocol": "Here's the thing nobody says out loud. Most skill packs are prompts. "
              "You read them, the model reads them, nothing executes. "
              "This one is different. It ships six Python tools that are supposed to actually run. "
              "And that matters, because a tool that silently fails is worse than no tool.",
    "imports": "So before trusting it, I audited it. Every import in all six files. "
               "csv, json, os, re, statistics, sys. That's the whole list. "
               "No network. No subprocess. No eval. No API key. "
               "Which means it runs anywhere, including here.",
    "checks": "Then I broke it. I moved one folder, yt edit, out of the pack. "
              "Seventeen checks. Eight of them failed. "
              "And the error wasn't file not found. It was module not found error, no module named deadair. "
              "Because three of these tools import across sibling folders. "
              "Move one, and two others break at runtime. Not at install. At runtime.",
    "verify": "That's the payoff, and here it is. An install that looks clean can still be broken. "
              "The only way to know is to run the tools, not to count the folders. "
              "So I wrote one script that runs all six against generated fixtures and asserts on their output. "
              "It's in the repo. npm run verify yt-skill. Seventeen checks. "
              "It fails loudly, which is the whole point.",
    "bars": "One tool genuinely surprised me. It ranks videos not by views, but by how far each beat its "
            "own channel's median. A four hundred thousand view video on a huge channel? Ignored. "
            "The same views on a small channel? Fourteen point seven eight times its median. Ranked first. "
            "That's a better idea detector than view count, and it's seventy-four lines.",
    "close": "If you install one skill pack this week, run it before you trust it. "
             "The verify script is in the repo.",
}


def ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def sentences(s):
    parts = re.split(r"(?<=[.?!])\s+", s.strip())
    out, cur = [], ""
    for p in parts:
        # keep very short fragments glued to the previous sentence
        if cur and (len(p) < 18 or len(cur) < 28):
            cur = cur + " " + p
        else:
            if cur:
                out.append(cur)
            cur = p
    if cur:
        out.append(cur)
    return out


def main():
    tl = json.load(open(os.path.join(HERE, "timeline.json")))
    cues, idx = [], 1
    for b in tl["beats"]:
        body = SPOKEN[b["kind"]]
        sents = sentences(body)
        total_chars = sum(len(s) for s in sents) or 1
        t = b["start"]
        span = b["dur"] - tl.get("gap", 0.5)
        for s in sents:
            d = span * len(s) / total_chars
            cues.append((idx, t, t + d, s))
            idx += 1
            t += d

    path = os.path.join(HERE, "narration.srt")
    with open(path, "w") as fh:
        for i, a, b, s in cues:
            wrapped = textwrap.fill(s, 58)
            fh.write(f"{i}\n{ts(a)} --> {ts(b)}\n{wrapped}\n\n")
    print(f"  {len(cues)} cues -> {path}")
    print(f"  last cue ends {ts(cues[-1][2])}")


if __name__ == "__main__":
    main()
