# Amazon KDP Paperback Niche Research & Decision

**Research date:** 22 November 2026 (UTC)  
**Marketplace:** Amazon.com / United States  
**Publisher assumptions:** new imprint, no audience, no paid tools, no ads, no external traffic, no marketing, $0 production budget  
**Decision standard:** all three user-mandated gates are mandatory. A score cannot override a failed or unverified gate. “Unknown” is not treated as a pass.

> **Executive finding:** The best *relative* candidate among the researched niches is **large-print bird-themed word-search books for older adults and bird lovers**. It has a specific, obvious buyer and an evergreen activity combination. However, the evidence does **not** establish stable/growing Amazon paperback demand, and the Amazon results show many recent near-identical titles plus poor ranks for some indexed books. The zero-marketing organic-sales gate therefore fails. **There is no niche in this evidence set that passes all three non-negotiable gates. Do not start this book under the stated constraints.**

This is a market-selection decision, not a claim that no book in this niche sells. Amazon search visibility, rank and unit sales are not interchangeable; no sales volume is inferred from review counts or BSR.

## 1. Executive decision and audit result

| Decision item | Finding |
|---|---|
| Relative #1 candidate | Large-print bird-themed word-search paperback for older adults / bird lovers |
| Rule 1 — evergreen | **Qualified pass at concept level, not fully proven for Amazon searches.** Birding is year-round for many people and puzzles can be used indoors in any season. A secondary birdwatching source describes warmer-month search seasonality. Exact monthly Amazon demand was not available. |
| Rule 2 — stable or increasing | **UNKNOWN / does not pass.** FWS has a large 2022 participant estimate but explicitly says survey-method changes prevent direct comparison with prior surveys. Google Trends material found was either a broad, short-window puzzle view or about bird-search behavior—not historical Amazon book demand. A source says the term “birdwatching” search peaked in 2004 and has declined, while “birding” is increasingly used. This is not evidence of growth in this paperback niche. |
| Rule 3 — organic sales without marketing | **FAIL.** Exact-topic results show a crowded and rapidly copied micro-niche. Current indexed bird-word-search examples include Books BSRs in the millions, while recent titles do not show enough rank/review evidence to demonstrate reliable organic sales. Long-tail discoverability is plausible, not demonstrated. |
| Weighted score | **63/100** (relative ranking only; highest-scored idea is still disqualified by hard gates) |
| Final decision | **DO NOT START** with the current no-marketing/no-budget requirement. |

### Why a score is still shown
The requested weighted model is useful for comparing the candidates. It is not a viability guarantee. The best candidate earns the highest *relative* score due to clear buyer intent and the specificity of the buyer/search phrase. Its low trend evidence and zero-marketing uncertainty are still decisive hard-gate failures.

## 2. Research scope, methods and limitations

### What I actually did

- Confirmed GitHub CLI authentication and listed repositories accessible to the connected GitHub account. The accessible account list showed `parthoriganal/Parth-` only; it contained no KDP research or book-production tool.
- Searched public GitHub repositories, cloned and inspected READMEs and relevant source files for KDP keyword research, Amazon scraping, a word-search generator and paperback preparation.
- Installed KDP Scout in a temporary environment and ran its test suite: **353 tests passed**. Ran its `doctor` command: Python and local configuration passed, but it reported `www.amazon.com unreachable` in this execution environment. I did not claim it produced live Amazon keyword data.
- Researched Amazon.com search/listing pages, indexed product details and related-item pages through web research. These are snapshots, may be personalized or stale, and are not a full reproducible live scrape of the first ten organic results for every query.
- Checked Google Trends material and public U.S. Fish & Wildlife Service material. No exact keyword monthly search volumes were available.
- Checked KDP’s official printing-cost, royalty and paperback-formatting help pages and calculated one explicit print scenario from Amazon’s published formula.

### What I could not verify

- Amazon keyword volume, Amazon conversion rate, sales per month, review velocity, exact current price for every bird-specific result, or the exact organic rank on a clean US search session.
- A defensible 5-year Google Trends series for the exact Amazon buyer-intent queries (e.g. “bird word search for seniors”). Google Trends is relative search interest, not Amazon paperback demand or search volume.
- A representative set of bird-puzzle customer reviews. Several recent listings have few/no review data in the indexed result, so any claim about common complaints would be invented.
- Actual royalties after returns/taxes, price promotions, marketplace adjustments or later KDP cost changes. The royalty estimate below is a formula estimate, not profit forecast.

