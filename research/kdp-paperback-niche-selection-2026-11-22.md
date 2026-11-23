# Amazon KDP paperback niche study — new-niche pass

**Research date:** 22 November 2026 (UTC)  
**Market:** Amazon.com / United States  
**Constraint:** $0 research/marketing budget; no ads, promotions, existing audience, social media, or external traffic.  
**Prior-niche exclusion:** bird-themed large-print word-search books and close variations are excluded.  
**Decision standard:** evergreen subject, stable/increasing demand, and a credible path to organic Amazon sales without marketing are all mandatory. Unknown is not a pass.

> **Verdict: NO VERIFIED WINNER.** The exploratory work did not establish a candidate-specific five-year Google Trends pattern, reproducible Amazon autocomplete results, an audited Amazon first page, longitudinal book-rank movement, or organic-only sales by a comparable new author. Every investigated candidate therefore fails at least two mandatory gates on unknown evidence. This report does not claim that organic sales are impossible; it says the evidence collected cannot verify them under the user's strict standard.

This is a new report, separate from `research/kdp-paperback-niche-selection.md` (the earlier bird word-search study). No book was written.

## 1. Evidence standard and what was actually checked

### Collection approach

I used public web search to locate Amazon.com detail-page/index summaries and free official or primary-source references, inspected the listed open-source projects and their README/source/skills, ran free local checks, and ran KDP paperback-cost arithmetic from KDP's published formula. The current-date Amazon observations below are search-index snapshots, not a pristine, location-personalized, logged-out Amazon session.

### Evidence labels

- **Observed/indexed:** a public source/search result returned a particular listing detail, rank, date, price, review count, or official rule. Rank is one snapshot only.
- **Calculated:** arithmetic applied to a documented KDP print-cost/royalty formula and explicitly stated page/price assumptions.
- **Hypothesis:** a proposed keyword, product angle, or customer need that still requires validation.
- **Unknown:** not captured or not inferable from the available evidence. Unknown is not a pass.

### Important limitations

1. **Amazon autocomplete was not captured.** The open-source tools' live calls to Amazon could not be completed in this environment. No autocomplete phrases below are described as observed suggestions.
2. **Amazon first pages were not directly audited.** Search-engine-indexed Amazon product pages returned useful item details, but this is not a controlled capture of result positions 1–10, sponsored placements, filters, page-two competition, or customer-specific results.
3. **Google Trends was not retrieved.** Five-year Explore URLs for EPA 608, CDL study guide, New York notary exam, and ASVAB study guide failed to load through the page-fetch tool. There is no five-year line, score, or trend direction in this report. PTCB was also not given a usable five-year series. The Google Trends web UI itself uses relative, normalized interest, not absolute search counts; the alpha/API is not assumed available.
4. **No review-text audit was completed.** Search snippets sometimes exposed ratings/review counts, but customer review text was not sampled/coded. Customer gaps are therefore not established from reviews.
5. **A BSR is not a sales history or attribution report.** A rank snapshot can be influenced by recent sales, format/category, seasonality, promotions, and ads. It does not identify organic traffic or prove a new author can repeat it.
6. **Price coverage is incomplete.** Only prices explicitly surfaced in search summaries are quoted. Missing prices are shown as not captured, not guessed.

## 2. Repository/tool discovery and actual use

Public GitHub repository search was used to locate KDP-relevant projects. The connected GitHub app connector was not usable in this session; GitHub CLI was authenticated and public repository search/clone worked. The temporary clones are outside the persistent repo, so the exact upstream links and relative source paths are included here.

