# STAGE 2 — REVISIONS FOLLOWING DIRECTION
## Corrections applied before Stage 3

**Date:** 2026-11-21 · Supersedes §3, §5, §6.2 and the Ch 6 / Ch 13 specs in `STAGE2_EDITORIAL_BLUEPRINT.md`

---

## R-1. CHAPTER 13 — EVIDENCE COMPARISON RE-SPECIFIED

### ⚠️ I got this wrong in Stage 1, and the correction matters

My Stage 1 claim table (row 19) recorded Calafiore 2025 as finding "manual therapy pooled effect larger than exercise," and I flagged it as contradicting Hayden. **That was a misreading, and it would have put a false claim in the book.**

**What Calafiore 2025 actually is:** a **network** meta-analysis — 11 RCTs, **662 adults**, chronic non-specific neck pain. Its own methods state: *"we considered the group not subjected to the intervention as the control reference of the network."* **Every reported estimate is versus control** — waiting list, sham, conventional physiotherapy. None is a head-to-head manual-therapy-versus-exercise comparison.

The actual figures, all versus control:

| Intervention | Effect (95% CI) |
|---|---|
| Manual therapy | −2.67 (−4.19, −1.30) |
| Manual therapy alone | −2.21 (−4.42, −0.04) |
| Exercise + CBT | −2.05 (−3.63, −0.41) |
| Conventional physiotherapy | −1.44 (−3.21, −0.45) |
| Exercise alone | −1.10 (−2.37, −0.16) |

**Risk of bias: 3/11 studies (27%) low; 6/11 some concerns; 2/11 high.**

**What it actually shows:** everything beat doing nothing. Manual therapy's *point estimate* is larger than exercise alone, but the confidence intervals overlap substantially, the estimates are **indirect** (constructed through the network, not measured against each other), and the study is modestly sized. The headline of the paper is not "MT beats exercise" — it is that the **combination** of the two had a **91% probability of being the best option**. Not manual therapy alone.

### The corrected comparison — how Chapter 13 will present it

Four dimensions, as directed:

**1. Populations**
- Hayden 2021: **chronic low back pain**, adults, mixed settings.
- Calafiore 2025: **chronic non-specific neck pain**, adults, 662 participants.
- *These are different conditions. Neither can be used to make a claim about the other.* This alone limits how much the two can be set against each other, and Chapter 13 must say so.

**2. Interventions**
- Hayden: exercise therapy of any type versus (a) no treatment/usual care/placebo, (b) other conservative treatments including manual therapy.
- Calafiore: MT, TE, TE+CBT, conventional PT — **all versus a control reference**, combined via network.
- *The comparison structures are not equivalent. Hayden contains a direct exercise-versus-manual-therapy subgroup. Calafiore does not contain a head-to-head at all.*

**3. Outcomes**
- Hayden: pain intensity and functional limitations, at earliest follow-up and beyond.
- Calafiore: **pain intensity only** (VAS/NRS). No function, no disability, no quality of life.

**4. Limitations and certainty**
- Hayden: **moderate certainty** for exercise versus no treatment; heterogeneity high (I²=81%); some evidence of publication bias (Egger p=0.001); 11 studies at high risk of bias (13% of data).
- Calafiore: only **27% low risk of bias**; **no blinding possible**; single outcome; indirect estimates; small network.

### The defensible synthesis (what Chapter 13 will actually say)

> The **direct** evidence — the comparison actually made inside a trial or a meta-analysis — is Hayden's subgroup: exercise versus manual therapy, **MD 1.0 (95% CI −3.1 to 3.1)**, which is no difference. That is the strongest available answer to "which is better," and it says neither.
>
> The **indirect** evidence — Calafiore's network — puts manual therapy's point estimate ahead of exercise alone, but through a constructed comparison, on pain only, in a different condition, with three-quarters of the trials at some or high risk of bias.
>
> **What both agree on:** doing something beats doing nothing. **What neither shows:** that manual therapy outperforms exercise in a head-to-head test. **What the best evidence supports as a combination:** the two together rank highest — which is also what NICE says, and what the 2017 neck guideline says.

**Chapter 13's thesis survives the correction, and gets stronger:** not "movement beats the ball," but **"the ball is not a substitute for movement, and the evidence for combining them is better than the evidence for either alone."** That is a more accurate claim and a more useful one.

**Verification status:** ⚑ **Still required before drafting** — full text of Calafiore 2025 (*J Back Musculoskelet Rehabil* 2025;38(3):407–419) to confirm the control-reference structure and the risk-of-bias counts, which I have from a full-text PDF excerpt. Hayden's MD 1.0 subgroup confirmed from the published plain-language summary.

---

## R-2. CHAPTER 6 — PREVALENCE STATISTIC RECONSIDERED

### The statistic is now verified — with conditions that change how it can be used

**Verified at source:** Henschke N, Maher CG, Refshauge KM, et al. *Arthritis Rheum.* 2009;60(10):3072–3080. doi:10.1002/art.24853

- **1,172 consecutive patients**, primary care, Sydney, **acute low back pain**, mean age ~44
- **11 cases (0.9%)** of serious pathology
- Of those 11: **8 vertebral fracture, 1 cauda equina syndrome, 2 inflammatory disorder. No cancer. No infection.**
- **80.4% of all patients had at least one red flag** (median 2)
- Clinicians identified **only 5 of the 11** at first consultation, and made **6 false-positive diagnoses**

**Corroborating 2026 meta-analysis** (*Pain Medicine* 27(1):43): serious spinal pathology **0.8% in primary care**, **6.9% in tertiary care**; fracture 0.7% primary care.

### Why this does *not* license a reassurance line

The user's three conditions — independently verified ✅, relevant to condition and population ⚠️ partially, accurately contextualized ⚠️ — are only partly met:

1. **It is low back pain, acute, primary care.** It says **nothing** about neck pain, nothing about chronic pain, nothing about secondary care. Using it as a general "don't worry" line would be exactly the blanket reassurance the direction prohibits.
2. **The same study undermines reassurance as a strategy.** 80% of these patients had a red flag, and clinicians still missed over half the serious cases. If anything, the study argues that red flags are common and imprecise — a reason for *care*, not calm.
3. **A reassuring statistic in a self-treatment book has an asymmetric failure mode.** If a reader is reassured and wrong, the cost is a delayed diagnosis. If a reader is cautious and wrong, the cost is a needless appointment.

### Revised Chapter 6 handling

| Old plan | Revised |
|---|---|
| "Serious spinal pathology is under 1% in primary care" as a general counterweight | **Removed as a general statement.** |
| — | Replaced with a **narrow, fully attributed, setting-specific** paragraph, used once, in the lower-back section only |

**The replacement text (Ch 6):**

> It is worth knowing how imprecise this list is, in both directions. In one large study of 1,172 people who came to a family doctor with **acute low back pain**, 11 — just under 1% — turned out to have a serious spinal condition, mostly vertebral fractures. But 80% of everyone in that study had at least one warning sign, and the doctors missed more than half of the serious cases at the first visit. *(Henschke 2009)*
>
> Two things follow. Warning signs are common and they are not a diagnosis — having one does not mean something is seriously wrong. And they are not a substitute for judgement — which is why the instruction on the next page is to get checked rather than to self-assess.
>
> This figure comes from people with acute low back pain in primary care. It does not apply to neck pain, to long-standing pain, or to anyone already under specialist care.

**And the anti-alarmist function is now carried by framing, not by a statistic:** the list is introduced as short, finite, and mostly about *when to ask someone*, not *what you have*. No fear language. No "could be fatal." The emergency items are stated plainly and briefly, which is how emergency information should be written.

---

## R-3. WORD COUNT REASSESSED

**Old target: 37,800 body words.** That was set before the chapters were specified in detail, and it was inflated — it would have required padding against the no-padding rule.

**New target: 27,000–29,000 body words.** Re-budgeted by what each chapter has to say, not by a round number:

| Part | Chapters | Words |
|---|---|---|
| I — Understanding | 1–5 | 10,400 |
| II — Toolkit | 6–11 | 10,900 |
| III — Routine | 12–15 | 6,650 |
| **Body total** | **15** | **≈27,950** |

Per chapter: Ch 1 2,100 · Ch 2 2,300 · Ch 3 2,500 · Ch 4 1,900 · Ch 5 1,600 · Ch 6 1,800 · Ch 7 1,400 · Ch 8 1,800 · Ch 9 2,200 · Ch 10 1,900 · Ch 11 1,800 · Ch 12 1,500 · Ch 13 2,100 · Ch 14 1,250 · Ch 15 1,800.

**Treated as a ceiling, not a quota.** Any chapter that finishes short stays short. Ch 7 and Ch 14 are deliberately the smallest: one has three objects to describe, the other has blank pages to do the work.

**Page count: deliberately provisional, per direction.** Rough estimate at this length is **145–165 pages** at 6×9 with the specified margins, plus front and back matter. **Not to be treated as a target.** Recalculated properly at Stage 4 once Chapter 1 exists and a real layout prototype has run — because line count, leading, and illustration sizing all move the number, and estimating it twice is cheaper than designing to a wrong one.

---

## R-4. IASP DEFINITION — QUOTATION RIGHTS RESOLVED

**Verified:** the IASP terminology page states: *"To request permission to use, reprint or translate any IASP Publications, complete the Copyright Permissions Request Form."* The *PAIN* journal states: *"IASP holds the rights to the content of all PAIN manuscripts."*

**The definition is IASP copyright.** The 2020 paper carries the notice *"Copyright © 2020 by the International Association for the Study of Pain. Unauthorized reproduction of this article is prohibited."*

**Decision: paraphrase, with attribution. Do not quote verbatim.**

The definition is short and its ideas are what matter, so a paraphrase loses nothing:

> The International Association for the Study of Pain defines pain as an unpleasant sensory and emotional experience that is associated with — or that resembles what is associated with — actual or potential tissue damage.

Attribution is required and sufficient. If a future edition wants the verbatim wording, it needs a written permissions request to IASP first, and that is a publisher decision, not a drafting one.

**One line of the accompanying notes is also worth using, paraphrased:** that pain and nociception are different things, and that pain cannot be inferred from sensory nerve activity alone. Same handling — attributed, not quoted.

**Also removed from the plan:** any block-quotation formatting, and any reproduction of the full list of six notes. Both would move from fair comment into reproduction.

---

## R-5. STAGE 3 SCOPE CONFIRMED

Chapter 1 only, complete and polished, delivered with:
1. the chapter text
2. per-claim source citations
3. an editorial self-review (what I think is weak, and why)
4. unresolved factual questions
5. **a hard stop** — no Stage 4 until reviewed

---

## SUMMARY OF WHAT CHANGED IN THE BOOK

| Item | Was | Now |
|---|---|---|
| Ch 13 thesis | "Movement beats manual therapy" | "Neither substitutes for the other; combining them has the best support" |
| Calafiore reading | MT > exercise (head-to-head) | Both > control; indirect; different condition; mostly not low risk of bias |
| Ch 6 prevalence | General <1% reassurance | Narrow, attributed, setting-limited, paired with its own limitations |
| Body words | 37,800 | ~27,950 ceiling |
| Page count | 188–196 | Provisional 145–165, recalculated at Stage 4 |
| IASP | Quote verbatim | Paraphrase with attribution; permission required for quotation |