**Caution:** Amazon’s “over 4,000 results” and “over 20,000 results” labels are approximate, noisy result counts; they are not unique competing books, monthly demand, or a reliable competition index.

## 3. GitHub tools and skills investigation

The GitHub integration connector was not available as a connector in this session, but `gh` was authenticated as `parthoriganal`. The account’s repository listing showed only the current `parthoriganal/Parth-` repo; public GitHub search was used to inspect third-party projects. No relevant `SKILL.md` file was found in the inspected repos. I found no independently verifiable KDP agent skill with a usable path to report.

### Selected/used: KDP Scout

- **Repository:** [rxpelle/kdp-scout](https://github.com/rxpelle/kdp-scout)
- **Skill/path:** none found; this is a Python CLI application, not a skill.
- **What it does:** README describes Amazon autocomplete mining, competitor ASIN tracking (including BSR, price and reviews when accessible), bestseller/trend collection, keyword scoring, backend keyword export, optional Ads report import, SQLite snapshots and optional DataForSEO volumes.
- **Why selected:** It is MIT-licensed, locally runnable, offers useful no-cost keyword discovery and does not require a third-party data account for its core features. It is the most relevant low-budget research tool among those inspected.
- **How used:** Inspected `README.md`, `collectors/autocomplete.py`, `collectors/product_scraper.py`, `collectors/trending.py`, `niche_scorer.py` and project setup. Installed it outside the repo in `/tmp`, then ran its test suite (**353 passed**). Ran `kdp-scout doctor`; the tool itself reported Amazon unreachable. Therefore it was **not** used to produce live autocomplete/BSR numbers. Web research supplied the Amazon observations in this report.
- **Limitations:** The README states DataForSEO is optional for actual search volume; without it, autocomplete position is a discovery signal, not a search-volume metric. Amazon scraping can be blocked or CAPTCHA-limited. The local doctor confirmed Amazon was unreachable here. Ads metrics require an Ads account/report and are irrelevant for this no-ads user. It is an alpha-stage project; passing tests is not evidence that its estimates are valid for all niches.

### Inspected but not selected: KDP Niche Research Pipeline

- **Repository:** [Buoyairican/kdp-scraper](https://github.com/Buoyairican/kdp-scraper)
- **Skill/path:** none found.
- **What it does:** README/code describe a staged Amazon scraper: search a seed title, extract browse nodes, scan bestseller lists, classify rank/review counts, expand keywords, and write a CSV verdict.
- **Why not used:** The `.env.example` and provider code require a key/credentials for ScrapingBee, ScrapingAnt, ScraperAPI or Oxylabs; its README estimates roughly 100–200 scraper credits per run. That is not a $0 data path. It also labels low-content books via title-word exclusions and relies on heuristic “winning” / “authority” thresholds, so the verdict is not a sales forecast.
- **How inspected:** README, `requirements.txt`, `.env.example`, `src/providers.py`, `src/stage4_bsr.py`, `src/stage5_score.py` and `src/models.py`.
- **Limitations:** alpha project; live Amazon extraction depends on paid provider credentials/credits and remains vulnerable to CAPTCHA/page changes. No run was performed and no output is represented as data here.

### Inspected and rejected: KDP Word Search Generator

- **Repository:** [Ayotayo01/KDP-Word-Search-Generator-](https://github.com/Ayotayo01/KDP-Word-Search-Generator-)
- **Skill/path:** none found.
- **What it does:** React/TypeScript UI, word-placement code and jsPDF output for 8.5 × 11 puzzle/solution pages. Manual word entry exists; theme word generation uses Gemini.
- **Why not selected for production:** Source inspection found quality-control and layout risks that make it unsafe to trust for a paid paperback without substantial changes. The puzzle placer records `unplacedWords`, but the PDF generator prints only `placedWords`, so a puzzle can silently omit requested terms. The grid placement uses random choices without a seed; there is no answer-key verification or QA/test suite evident in the inspected files. The PDF generator lays two columns of 20 words below a 15×15 grid; the computed word-list start is already near the bottom of the page, and the later rows can run off an 11-inch page. This is a serious print-layout defect to test/fix. AI word lists require a Gemini key; manual generation can avoid that dependency. No license file was found in the clone, so reuse rights should not be assumed.
- **How inspected:** `README.md`, `package.json`, `src/utils/puzzleGenerator.ts`, `src/utils/pdfGenerator.ts`, `src/services/geminiService.ts` and `src/App.tsx`. It was not run or used to produce a deliverable.

### Inspected and rejected: generic “KDP paperback formatting complete” repo

- **Repository:** [Bheleboy/claudeskill_kdp_paperback_formatting_complete](https://github.com/Bheleboy/claudeskill_kdp_paperback_formatting_complete)
- **Skill/path:** despite the name, no `SKILL.md` or executable project was found; only a README.
- **Why rejected:** README contains generic guidance and unsubstantiated descriptions of a KDP API/batch-processing interface; it contains no formatter, templates, tests or implementation, and no license file was present. It is not a dependable publishing/QC tool.

### Practical free publishing resources

For actual submission, prefer KDP’s current official paperback guides and its own Print Previewer rather than the weak third-party formatter above. Official references used here include [Paperback Printing Cost](https://kdp.amazon.com/en_US/help/topic/G201834340), [Paperback Royalty](https://kdp.amazon.com/en_US/help/topic/G201834330), [Paperback Submission Guidelines](https://kdp.amazon.com/en_US/help/topic/G201857950), and [Format Your Paperback](https://kdp.amazon.com/en_US/help/topic/G201834190). These are documentation/validation resources, not a content generator. A proper interior still needs independently checked word lists, unique and solvable grids, tested answer keys, legible print typography, embedded fonts and a full cover/interior preview.

## 4. Thirty possible paperback niches generated

These are candidate concepts, not claims of proven demand:

1. Large-print bird word search for seniors and bird lovers
2. Backyard birdwatching logbook for beginners
3. Bird identification field journal for backyard observers
4. Easy large-print crossword for seniors
5. Large-print Sudoku for older adults, with graded difficulty
6. Extra-large-print number-search puzzles for low-vision adults
7. Large-print Bible word search for older adults
8. Large-print word search for older adults, general themes
9. Large-print easy word search for caregivers to use with adults (no medical claims)
10. Left-handed crochet instruction for absolute beginners
11. Beginner crochet with large diagrams and few abbreviations
12. Beginner amigurumi book with original simple patterns
13. Crochet for children with adult-led projects
14. Beginner sourdough starter and discard cookbook
15. Gluten-free sourdough beginner cookbook
16. Small-batch sourdough for one- or two-person households
17. Container vegetable gardening guide for apartment balconies
18. Beginner raised-bed vegetable gardening guide
19. Pollinator garden guide for small yards
20. Native-plant gardening guide by U.S. region
21. Indoor plant-care tracker and troubleshooting journal
22. Backyard chicken-keeping record book
23. Puppy training workbook for first-time owners
24. Indoor enrichment activity guide for cats
25. Freshwater aquarium setup and maintenance log
26. U.S. national-park hiking journal
27. Beginner birding guide to common backyard species
28. RV maintenance and trip logbook
29. Home inventory and insurance record book
30. Car maintenance logbook for first-time vehicle owners

## 5. Shortlist of ten

| Rank | Candidate | First-pass evidence and screen | Main concern |
|---:|---|---|---|
| 1 | Large-print bird word search for seniors / bird lovers | Amazon has multiple direct-match paperback results, including several 2026 publications. Birding has a very large U.S. participant base. | Exact keyword demand is unknown; many near-identical 2026 listings; some indexed ranks are weak. |
| 2 | Left-handed crochet for absolute beginners | Specific instructional problem and year-round craft use; beginner crochet books appear across marketplace results. | No sufficiently verified left-handed paperback SERP/rank/review evidence in this pass; high-quality diagrams and craft authority matter. |
| 3 | Large-print Sudoku for seniors | Direct buyer intent and active current books; listings span multiple difficulty levels and trim sizes. | Numerous series and commodity books; specific rank evidence is weak for new books; trend history for this print sub-niche unknown. |
| 4 | Large-print word search for seniors, general | Clearly visible marketplace activity, many listings and recent books; broad category is evergreen in principle. | Extremely crowded. Indexed query returned 20,000+ results; established books have thousands of reviews. |
| 5 | Beginner sourdough cookbook | Multiple current books, several with 16–939 reviews in returned results; $12.99–$14.99 examples. | Strong first-page competitors, cooking credibility and color-image expectations; sourdough had a pandemic/viral spike risk, exact stable trend not shown. |
| 6 | Birdwatching journal / logbook | U.S. participant base is large; paperback listings span 2016–2025 and include low-review products. | Low-content lookalikes, price pressure around $5.99–$8.99; weak differentiation and royalty. |
| 7 | Easy large-print crossword for seniors | Multiple current 2026 releases and clear buyer language; price/rank vary. | Large-publisher brands and prolific indie series; puzzle quality needs expert construction; trend evidence is unknown/possibly negative for broad crossword searches. |
| 8 | Pollinator / native-plant small-yard guide | Good utility intent and broad gardening interest; potential to localize responsibly. | Seasonal search/spending, strong free extension content, requires region-specific expertise; Amazon buyer search volumes not measured. |
| 9 | Indoor plant-care journal / plant log | Reusable year-round use, visible long-running KDP-style listings. | Low-content saturation and weak evidence that a new blank logbook can rank organically. |
| 10 | Large-print Bible word search for seniors | Direct buyer intent and durable religious-use case; current series observed. | Established religious/puzzle publishers and many similar series; no trend/organic opportunity proof for a new imprint. |

**Rejected at first-pass stage:** seasonal word-search books, dated “2026” annual puzzle books, trend/viral concepts, generic journals/notebooks, and books dependent on franchise names or licensed characters. They fail evergreen, differentiation, or rights constraints.

## 6. Ranked top five and weighted scores

Scoring uses the exact requested weights: organic 30, evergreen 20, historical trend evidence 20, competition/entry 15, gaps 10, profit 5. The numbers reflect observed relative evidence—not predicted sales.

| Rank | Finalist | Organic /30 | Evergreen /20 | Trend evidence /20 | Entry /15 | Gap /10 | Profit /5 | Total | Mandatory gate result |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Large-print bird-themed word search for older adults / bird lovers | 19 | 18 | 8 | 8 | 6 | 4 | **63** | Rule 2 UNKNOWN; Rule 3 FAIL. Disqualified. |
| 2 | Left-handed crochet for absolute beginners | 15 | 18 | 12 | 7 | 7 | 2 | **61** | Rule 2 UNKNOWN for paperback demand; Rule 3 FAIL/UNKNOWN. |
| 3 | Large-print Sudoku for older adults | 15 | 18 | 8 | 6 | 4 | 4 | **55** | Rule 2 UNKNOWN; Rule 3 FAIL/UNKNOWN. |
| 4 | General large-print word search for seniors | 14 | 18 | 8 | 4 | 5 | 4 | **53** | Rule 2 UNKNOWN; Rule 3 FAIL. |
| 5 | Beginner sourdough cookbook | 13 | 14 | 6 | 5 | 6 | 3 | **47** | Trend/evergreen risk and Rule 3 FAIL. |

### Why the other four lost

- **Left-handed crochet beginner guide:** The best alternative on concept quality because a true left-handed, step-by-step instructional gap can be meaningful. But the research did not verify a sufficiently strong Amazon buyer-intent/rank/review profile for that exact paperback sub-niche, and a new author needs excellent diagrams and instruction. It cannot be recommended on an assumption that a niche is low competition just because it is specific.
- **Large-print Sudoku for seniors:** Current titles and series prove active publishing, but also show many overlapping independent books and series. A handful of new titles with weak ranks does not prove a viable organic lane. Exact five-year trend data and steady print demand are missing.
- **General large-print senior word search:** Strong underlying category activity but far too broad and review-heavy. Amazon’s approximate result count was 20,000+ for “word search books for elderly”; established books surfaced with 1,000–3,000+ review counts. Some newer titles can be published, but that is not proof they earn useful organic sales.
- **Beginner sourdough cookbook:** Better unit economics and higher observed prices, and current books have meaningful review totals. It lost because results included strong established titles (including 939-review and 182-review examples), recipes require trust and tested expertise, and “sourdough” had a conspicuous recent craze. The evidence did not establish a stable, non-spiking demand curve for a new generic beginner book.

## 7. Deep dive: relative #1 — large-print bird word-search paperback

### Exact target buyer
An older adult or senior who already enjoys backyard birds and word puzzles, or a family member seeking a readable, non-seasonal paper activity gift for that person. The buyer wants big, uncluttered letters, familiar bird-related vocabulary, clear answer keys and puzzles that do not require a phone or birding expertise.

### Buyer intent and plausible Amazon queries
These are natural buyer-intent phrases confirmed as wording in Amazon search-result titles/related searches; **no search volume or autocomplete position is claimed**:

1. bird word search
2. large print bird word search
3. bird word search for seniors
4. bird watching word search for seniors
5. birdwatching word search for adults and seniors
6. backyard birds word search
7. bird lover’s word search puzzle book
8. large print birdwatchers word search

These are candidate keyword phrases for manual Amazon SERP testing, not verified keyword-volume targets. KDP Scout could not connect to Amazon from this environment, and no paid volume tool was used.

### Demand, evergreen and historical trend evidence

**VERIFIED FACTS**

- U.S. Fish & Wildlife Service’s summary of its 2022 National Survey estimates approximately **96.3 million** U.S. birdwatchers/people who observed birds in 2022. The federal survey is a strong audience-size signal, not a book-sales estimate. [FWS: Birdwatching in America](https://www.fws.gov/story/2024-12/birdwatching-america)
- FWS warns the 2022 survey’s methodology changed such that its participation estimates **cannot be directly compared with previous surveys**. That blocks a clean historical growth claim from the headline figure. [FWS 2022 survey page](https://www.fws.gov/media/2022-national-survey-fishing-hunting-and-wildlife-associated-recreation)
- Amazon search-result pages surfaced bird-specific word-search paperbacks published in 2024, 2025 and repeatedly in 2026. Examples include a 2024 bird word-search, a June 2025 book with 26 reviews and 4.7 stars in a 23-book series, and numerous 2026 titles. This establishes continued product entry and current listings—not sales or year-on-year demand.
- A Google Trends-based bird-search article reports that “birdwatching” searches peaked in 2004, have declined in recent years, and vary seasonally with warmer months, while “birding” has become the more-used query. This is not the exact bird-word-search query, and it warns against equating audience size with keyword growth. [The Bird Geek: When Did Birdwatching Become Popular?](https://thebirdgeek.com/when-did-birdwatching-become-popular/)
- Google Trends’ public “puzzles” page showed recent weekly relative-interest values around 81–82 in April 2026, falling into the low 60s in June/July and rising to mid-60s in August in the returned page snapshot. It is a short, broad term view—not the required five-year series for this niche. [Google Trends: puzzles, US](https://trends.google.com/trends/explore?q=puzzles&geo=US)

**ESTIMATE / INTERPRETATION**

- Bird-word-search activity is plausibly evergreen because both the underlying hobby and puzzle use are not inherently tied to a holiday; this is a format-level inference, not measured monthly Amazon demand.
- The giant total addressable birding audience is not the same as a likely paperback buyer. Only an unknown fraction buys bird-themed puzzle books, and fewer still purchase via Amazon.

**UNKNOWN / GATE CONSEQUENCE**

- Exact Amazon paperback demand and its month-by-month persistence: **UNKNOWN**.
- Historical (5-year) Amazon search interest or sales growth for the exact buyer phrases: **UNKNOWN**.
- FWS itself disallows direct time comparison for its current headline estimate; no 2022-to-prior-survey growth claim is made.
- Google Trends phrase substitutability (birding vs. birdwatching) and its relevance to buyers of books: **UNKNOWN**.
- **Rule 2 does not pass.**

### Amazon competition and new-author evidence

The US Amazon results page for “bird word search” returned numerous close substitutes. Selected observable examples:

| Listing (observed listing data) | Evidence | What it implies—and does not imply |
|---|---|---|
| [Large Print Bird Word Search, Buckside Games](https://www.amazon.com/Large-Print-Bird-Word-Search/dp/B0GTV25X5Z) | Published 22 Mar 2026; 45 puzzles; 91 pages; 6×9; listing showed Books BSR **#3,758,600**. | Exact thematic fit exists; the displayed overall rank is weak. One volatile rank is not a sales estimate. |
| [Bird Word Search, MTD Printables](https://www.amazon.com/Bird-Word-Search-Lovers-Seniors/dp/B0CC47N4RR) | Bird word search listing showed Books BSR **#3,368,329**, Bird Watching rank **#4,424**, Word Search Games rank **#18,528**. | The niche has browse relevance; this observed title is not high in overall Books. Snapshot rank can move and does not prove zero sales. |
| [Relaxing Bird Watching Word Search, Quiet Nest Studio](https://us.amazon.com/Relaxing-Bird-Watching-Word-Search/dp/B0H7Q7TB9S) | Published 5 Jul 2026; 100 puzzles; 144 pages; 8.5×11; displayed Books BSR **#1,936,423**, Word Search Games **#10,071**, Puzzles **#10,706**, Word Games **#10,923**. | Very recent independent title; observed rank is not a strong sales signal. No sales number can be reconstructed from this alone. |
| [Bird Watchers Large Print Word Search for Seniors series](https://www.amazon.com/dp/B0CTHQ2Y4X) | Series listing reports 23 books; one bird title dated 6 Jun 2025 shows 4.7 stars / 26 reviews. | Evidence some buyer engagement is possible in a narrow bird/senior subtopic. The series is prolific; reviews do not reveal sales or the book’s organic source. |
| [Backyard Birds, TAF Publishing](https://www.amazon.com/Backyard-Birds-Search-Lovers-Seniors/dp/B0H62N3TZ8) | Published 19 Jun 2026; 60 one-per-page puzzles, large 8.5×11 trim, six bird themes, answer keys and bird facts; part of a 10-book “Backyard & Beyond” series. | Strong product execution/series competitor already covers several obvious differentiation ideas. Review/rank evidence was not available in the result. |
| [Birds of North America Large Print Word Search](https://us.amazon.com/Birds-North-America-Large-Search/dp/B0H92PBWH7) | Published 25 Jun 2026; 120 puzzles, bird facts, three difficulty levels, answer keys; 189 pages. | The obvious “more puzzles + facts + difficulty levels” concept is already being used in a new listing. |
| [Large Print Word Search for Birdwatchers](https://www.amazon.com/Large-Print-Search-Birdwatchers-Birdwatching-Themed/dp/B0HNX1CHFT) | Published 20 Oct 2026; 100 puzzles; 18pt type; one puzzle per page; large grid and solutions. | Even the proposed accessibility/one-per-page hook is entering the niche now. |

**First-page strength:** I cannot certify a clean, personalized-independent Amazon first page from indexed results. The evidence supports **high result crowding**, not a reliable first-page count. Some top broad word-search competitors have 1,000+ reviews, while specific bird-only titles are recent and often show few or no reviews. Amazon has many more books with recognizable brands/series such as Brain Games, Publications International, Kappa and large independent series. The target should not be described as an empty market.

**New-author opportunity:** Recent independent publications and a June 2025 bird-senior book with 26 reviews show that a newish title can collect reviews. They do **not** show that it did so without marketing, nor that it generated meaningful organic sales. A specific long-tail book may have more topical relevance, but it still starts without reviews and competes against a rising number of almost identical listings.

### Quality weaknesses and customer complaints

- **Verified customer complaint sample:** a general 2025 large-print word-search listing with six ratings includes one U.S. review “Not what I expected” complaining that the word list was not alphabetical. [Listing/review snippet](https://www.amazon.com/2025-SEARCH-ADULTS-LARGE-PRINT/dp/B0DFPKVGQX). This single review is an anecdote from a broad word-search product, not evidence of a common bird-book complaint.
- **Bird-specific review corpus:** insufficient in the indexed listings examined. I found no defensible basis to say readers commonly complain about errors, tiny type or repeated words in bird-themed books.
- **Observable product opportunity, not proven complaint:** specify the actual point size, control grid size and direction rules, show a sample, use readable large trim, proof every solution against its grid, and use carefully checked North American bird terms. New books use differing puzzle counts and formats, and some titles do not make their design details as concrete as the strong competitor listing above. The opportunity is execution and accuracy, not an untouched topic.
- **Critical constraint:** two recent competitor listings already promise one-puzzle-per-page, large print, answer keys, facts and/or difficulty levels. Merely adding those features will not be enough differentiation.

### Best book concept if one were to test it (not a recommendation to publish now)

A **fact-checked, accessible backyard-bird word-search collection for older adult birders**, with 100 unique, themed puzzles, explicit 18–20 pt letters, a calm easy-to-medium progression, each puzzle on a dedicated page, varied word directions stated clearly, all answer keys independently verified, and concise factual bird notes checked against reliable references. Keep facts and species labels original and accurate; avoid medical claims such as preventing dementia or improving cognition.

This is better than a blank birding logbook because it gives the buyer finished activity content and avoids the crowded ultra-low-content journal format. It is still already close to new 2026 products and therefore does not overcome the organic-sales gate.

### Suggested metadata title and pricing/specs

**Recommended title (only if future validation changes the decision):**  
**Backyard Bird Word Search for Seniors**  
**Subtitle:** *100 Large-Print Puzzles for Bird Lovers, with Easy-to-Read Grids, Bird Facts and Complete Solutions*

**Recommended paperback spec:** 8.5 × 11 in; black ink on white paper; no bleed; approximately 144 pages; one puzzle per page plus front matter and dedicated solution pages. Use a matte cover as a visual preference, not a cost-saving assumption. KDP’s minimum inside margin at 144 pages is 0.375 in; use more generous outer margins and verify every page in KDP Print Previewer. KDP confirms trim/page constraints and page-count-based margins in its [submission guidance](https://kdp.amazon.com/en_US/help/topic/G201857950).

**Price estimate:** $9.99 as an initial test price is an estimate, not verified bird-niche median pricing. General large-print word-search comparables were surfaced around $6.99–$11.97, but the exact bird-specific prices were missing in the observed results. A higher price may be difficult against volume-heavy rivals.

### Printing cost and royalty calculation (US, estimate from current official KDP table)

KDP’s official current table says large trim is over 6.12 inches wide **or** over 9 inches tall. 8.5×11 is therefore large trim. For 110–828 page black-ink large-trim paperbacks, the US cost is **$1.00 fixed + $0.017/page**. KDP says it prints on demand and does not charge printing cost up front; printing is deducted from royalties. [Official printing-cost page](https://kdp.amazon.com/en_US/help/topic/G201834340)

- 144 pages: $1.00 + (144 × $0.017) = $3.448; KDP rounds the print cost to **$3.45**.
- At a $9.99 Amazon.com list price: 60% tier applies; royalty = (0.60 × $9.99) − $3.45 = **about $2.54 per copy**, before taxes/withholding and any other adjustments.
- At $8.99: the 50% tier applies; royalty = (0.50 × $8.99) − $3.45 = **about $1.05 per copy**.
- Official KDP rate threshold: Amazon.com paperbacks at or below $9.98 use 50%; at or above $9.99 use 60%. [Official royalty page](https://kdp.amazon.com/en_US/help/topic/G201834330)

This is a thin unit margin for a color-free puzzle paperback at the likely competitive price. A proof/author copy may be desirable for quality control but adds purchase and shipping costs, which conflicts with a strict $0 cash budget. No royalties estimate sales volume.

## 8. Final hostile audit: try to disprove the relative winner

I actively looked for reasons the bird-word-search choice should be rejected rather than merely confirming the idea:

1. **Demand size is being confused with buyer demand.** FWS’s 96.3 million figure counts bird observation participation, not puzzle purchases. The denominator cannot validate this book’s Amazon demand.
2. **The best official audience statistic is not trend-comparable.** FWS says methodological changes mean direct comparison to previous survey estimates is invalid. That leaves no official historical growth claim.
3. **The adjacent search trend is not a clean positive.** A bird-search source reports the word “birdwatching” declining from its 2004 peak and warm-month seasonality, while “birding” changes terminology. The puzzle use case might smooth seasonality, but that is only a hypothesis.
4. **This is no longer an unsaturated micro-niche.** Amazon results already show a series of 23 senior puzzle titles, multiple 2026 bird-specific releases, and product concepts using one puzzle per page, large print, facts, levels and full solutions. A new title would be one among many.
5. **Available BSRs do not demonstrate sales.** Examples at #1.9M–#3.8M in Books are weak visibility signals. Rank changes over time and category ranks are not unit counts; I have not converted them into sales.
6. **The few reviews are not proof of organic acquisition.** One 2025 bird-senior title with 26 reviews could have sold through ads, series cross-promotion, external traffic, or organic search; the listing evidence does not distinguish these.
7. **No reliable review-gap proof exists.** The only specific complaint found was one broad-category review, not a bird-book-wide weakness. The strongest new competitors already claim many of the expected quality features.
8. **Profit is not attractive enough to offset discoverability risk.** At a plausible $9.99 price and 144 pages, the formula yields about $2.54 per sale. A lower competitive price reduces it to about $1.05. This is not a large buffer for a product that needs extensive puzzle verification.
9. **A zero-budget production process raises quality risk.** The inspected open-source word-search generator has silent unplaced-word risk, no evidenced reproducible seed/QA pipeline and an apparent overflow layout. Fixing it and proofreading a 100-puzzle book requires real time and attention; simply generating pages is not quality control.

### Audit conclusion
The hostile audit **does not rescue the candidate**. It is the best of the researched ideas on specific buyer intent and conceivable long-tail relevance, but it fails the required trend-evidence gate and fails the highest-weight organic-without-marketing gate. No next-ranked finalist has stronger verified evidence sufficient to replace it; switching would just hide the same unknowns or add greater competition/seasonality.

## 9. Sources and direct evidence links

### Amazon.com observed listings and search pages

- [Bird word search search results](https://www.amazon.com/bird-word-search/s?k=bird+word+search)
- [Bird Watching Word Search for Seniors, BloomMind Press](https://us.amazon.com/Bird-Watching-Word-Search-Seniors/dp/B0GTHTS6HG)
- [Large Print Bird Word Search, Buckside Games](https://www.amazon.com/Large-Print-Bird-Word-Search/dp/B0GTV25X5Z)
- [Bird Word Search, MTD Printables](https://www.amazon.com/Bird-Word-Search-Lovers-Seniors/dp/B0CC47N4RR)
- [Quiet Nest Studio bird word search](https://us.amazon.com/Relaxing-Bird-Watching-Word-Search/dp/B0H7Q7TB9S)
- [TAF Publishing: Backyard Birds](https://www.amazon.com/Backyard-Birds-Search-Lovers-Seniors/dp/B0H62N3TZ8)
- [Philip Ashmore: Birds of North America word search](https://us.amazon.com/Birds-North-America-Large-Search/dp/B0H92PBWH7)
- [Large-print birdwatcher word search (Oct 2026)](https://www.amazon.com/Large-Print-Search-Birdwatchers-Birdwatching-Themed/dp/B0HNX1CHFT)
- [Senior large-print word-search series (bird title and review count)](https://www.amazon.com/dp/B0CTHQ2Y4X)
- [Large-print word search for elderly Amazon search results](https://www.amazon.com/word-search-books-elderly/s?k=word+search+books+for+elderly)
- [2025 adult large-print word search—price, rank and one review](https://www.amazon.com/2025-SEARCH-ADULTS-LARGE-PRINT/dp/B0DFPKVGQX)
- [Beginner crochet result example](https://www.amazon.com/Crochet-Beginners-Step-Step-FULL-COLOR/dp/B0CL7PDC3G)
- [Sourdough cookbook example (182 reviews, $12.99 in returned listing)](https://us.amazon.com/Sourdough-Cookbook-Beginners-Mouthwatering-Homemade/dp/B0DJ4XVWW9)
- [Large-print Sudoku senior book example](https://us.amazon.com/Big-Font-Sudoku-Puzzles-Beginners/dp/B0HBLKY3DK)
- [Gardening journal competitor example](https://www.amazon.com/GARDENING-JOURNAL-TRACKER-SHOPPING-HANGING/dp/169213048X)

### Demand and trends

- [U.S. Fish & Wildlife Service: Birdwatching in America (2022 survey estimate and comparability caveat)](https://www.fws.gov/story/2024-12/birdwatching-america)
- [USFWS 2022 National Survey page](https://www.fws.gov/media/2022-national-survey-fishing-hunting-and-wildlife-associated-recreation)
- [Google Trends: puzzles, United States](https://trends.google.com/trends/explore?q=puzzles&geo=US)
- [Google Trends-based bird-search history article](https://thebirdgeek.com/when-did-birdwatching-become-popular/)
- [Searching for Birds: five-year Google Trends dataset description](https://searchingforbirds.visualcinnamon.com/)
- [Audubon: Birding Is a Booming Hobby—and a Big Business](https://www.audubon.org/magazine/birding-booming-hobby-and-big-business) (also notes the latest FWS survey cannot be directly compared with previous methods)

### KDP official publishing economics and format rules

- [Paperback Printing Cost](https://kdp.amazon.com/en_US/help/topic/G201834340)
- [Paperback Royalty](https://kdp.amazon.com/en_US/help/topic/G201834330)
- [Paperback Submission Guidelines](https://kdp.amazon.com/en_US/help/topic/G201857950)
- [Format Your Paperback](https://kdp.amazon.com/en_US/help/topic/G201834190)
- [Print Book Pricing Page](https://kdp.amazon.com/help/topic/GPGVYM9KWTYLD2GD)

### GitHub sources

- [KDP Scout](https://github.com/rxpelle/kdp-scout)
- [KDP Niche Research Pipeline](https://github.com/Buoyairican/kdp-scraper)
- [KDP Word Search Generator](https://github.com/Ayotayo01/KDP-Word-Search-Generator-)
- [Generic paperback formatting README repo](https://github.com/Bheleboy/claudeskill_kdp_paperback_formatting_complete)

---

## Final verdict

**BEST NICHE:** Large-print bird-themed word-search paperbacks for seniors / older bird lovers (best relative candidate only; not cleared by the hard gates)

**BEST BOOK CONCEPT:** *Backyard Bird Word Search for Seniors — 100 Large-Print Puzzles for Bird Lovers, with Easy-to-Read Grids, Bird Facts and Complete Solutions*

**ORGANIC SALES WITHOUT MARKETING:** **Low and unproven.** Long-tail buyer intent exists, but the exact niche has many recent near-identical listings, poor observed overall BSRs for some books, no reliable organic-attribution evidence, and no measured Amazon query volume. The “no marketing” condition cannot be validated as achievable from current evidence.

**FINAL DECISION: DO NOT START.**