| Project | Exact upstream link and inspected paths | What it does / what I actually used | Limits for this study |
|---|---|---|---|
| **KDP Scout** | [Repository](https://github.com/rxpelle/kdp-scout); `README.md`; `kdp_scout/collectors/autocomplete.py`; `kdp_scout/collectors/product_scraper.py`; `kdp_scout/collectors/bsr_model.py`; `kdp_scout/collectors/trending.py`; `kdp_scout/collectors/dataforseo.py`; `kdp_scout/niche_scorer.py`; `kdp_scout/competitor_engine.py`. Clone inspected at `/tmp/kdp-scout-current/`. | A free CLI for Amazon autocomplete, competitor snapshots, rank estimates, trend-source collection, keyword scoring, and Ads CSV imports. Installed to a temporary venv and ran its test suite: **353 passed**. Ran `kdp-scout doctor`. | Doctor reported Amazon unreachable and the local database uninitialized. No candidate autocomplete, competitor snapshots, trend series, or live results were collected. DataForSEO is optional but paid/credentialed; it was not used. Tests validate software behavior, not live data or niche demand. **No `SKILL.md` found.** |
| **AMADS (Book Ads Intelligence System)** | [Repository](https://github.com/sq5rix/amads); `README.md`; `app/scrapers/amazon_autocomplete.py`; `app/scrapers/amazon_search.py`; `app/analysis/keyword_expansion.py`; `app/analysis/keyword_score.py`; `app/pages/4_🔍_Research.py`. Clone inspected at `/tmp/amads/`. | README says it can query Amazon suggestions/search, expand keyword seeds, analyze competitor titles, and import Ads data. I actually ran its **offline** `extract_title_keywords` on three EPA 608 title strings surfaced by web search, plus synthetic offline expansion of `epa 608`. This produced word/ngram variations such as “EPA 608 study guide,” “universal certification,” and “refrigerant handling.” These are title-derived terms, not customer search volume or autocomplete. | Its live scraper was not run because Amazon connectivity was unavailable. The search scraper is fragile HTML parsing and returns no ranking history or reliable organic attribution; the offline expansion creates generic phrases without evidence of demand. The repo README claims an MIT license badge, but the clone had **no `LICENSE` file** at its root. **No `SKILL.md` found.** |
| **TomeScout Claude plugin** | [Repository](https://github.com/semrebayrak/tomescout-claude-plugin); `README.md`; `.claude-plugin/plugin.json`; `.mcp.json`; `skills/kdp-niche-sizing-by-rank/SKILL.md`; `skills/kdp-listing-prep/SKILL.md` (also mirrored under `toolkit/skills/`). Clone inspected at `/tmp/tomescout/`. | README/plugin metadata describes four remote MCP tools: `keyword_boxes`, `check_listing`, `royalty_calculator`, and `bsr_to_sales`. I read both skills and used their recommended caution: rank-to-sales is a **model estimate**, observe the same books repeatedly, and do not promise sales. I used KDP's official published pricing formula for a separate transparent royalty calculation below. | This plugin's README says it **does not look anything up on Amazon**; it calculates from supplied inputs and published KDP rules. No MCP server call or BSR model estimate was performed, because no validated repeated rank series was available. It cannot validate search demand, organic source, review gaps, or a new-author launch. Its output would be estimates, not observed sales. |
| **Google Trends** | [US 5-year Explore example for EPA 608](https://trends.google.com/trends/explore?date=today%205-y&geo=US&q=EPA%20608); [Google Trends Help](https://support.google.com/trends/answer/12764470). | Attempted page retrieval for EPA 608, CDL, New York notary, and ASVAB with five-year windows. | Page retrieval failed; therefore no plot/table was read and no directional claim is made. Values, if obtained from Trends, would be relative interest rather than search counts. |
| **Free web search and public sources** | Amazon and official links appear in sections below. | Used search to identify candidate books, indexed rank/date/review details when present, official credential/regulatory information, occupation outlook, and print economics. | Results are indexed summaries, not a systematic Amazon page-1 dataset or clean-session autocomplete capture. Search ranking itself is not Amazon search ranking. |

**Tool choice summary:** KDP Scout was the most relevant free software for autocomplete and competitor tracking, but the live Amazon network dependency failed. AMADS was useful only for offline title-language extraction. TomeScout's niche-sizing skill is a method, not a demand-data source; its formula tools were not treated as observed market evidence. No fabricated or placeholder data was substituted for tool failure.

## 3. Thirty new niche ideas

These are a **candidate-generation pool**, not 30 validated niches. Only the top five below received substantial indexed-listing/source research; no claim is made that every item has adequate demand or a strong new-author opportunity.

1. EPA Section 608 Universal refrigerant-handling exam prep
2. ASVAB arithmetic reasoning and AFQT math prep
3. Pharmacy Technician Certification Board (PTCB/PTCE) exam prep
4. Commercial Driver's License (CDL) state-specific knowledge-test prep
5. New York State Notary Public exam prep
6. ServSafe Food Protection Manager exam prep
7. CompTIA A+ certification study workbook
8. CompTIA Security+ certification study guide
9. FAA Part 107 remote-pilot knowledge-test prep
10. EMT/NREMT cognitive exam prep
11. Certified Nursing Assistant state skills and written exam prep
12. TEAS nursing-school entrance-test math/science practice
13. GED math and reasoning practice for adult learners
14. NCLEX-PN practical-nursing exam prep
15. SHRM-CP human-resources certification prep
16. Project Management Professional (PMP) exam prep
17. AWS Certified Cloud Practitioner exam prep
18. State real-estate salesperson exam practice (state-specific)
19. State cosmetology board written-exam prep
20. ASE A5 brakes certification prep
21. OSHA 30 construction safety knowledge review
22. Food-handler permit test prep (state/county specific)
23. Ham radio Technician license exam prep
24. U.S. citizenship civics test prep for English learners
25. State electrician journeyman exam calculations and code review
26. State plumbing license exam calculations and code review
27. Motorcycle learner-permit test prep (state-specific)
28. State concealed-carry legal/safety exam workbook (jurisdiction-specific)
29. Tax-preparer credential exam prep (seasonality and rule changes to examine)
30. Louisiana Notary Public exam prep (distinct, state-specific civil-law exam)

## 4. Provisional top-ten shortlist

This shortlist is ordered for **research priority**, not by a completed weighted score. Items 1–5 are the deeply inspected set; 6–10 remain candidate leads that need a new evidence pass. All are unverified against autocomplete, five-year Trends, audited reviews, and organic-new-author performance.

| Priority | Candidate | Why it made a first-pass shortlist | Main unresolved risk |
|---:|---|---|---|
| 1 | EPA Section 608 Universal | Federal certification requirement and long-lived credential; current independent paperback results show several rank snapshots, including comparatively strong category/book ranks. | Dense, rapidly refreshed guides; many free/low-cost study alternatives; no trend series or new-author organic proof. |
| 2 | ASVAB math/AFQT | Long-running standardized test and visible book activity, including strong established-brand listings. | Major publishers and a large number of similar recent books; no evidence a zero-promotion new author can rank. |
| 3 | PTCB/PTCE | Recurring professional credential with a stable core exam purpose. | Crowded current guides and free/official question-bank alternatives; exam outline changes require maintenance. |
| 4 | CDL state-specific | Clear test intent, and indexed all-state and state-specific books have visible category-rank snapshots. | State manuals are free, the regulatory/test content changes, and many near-duplicate state guides exist. |
| 5 | New York Notary Public | Several independent current guides plus an older guide with a notably strong indexed rank; narrowly defined buyer intent. | State-law revisions and free official material; meaningful organic entry opportunity unproven. |
| 6 | ServSafe Food Protection Manager | Repeat credential requirement may support evergreen utility. | Not researched in this pass; do not infer market size or trends. |
| 7 | FAA Part 107 | Defined credential and exam buyer. | Not researched; current market and rule-update burden unknown. |
| 8 | EMT/NREMT | Career-entry exam buyer. | Not researched; credential scope and established competition unverified. |
| 9 | Louisiana Notary | Distinct state exam suggests a sharply scoped product. | Not researched; market size, accessibility, and listing competition unknown. |
| 10 | CNA state exam | Practical job-entry need and state-level specificity. | Not researched; state scope, updates, competitor landscape unknown. |

## 5. Deep review of the five candidates

The following are search-index observations from Amazon product/listing results, recorded in this research pass or the prior exploratory search. **They are not a reconstructed Amazon first page.** Dates/ranks may be stale or vary by format/category. Where the Amazon result did not expose a price, rating, review count, or exact result position, it is marked not captured.

### 5.1 EPA Section 608 Universal — strongest conditional research lead, not a winner

**Buyer / job:** HVACR student, apprentice, or technician needing Core plus Type I/II/III exam preparation, especially a first-time Universal candidate. EPA says technicians who service, repair, or dispose of covered equipment must be certified, the relevant exam is administered through EPA-approved certifying organizations, and credentials do not expire. EPA also explicitly says it does not review or approve preparatory programs/materials. [EPA Section 608 certification requirements](https://www.epa.gov/section608/section-608-technician-certification-requirements) · [EPA certification overview](https://www.epa.gov/section608/section-608-technician-certification).

| Indexed Amazon paperback example | Publication / length | Indexed BSR detail | Price / rating / reviews |
|---|---|---|---|
| Summit SG, *EPA 608 Study Guide* | June 27, 2025; 145 pages | #38,272 in Books; #1 Environmental Pollution Engineering; #13 Chemical Engineering | Not captured in this source summary. [Amazon detail page](https://www.amazon.com/EPA-608-Study-Guide-Field-Proven/dp/1805560883) |
| CertPath PREP, *EPA 608 Universal Certification Study Guide* | July 17, 2026; 183 pages | #62,526 in Books; #1 Chemical Engineering; #4 Environmental Pollution Engineering | Not captured. [Amazon detail page](https://www.amazon.com/EPA-Universal-Certification-Study-Guide/dp/B0H9B82M4R) |
| Philip Moreland, *EPA 608 study guide 2025–2026* | November 4, 2025; 91 pages | #160,842 in Books; #68 Education Assessment | Not captured. [Amazon detail page](https://www.amazon.com/EPA-608-study-guide-2025-2026/dp/937123895X) |
| Aiden R. Morgan / HVACR Training Press, *EPA 608 Study Guide* | October 22, 2025; 92 pages | #888,081 in Books; #525 Mechanical Engineering | Not captured. [Amazon detail page](https://www.amazon.com/EPA-Study-Guide-Certification-Comprehensive/dp/B0FXGCGKZH) |
| Charles Demoise, *EPA 608 Study Guide 2025–2026* | February 7, 2025; 269 pages | #2,443,280 in Books; #4,783 Environmentalism | Not captured. [Amazon detail page](https://www.amazon.com/EPA-Study-Guide-2025-2026-Certification/dp/B0DWDWMWVL) |
| Clarence B. Barrios, *EPA 608 Certification Study Guide 2026–2027* | July 14, 2026; 259 pages | #428,123 in Books; #63 Chemical Engineering | Not captured. [Amazon detail page](https://www.amazon.com/EPA-Certification-Study-Guide-2026-2027/dp/B0H8TFBYR4) |

**Demand/evergreen evidence:** EPA certification is a recurring compliance requirement, and BLS projects HVACR employment growth of **8% from 2024–2034** and about **40,100 openings per year**. This supports the occupational backdrop, not sales for a paperback. [BLS Occupational Outlook Handbook](https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm). Credential longevity is officially stated by EPA, but exam material still needs updates as regulations and exam-prep requirements change.

**Competition/customer gap:** indexed titles span independent publishers and established exam-prep sellers, with multiple 2025–2026 editions, large question counts, mock exams, and repeated promises of passing. This is evidence of **active competition**, not an identified unmet need. EPA's warning that it does not approve prep products makes accurate non-affiliation language essential. Search results also surface free study guides/practice resources, including [ESCO Institute information on free practice exams](https://www.escogroup.org/documents/newexambrochure.pdf) and free web study resources such as [EPA608PracticeTest study guides](https://epa608practicetest.net/study-guides). Review-text mining was not done, so no buyer complaint is verified.

**Amazon autocomplete/search phrases:** not retrieved. Draft phrases for later manual Amazon validation only: `EPA 608 universal study guide`; `EPA Section 608 practice test`; `EPA 608 Type II exam prep`; `EPA 608 Core practice questions`; `HVAC refrigerant certification exam`; `EPA 608 Universal certification`; `EPA 608 study guide for HVAC students`; `EPA 608 Type I II III`. AMADS' offline title extraction generated related title n-grams, but that is not autocomplete evidence.

**Working concept hypothesis:** an accurately sourced, plain-language **Universal** prep workbook centered on section-by-section recall, calculation/number review, timed practice, and detailed rationales that explain why wrong options are wrong—without claiming EPA approval, access to live exam questions, or guaranteed passing. The differentiator is a hypothesis, not a discovered review gap.

**Verdict on gates:** evergreen credential purpose = **supported**; five-year demand stability/growth = **unknown**; evidence that a new author can gain organic Amazon sales with no promotion = **unknown**. Fails mandatory validation.

### 5.2 ASVAB math / AFQT

**Buyer:** first-time ASVAB candidate who needs targeted arithmetic reasoning and mathematics knowledge improvement. Do not market as official or imply access to live questions.

| Indexed Amazon paperback example | Publication / length | Indexed BSR detail | Price / rating / reviews |
|---|---|---|---|
| Mometrix, *ASVAB Study Guide 2025–2026* | April 5, 2025; 346 pages | #94,234 in Books; #18 ASVAB Armed Forces Test | Review summary shows 4.7 stars / 699 reviews for a surfaced ASVAB For Dummies item, not this Mometrix item. [Amazon listing](https://www.amazon.com/dp/1516727452) |
| *2026/2027 ASVAB For Dummies* | March 24, 2026; 656 pages | #925 in Books; #1 ASVAB Armed Forces Test and #1 Study Guides | Price/review count not returned with this rank summary. [Amazon listing](https://www.amazon.com/Dummies-Practice-Flashcards-Videos-Online/dp/1394401876) |
| Matthew Bowling, *ASVAB Study Guide 2026–2027* | January 12, 2026; 364 pages | #21,392 in Books; #6 ASVAB Armed Forces Test | Indexed price $21.84; snippet showed 3 reviews / 5.0 at time of capture. [Amazon listing](https://www.amazon.com/ASVAB-Study-Guide-2026-2027-Full-Length/dp/1516730844) |
| John K. Sturgis, *The Complete ASVAB Prep Book 2025–2026* | Date/length not fully surfaced | #627 ASVAB Armed Forces Test; overall BSR unavailable in result | Not captured. [Amazon listing](https://www.amazon.com/COMPLETE-ASVAB-PREP-BOOK-2025-2026/dp/B0F27S7FCY) |
| Kaplan, *ASVAB Total Prep 2025–2026* | April 1, 2025; 672 pages | #107,793 in Books; #13 ASVAB Armed Forces Test | Not captured. [Amazon listing](https://www.amazon.com/ASVAB-Total-Prep-2025-2026-Kaplan/dp/150629720X) |

**Signals/risks:** obvious competitor strength and breadth. Official ASVAB resources offer sample questions and caution that commercial sellers do not possess actual ASVAB questions; [official ASVAB site](https://www.officialasvab.com/). Free prep and well-known publishers make a generic all-sections guide a difficult differentiation proposition. Search results included strong ranking and reviews, but not rank history or organic-vs-ad source.

**Keyword hypotheses (not autocomplete):** `ASVAB arithmetic reasoning practice`; `ASVAB math study guide`; `AFQT math workbook`; `ASVAB word knowledge practice`; `ASVAB practice test with explanations`; `ASVAB math for beginners`; `ASVAB study guide paperback`.

**Gate status:** evergreen test = supported; five-year demand = unknown; organic new-author path = unknown. Fails mandatory validation.

### 5.3 PTCB / PTCE pharmacy technician exam prep

**Buyer:** pharmacy technician candidate seeking structured study and pharmacy-math practice, using the current PTCB exam outline. The official [PTCB exam page/content outline](https://www.ptcb.org/credentials/certified-pharmacy-technician) should be the authority for future manuscript alignment.

| Indexed Amazon paperback example | Publication / length | Indexed BSR detail | Price / rating / reviews |
|---|---|---|---|
| Lydia Morrison, *PTCB Exam Study Guide* | August 17, 2024; 230 pages | #1,535,812 in Books; #708 Pharmacies | Not captured. [Amazon listing](https://www.amazon.com/PTCB-Exam-Study-Guide-2025-2026/dp/1637759800) |
| *PTCB Exam Prep 2025–2026: Pharmacy Technician Mastery* | February 6, 2025; 106 pages | #957,407 in Books; #207 Pharmacies | Not captured. [Amazon listing](https://www.amazon.com/PTCB-Exam-Prep-2025-2026-Technician/dp/B0DWB2P5QH) |
| *PTCB Exam Study Guide 2025–2026* | February 21, 2025; 289 pages | #6,340,216 in Books; #1,008 Pharmacies | Not captured. [Amazon listing](https://us.amazon.com/PTCB-Exam-Study-Guide-2025-2026/dp/B0DY87SW3R) |
| *PTCB Exam Prep 2025–2026* | April 26, 2025; 194 pages | #3,370,096 in Books; category details varied | Not captured. [Amazon listing](https://www.amazon.com/PTCB-EXAM-PREP-2025-2026-Certification/dp/B0F6NV29KK) |
| *PTCB Exam Study Cards* | April 28, 2023; card set | #242,824 in Books | Price/reviews not captured. [Amazon listing](https://www.amazon.com/dp/1628456736) |

**Signals/risks:** numerous current guides and practice formats, including third-party and official learning resources. PTCB exposes a content outline and sells its own practice products, so an independent book must teach/explain particularly well rather than merely repeat topics. Candidate keyword phrases and title patterns surfaced in listings are not Amazon autocomplete. No review text was mined; no customer gap is proven.

**Keyword hypotheses (not autocomplete):** `PTCB exam study guide`; `PTCE practice test`; `pharmacy technician exam prep`; `PTCB pharmacy math workbook`; `PTCB drug classifications study`; `PTCB test questions with explanations`; `pharmacy technician certification book`.

**Gate status:** recurring credential purpose = supported; stable five-year search demand = unknown; organic new-author sales without marketing = unknown. Fails mandatory validation.

### 5.4 CDL study guide, with state-specific variants

**Buyer:** first-time commercial driver's license permit/test candidate needing the correct state manual and endorsement focus. Core federal requirements are not a substitute for each state's current handbook.

| Indexed Amazon paperback example | Publication / length | Indexed BSR detail | Price / rating / reviews |
|---|---|---|---|
| Matthew Bowling / Mometrix, *CDL Study Guide 2025–2026* | February 8, 2025; 297 pages | #102,173 in Books; #44 Driver's Education | $33.99 shown; 4.6 stars / 35 reviews shown in the same indexed summary. [Amazon listing](https://us.amazon.com/CDL-Study-Guide-2025-2026-Explanations/dp/1516727487) |
| Learnik Press, *CDL Study Guide 2025–2026* | November 26, 2024; 342 pages | #485,592 in Books; #16 Driver's Education | $27.95 appeared in a related purchase snippet, not necessarily current list price. [Amazon listing](https://www.amazon.com/Study-Guide-2025-2026-All-One/dp/1916641180) |
| Texas CDL guide | November 20, 2025; 395 pages | #766,989 in Books; #287 Trucks & Vans | Not captured. [Amazon listing](https://us.amazon.com/Texas-CDL-Study-Guide-2025-2026/dp/B0G396R7NS) |
| Florida CDL guide | November 26, 2024; 156 pages | #712,038 in Books; #424 Driver's Education | Not captured. [Amazon listing](https://www.amazon.com/Florida-CDL-Study-Guide-2025-2026/dp/B0DP4G3DMD) |
| South Carolina CDL guide | October 25, 2025; 373 pages | #1,595,220 in Books; #578 Trucks & Vans | Not captured. [Amazon listing](https://us.amazon.com/South-Carolina-Study-Guide-2025-2026/dp/B0FXTFT7HV) |

**Signals/risks:** results show both all-state and state-specific books and products with extensive question counts, online additions, and free handbook competition. FMCSA training rules add complexity beyond a written-test workbook. States publish free manuals; an author must keep each jurisdiction's material accurate. [FMCSA Training Provider Registry](https://tpr.fmcsa.dot.gov/) and state DMV manuals should be checked directly before any product is designed.

**Keyword hypotheses (not autocomplete):** `CDL permit study guide`; `CDL general knowledge practice test`; `Class A CDL test prep`; `CDL air brakes endorsement practice`; `Texas CDL study guide`; `CDL pre trip inspection checklist`; `CDL test questions explained`.

**Gate status:** continuing license purpose = supported; five-year demand = unknown; no-marketing organic sales for a new book = unknown. Fails mandatory validation.

### 5.5 New York State Notary Public exam prep

**Buyer:** New York applicant preparing for the state notary examination, preferring clear explanations, exam-style practice, and an accurate summary of official law. Start with the free [New York Department of State notary study material](https://dos.ny.gov/system/files/documents/2024/05/notary.pdf) and current official laws/rules.

| Indexed Amazon paperback example | Publication / length | Indexed BSR detail | Price / rating / reviews |
|---|---|---|---|
| Bolton Prep, *New York Notary Public Study Guide with 5 Practice Exams* | Published Feb. 28, 2024 in prior indexed result | #22,049 in Books; #1 Legal Services; #17 Study & Test-Taking Skills | Not captured. [Amazon listing](https://www.amazon.com/Notary-Public-Study-Guide-Practice/dp/1735215848) |
| Robertson Chatham, *New York State Notary Public Study Guide 2025–2026* | June 7, 2025; 156 pages | #564,602 in Books; #19 Legal Reference | Not captured. [Amazon listing](https://us.amazon.com/State-Notary-Public-Study-Guide-2025-2026/dp/B0FCD5SPJG) |
| Dorian Pike, *New York Notary Public Study Guide* | April 20, 2025; 151 pages | #745,581 in Books | Not captured. [Amazon listing](https://www.amazon.com/York-Notary-Public-Study-Guide/dp/B0F5QGV775) |
| Apex Mentor, *New York Notary Public Study Guide 2025–2026* | May 6, 2025; 133 pages | #9,613,994 in Books | Not captured. [Amazon listing](https://us.amazon.com/YORK-NOTARY-PUBLIC-Study-Guide/dp/B0F7RLL1DV) |
| *The NY Notary Public Manual 2025–2026* | August 19, 2025; 252 pages | #365,074 in Books | Not captured. [Amazon listing](https://www.amazon.com/Notary-Public-Manual-2025-Procedures/dp/B0FN3Y55SG) |

**Possible gap—weak evidence:** an individual Reddit post describing preparation praised a commercial book's larger, easier-to-read presentation and plain-language summaries of the short state material, while recommending official material too. This is anecdotal, not Amazon review mining or representative buyer research. [Discussion](https://www.reddit.com/r/Notary/comments/1mdcdyb/my_experience_with_prepping_passing_1st_time_the/). Search results show multiple recent competing books, including a high-rank older title and newer books; a one-state, short exam may cap the addressable paperback audience. No five-year Trends series was retrieved.

**Keyword hypotheses (not autocomplete):** `New York notary public exam study guide`; `NYS notary exam practice test`; `New York notary exam questions`; `New York notary public license law study`; `NY notary exam vocabulary`; `New York notary practice exams`; `NYS notary exam prep paperback`.

**Gate status:** ongoing notary-law/exam purpose = supported, with update obligations; five-year search stability = unknown; evidence for new-author organic sales = unknown. Fails mandatory validation.

## 6. Weighted scoring and gate decision

Requested weights are preserved:

- Organic discoverability: **40%**
- Evergreen demand: **20%**
- Stable/increasing demand: **15%**
- Competition/new-author opportunity: **10%**
- Customer gap: **10%**
- Profit: **5%**

A numerical weighted score is **not responsibly calculable** for any of these five: the largest-weight input (organic discoverability) has no verified autocomplete/keyword or attribution evidence; trend direction is absent; review-derived gaps were not tested. Assigning zeros, midpoints, or invented estimates would disguise missing data. Accordingly, all five receive **N/R (not rateable)**, rather than a fabricated 0–100 score. The research-priority order in section 4 is not a substitute score. Even if an apparent profit scenario is attractive, the mandatory demand and organic-sales gates override it.

| Candidate | Evergreen | Stable/increasing 5-year demand | Organic new-author sales without marketing | Weighted score | Result |
|---|---|---|---|---|---|
| EPA 608 Universal | Supported, with update caveat | **Unknown** | **Unknown** | N/R | **Does not pass** |
| ASVAB math/AFQT | Supported | **Unknown** | **Unknown** | N/R | **Does not pass** |
| PTCB/PTCE | Supported, changing outline | **Unknown** | **Unknown** | N/R | **Does not pass** |
| CDL state-specific | Supported, state/regulatory update risk | **Unknown** | **Unknown** | N/R | **Does not pass** |
| New York Notary | Supported, law/exam updates required | **Unknown** | **Unknown** | N/R | **Does not pass** |

**Why BSR cannot pass the organic gate:** the indexed snapshots show some listing activity and could be consistent with sales, but they do not identify paid vs organic discovery, impressions, conversion, historical consistency, or author launch conditions. A current independent book with a favorable BSR is encouraging, not proof of a repeatable no-marketing route for a new entrant.

## 7. Strongest conditional candidate and hypothetical listing plan

### Strongest candidate: EPA 608 Universal — conditional only

It is the strongest **research lead**, not a verified winner, because it combines an official recurring certification requirement, credential longevity, a positive HVACR occupational outlook, and multiple indexed recent paperback rank snapshots across independent books. It also has visibly heavy competition and free alternatives. Its strongest advantages do not cure missing Google Trends, autocomplete, review-gap, or organic attribution evidence.

**Target buyer:** first-time HVACR student/apprentice preparing for EPA Section 608 Universal certification who wants concise plain-language coverage plus timed, section-separated practice and carefully reasoned answer explanations.

**Proposed differentiating concept (hypothesis):** organize by Core, Type I, Type II, Type III; distinguish legal/regulatory facts from general HVAC background; provide worked explanations and a missed-question tracker; cite primary sources and a visible revision date. Do not imply EPA endorsement, claim access to live exam questions, or promise passing. The free study alternatives mean the book must demonstrate materially better teaching/print utility, not merely repeat the outline.

**Possible title/subtitle (draft idea only):**  
*EPA 608 Universal Exam Practice*  
*Core, Type I, II, and III Review with Timed Practice, Explained Answers, and a Missed-Question Tracker*

**Keyword targets to validate manually on Amazon (8; hypotheses, not autocomplete results):**

1. EPA 608 universal study guide
2. EPA Section 608 practice test
3. EPA 608 certification exam prep
4. EPA 608 Type II practice questions
5. EPA 608 Core exam study
6. HVAC refrigerant certification study guide
7. EPA 608 Type I II III practice
8. EPA 608 exam questions with explanations

**Suggested print format:** paperback, 8.5 × 11 in large trim, black ink, white paper, no bleed, approximately 180 pages if the finished material justifies that length. This mirrors the generous study-workbook format in observed competitors but is a design assumption—not a researched buyer preference. Page count must be determined by a fully original, fact-checked interior; do not pad to reach a page target.

**Price and unit economics (illustrative KDP US scenario, not a market price finding):**

- List-price assumption: **$19.99**.
- KDP large-trim black-ink printing formula from the published US table for 110–828 pages: $1.00 fixed + $0.017/page.
- At 180 pages: $1.00 + (180 × $0.017) = **$4.06 estimated print cost per copy**.
- At a $19.99 Amazon.com list price, above KDP's $9.99 threshold for the 60% paperback rate: ($19.99 × 0.60) − $4.06 = **$7.93 estimated standard-channel royalty per sale** (rounded to cents, before income tax and author labor). KDP says expanded distribution uses a different 40% calculation; it is not included.
- KDP prints on demand, so this calculation does not require the author to buy inventory up front. It excludes cover/design/editing costs, tax, refunds/returns effects, and the value of the author's labor. A $0 budget still requires the author to produce a professionally accurate, original, well-formatted book without paid help.
- Source: [KDP paperback printing-cost table](https://kdp.amazon.com/en_US/help/topic/G201834340), [KDP paperback royalty calculation and thresholds](https://kdp.amazon.com/en_US/help/topic/G201834330). Formulas and assumptions are shown above; this is an estimate, not a sales forecast.

**Risks:** crowded title format and recent competitors; free web guides/practice tests; inaccurate or outdated regulatory facts; copying/copyright exposure if questions or diagrams are derived from other books; unsupported “EPA-approved”/official claims; uncertain Amazon discoverability for a zero-promotion new listing; KDP policy/metadata issues; $7.93 gross royalty is not profit after author time or any production cost.

## 8. Hostile audit

A skeptical reviewer should assume the proposed concept will fail unless all of the following can be disproved with data:

1. **“The niche is evergreen” may be true while the book content decays.** Certification persists, but law, refrigerant standards, exam objectives, and study guidance can change. A dated title can become stale quickly.
2. **Visible BSR can be a launch/promotion spike.** Several ranks are indexed snapshots with no trajectory. One strong rank does not show sustained sales or new-author repeatability.
3. **The product may be commodity content.** The result set already has books advertising practice questions, multiple tests, answer explanations, updated coverage, and large page counts. “More questions” is not differentiation by itself.
4. **Free substitutes are credible.** Candidates can use EPA/ESCO and other no-cost resources. A paperback must justify its price through instructional quality, usability, source discipline, or print workflow—not merely by rearranging free facts.
5. **No review-based pain point has been demonstrated.** The report contains no coded sample of Amazon reviews. Any claim such as “buyers dislike explanations” or “need larger type” would be invented here.
6. **No Amazon search opportunity has been measured.** We did not obtain autocomplete, shopper-query frequency, search placement, sponsored placement, or listing conversion. The candidate keyword list is only a test plan.
7. **No evidence isolates organic sales.** Rank does not expose traffic source; the user's no-marketing constraint is materially stricter than “books in the niche sell.”
8. **A new author could face a credibility deficit.** High-stakes exam buyers may prefer recognized publishers, a credentialed subject-matter author, or recommendations from training programs. This trust issue was not tested.
9. **Copy/accuracy risk is nontrivial.** Exam-like question writing must be original and fact-checked. A low-content, derivative, or legally inaccurate workbook can earn poor reviews or create compliance and reputation risk.
10. **The profit figure is conditional.** $7.93 is a formula output only if a paperback is purchased at the assumed price/page count/rate. It predicts neither demand nor take-home profit.

**Audit outcome:** the hostile alternative explanation—“active incumbents and free substitutes are visible, but no verified zero-promotion entry channel or stable search demand was measured”—cannot be rejected. The winner gate remains closed.

## 9. Final verdict fields

- **VERIFIED WINNER:** None.
- **STRONGEST CANDIDATE:** EPA Section 608 Universal exam preparation, conditional research lead only.
- **EVERGREEN:** Credential use is ongoing and EPA says credentials do not expire; study content requires updates.
- **STABLE/INCREASING DEMAND:** **Not verified**; no candidate-specific five-year Google Trends dataset obtained.
- **ORGANIC SALES WITHOUT MARKETING:** **Not verified**; no attribution, new-author cohort, or stable time series.
- **AUTOCOMPLETE / KEYWORD VOLUME:** No Amazon autocomplete output or search-volume data collected. Draft phrases are hypotheses only.
- **COMPETITION / REVIEWS:** Active competing listings observed from indexed Amazon summaries. Review text not sampled; customer gap not proven.
- **PROFIT:** Conditional KDP formula estimate for one hypothetical EPA book: $4.06 print cost and $7.93 royalty at 180 large-trim B&W pages / $19.99 list price; not a profit or demand forecast.
- **SCORE:** No weighted numerical score assigned because mandatory highest-weight evidence is missing; all five deep candidates are N/R and fail a mandatory gate.
- **DECISION:** **NO VERIFIED WINNER. Do not write the book or spend on it based on this evidence.**

## 10. Minimum evidence needed for a future pass

1. Capture Amazon US autocomplete for each candidate seed and expansions in a clean session, dated and archived; do not convert suggestion presence into a volume estimate.
2. Record the first ten organic and sponsored positions separately for each short-listed query; capture price, format, publication date, review count/rating, BSR/category, and listing URL. Repeat on several dates.
3. Collect a reproducible sample of recent negative and positive reviews across at least five relevant competitors per candidate; code recurring complaints and distinguish verified themes from isolated comments.
4. Export a US five-year Google Trends series for each candidate using comparable terms/categories, document query spelling and geography, and assess direction/seasonality. Trends is relative interest, not absolute volume.
5. Establish a proxy for new-author organic opportunity from repeated listing observations and transparent assumptions. Do not describe any public BSR-to-sales model as sales data or organic attribution.
6. Re-run the weighted score only after every mandatory gate can be evaluated; if organic-only new-author opportunity cannot be evidenced, continue to report **NO VERIFIED WINNER**.

---

## Source index

- [EPA Section 608 Technician Certification Requirements](https://www.epa.gov/section608/section-608-technician-certification-requirements)
- [EPA Section 608 Technician Certification overview](https://www.epa.gov/section608/section-608-technician-certification)
- [BLS HVACR Occupational Outlook Handbook](https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm)
- [Official ASVAB site](https://www.officialasvab.com/)
- [PTCB credentials/content outline entry point](https://www.ptcb.org/credentials/certified-pharmacy-technician)
- [FMCSA Training Provider Registry](https://tpr.fmcsa.dot.gov/)
- [New York State Notary Public official study material](https://dos.ny.gov/system/files/documents/2024/05/notary.pdf)
- [KDP paperback printing cost](https://kdp.amazon.com/en_US/help/topic/G201834340)
- [KDP paperback royalty calculation](https://kdp.amazon.com/en_US/help/topic/G201834330)
- [Google Trends Help](https://support.google.com/trends/answer/12764470)
- [KDP Scout](https://github.com/rxpelle/kdp-scout)
- [AMADS](https://github.com/sq5rix/amads)
- [TomeScout Claude plugin](https://github.com/semrebayrak/tomescout-claude-plugin)
