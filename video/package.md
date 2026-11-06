# Package — "I Broke It On Purpose (17 Checks, 8 Failed)"

Produced by `/yt-package`, `/yt-seo`, `/yt-chapters`, `/yt-shorts` from this repo's installed copy
of `youtube-agent-skill`. Every figure here was measured during the install and the render; none
are invented.

**Finished file:** `out/video.mp4` — 1920×1080, 24 fps, 2:29, h264 + AAC stereo.

---

## Title (winner, 98/100)

> **I Broke It On Purpose (17 Checks, 8 Failed)**

Thumbnail text: **NOTHING RAN** — different words from the title, which the linter requires.

```
I Broke It On Purpose (17 Checks, 8 Failed)    43 chars   score 98/100
  x  mobile    a mobile feed shows about "I Broke It On Purpose (17 Checks, 8..."
  ok           carries a concrete figure (17, 8)
  ok           thumbnail and title carry different words
```

The only miss is the mobile truncation. The fix is to put the number first, but that would break
the hook, so I kept it and flag it. This is the trade the tool exists to surface.

Runners-up, both rejected:

| title | score | why rejected |
|---|---|---|
| I Broke My AI Skill Pack on Purpose | 94 | no number |
| Your AI Skills Are Never Actually Running | 80 | no number **and** mobile-truncates the subject |
| The AI Skill Pack That Fails On Purpose | 94 | no number |

Note the first one scores 94 and *looks* better than the winner. It loses on one rule: no figure.
That single line is worth 4 points on every title in the pack.

---

## Description

> I moved one folder out of an eleven-skill AI pack and broke eight of seventeen checks. Here is the
> test I wrote so you don't have to find out that way.
>
> `npm run verify:yt-skill` — the verify script from the video, in this repo.
>
> CHAPTERS
> 0:00 The claim
> 0:10 Eleven skills, six tools, 535 lines
> 0:22 Why a tool is not a prompt
> 0:42 The import audit
> 1:04 The break
> 1:30 The payoff
> 1:56 The one tool that surprised me
> 2:21 Run it before you trust it
>
> The pack under test is `youtube-agent-skill` — eleven Claude skills and six stdlib-only Python
> tools. Note that the skills write; they never publish. The upload is yours.
>
> Every number in this video was produced by running the code: 11 skill folders, 6 tools, 535 lines,
> 21 hook formulas, 17 checks, 8 failures when one folder is moved, and a 14.78× outlier multiple.
> The hook was scored by the pack's own `hookscore.py` at 56/100, and the title by its own `title.py`
> at 98/100 — including the one criterion it failed.

**Query test** — three searches this should win:

1. `claude code skills not working`
2. `how to verify an ai skill pack`
3. `youtube agent skill python tools`

All three appear in the title or the first two description lines. "verify", "skill", "AI" and
"python tools" are all inside the snippet.

**Tags** (15, disambiguation only — not a strategy):

```
claude skills, claude code, ai skills, youtube agent skill, skill pack,
python tools, verify script, module not found, npx, node scripts,
ai agent workflow, prompt engineering, dev tools, skill install, youtube seo
```

---

## Chapters

The generator's raw output was unusable and it says so itself:

```
0:00 Skill Wasn't Never      1:30 View Channel Four
0:10 Tool Read Skill         0:42 Folder Found Error
"Retitle every line before pasting. These are the topic words, not your words."
```

Those are bag-of-words fragments, not chapter names. Retitled by hand, keeping the generator's
timings — that is the documented division of labour, not a fix to the tool:

| time | chapter |
|---|---|
| 0:00 | The claim |
| 0:10 | Eleven skills, six tools, 535 lines |
| 0:22 | Why a tool is not a prompt |
| 0:42 | The import audit |
| 1:04 | The break |
| 1:30 | The payoff |
| 1:56 | The one tool that surprised me |
| 2:21 | Run it before you trust it |

`deadair.py` on the real transcript: **7 cuts, 0.35s removed, 0.2% shorter.** Nothing to fix — the
narration was cut to length before assembly rather than trimmed after, so there is no padding to
reclaim. That is what a clean result looks like, and it is worth saying out loud that the tool
returned "nothing" rather than inventing a cut.

---

## Shorts (top candidate)

```
SOURCE      0:22 – 0:42   (20s)  "Here's the thing nobody says out loud."
NEW FIRST LINE  You moved one folder and three AI skills stopped working.
                Here's the error nobody checks for.
HOOKSCORE   43/100  WEAK   (SPECIFICITY 46 · STAKES 22 · CURIOSITY 41)
ON-SCREEN   2 SEC, different words:  "ONE FOLDER. THREE BROKEN."
LOOP PASS    last line is "a tool that silently fails is worse than no tool";
             the new first line answers it by naming the failure.
VERTICAL     16:9 centre is safe. The two-column PROMPT/TOOL panel sits inside
             a 9:16 centre crop with 40px margin. The 11-folder strip does not —
             it needs its own vertical build, so do not reuse this frame.
```

Other candidates, rejected: 1:04–1:30 (needs the previous minute of context), 1:56–2:21 (strong but
opens on "One tool genuinely surprised me", which is a trail-in not a complete thought).

43/100 is WEAK and I am not going to pretend otherwise. The transcript's best moment is a
*continuation*, and the skill's first gate is "opens on a complete thought" — so either the Short
gets a rewritten cold open, or this video does not have a Short in it. The honest answer is that
the 1:04 break is the only span that survives on its own.

---

## Voice profile — needs your input

`~/.claude/youtube/voice.md` exists in this sandbox but it is the **unfilled template** shipped
with the pack. Six skills read it and `/yt-seo` is explicit about what to do when it is empty:
ask for three of your own videos, infer the voice, write the file.

I did not invent a persona to satisfy it, and I did not overwrite the template. The narration you
hear is a neutral explainer read, not a claim about how you actually talk. If you give me three
videos, I will fill `voice.md` and the script can be re-voiced against it.

---

**ship it, or change it?**
