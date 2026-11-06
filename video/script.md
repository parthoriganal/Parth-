# "I Broke My AI Skill Pack on Purpose"

Written with `.claude/skills/youtube-agent-skill` — `/yt-script` (hook scored by `hookscore.py`),
`/yt-package` (`title.py`), `/yt-chapters`, `/yt-edit`, `/yt-shorts`. Runtime estimate at 150 wpm.

Every number in this script was measured during the install, not invented — the skill's rule
("never invent a number") is load-bearing here, because the video is about verification.

## Hook options (top two, per yt-script: never hand over one)

**1 — WINNER, 56/100 WORKABLE — The Impossible Claim**

> You're probably installing AI skills you never actually run. So I moved one folder and watched
> this one throw a ModuleNotFoundError.

```
SPECIFICITY 42 | ADDRESS 96 | STAKES 48 | CURIOSITY 41 | BREVITY 100 | VERDICT 56 WORKABLE
weakest: CURIOSITY - cut the half of the sentence that answers itself
```

**2 — 51/100 WEAK — The Impossible Claim** (the round-2 rewrite, kept to show the trade)

> You're probably installing AI skills you never run. I moved one folder in this one and it broke
> somewhere I wasn't looking.

```
SPECIFICITY 52 | ADDRESS 96 | STAKES 74 | CURIOSITY 24 | BREVITY 100 | VERDICT 51 WEAK
```

Nine hooks were written and scored. Rewriting the winner to fix its weakest property raised
specificity +10 and stakes +26 but cost curiosity −17 — net −5. The diagnosis was right and the
fix was wrong. Keeping #1.

---

## Script

### HOOK — 0:00–0:15

> You're probably installing AI skills you never actually run. So I moved one folder out of a
> YouTube skill pack, and it broke somewhere I wasn't looking.

[ON SCREEN: the folder tree, `yt-edit` lifting out of the pack and floating away]

### THE TURN — 0:15–0:30

> Eleven skills, six Python tools, five hundred thirty-five lines of code. I installed all of it,
> and then I tried to break it. This is what broke.

[ON SCREEN: counter 11 skills / 6 tools / 535 lines, then a red crack across it]

### BEAT 1 — the claim — 0:30–0:55

> Here's the thing nobody says out loud. Most skill packs are prompts. You read them, the model
> reads them, nothing executes. This one is different: it ships six Python tools that are supposed
> to actually run. And that matters, because a tool that silently fails is worse than no tool.

[ON SCREEN: two columns — "prompt (read)" vs "tool (run)" — the right column lighting up]

### BEAT 2 — the audit — 0:55–1:20

> So before trusting it, I audited it. Every import in all six files: csv, json, os, re,
> statistics, sys. That's the whole list. No network. No subprocess. No eval. No API key. Which
> means it runs anywhere, including here.

[ON SCREEN: the six import names typed out, then "no network / no subprocess / no eval" struck through in green]

### BEAT 3 — the break — 1:20–1:50

> Then I broke it. I moved one folder, `yt-edit`, out of the pack. Seventeen checks. Eight of them
> failed. And the error wasn't "file not found" — it was `ModuleNotFoundError: No module named
> deadair`. Because three of these tools import across sibling folders. Move one, and two others
> break at runtime. Not at install. At runtime.

[ON SCREEN: the check list flipping red, 8 of 17, with the ModuleNotFoundError line highlighted]

### BEAT 4 — the payoff — 1:50–2:25

> That's the payoff, and here it is: an install that looks clean can still be broken. The only way
> to know is to run the tools, not to count the folders. So I wrote one script that runs all six
> against generated fixtures and asserts on their output. It's in the repo. `npm run
> verify:yt-skill`. Seventeen checks. It fails loudly, which is the whole point.

[ON SCREEN: the verify script running, checks ticking green, `17 passed, 0 failed`]

### BEAT 5 — the one that surprised me — 2:25–2:50

> One tool genuinely surprised me. It ranks videos not by views, but by how far each beat its own
> channel's median. A four-hundred-thousand-view video on a huge channel? Ignored. The same views
> on a small channel? Fourteen point seven eight times its median — ranked first. That's a better
> idea detector than view count, and it's seventy-four lines.

[ON SCREEN: two bars — big channel 410k flat, small channel 412k spiking, `14.78x` label]

### CLOSE — 2:50–3:00

> If you install one skill pack this week, run it before you trust it. The verify script is in the
> repo.

[ON SCREEN: `npm run verify:yt-skill` on a dark background]

---

**Runtime:** ~430 spoken words at 150 wpm ≈ **2:52**
**Winning formula:** The Impossible Claim — it works here because the claim ("skills you never
run") is something the viewer can be caught doing, and the second sentence proves it happened.
