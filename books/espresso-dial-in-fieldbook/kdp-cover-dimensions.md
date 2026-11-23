# KDP paperback cover specification — current production file

**Checked:** 22 November 2026  
**Product:** *Espresso Dial-In Fieldbook for Home Baristas*  
**Current intended print options:** paperback; left-to-right; black ink; white paper; 8.5 × 11 in trim; 116 interior pages; interior no bleed. These are the project's print inputs, not a saved KDP title configuration.

## KDP eligibility and specification check

The current KDP trim-size table lists **8.5 × 11 in** B&W/white paperback at **24–590 pages**; 116 pages is within that range. The online cover calculator page currently accepts custom trim up to 8.5 in width and 11.69 in height; this trim is within those limits. KDP's cover specification requires a single PDF with back, spine, and front, and 0.125 in cover bleed at top, bottom, and both outside edges.

The current official white-paper black-ink spine factor is **0.002252 in per page**. The calculator page and equation were checked, and the exact output was independently calculated below. The calculator's interactive Download Template control was not submitted in this session, so use the live calculator to regenerate and compare its template immediately before upload.

## Exact dimensions

- Spine: `116 × 0.002252 = 0.261232 in`
- Full-wrap width: `0.125 + 8.5 + 0.261232 + 8.5 + 0.125 = 17.511232 in`
- Full-wrap height: `11 + 0.125 + 0.125 = 11.25 in`
- Print PDF MediaBox/CropBox: **1260.808704 × 810 pt**

PDF file: `espresso-dial-in-fieldbook-full-wrap-cover.pdf`.

## Panel coordinates, left to right

- Left outside bleed: **0–0.125 in**
- Back-cover trim: **0.125–8.625 in** (8.5 in wide)
- Spine: **8.625–8.886232 in** (0.261232 in wide)
- Front-cover trim: **8.886232–17.386232 in** (8.5 in wide)
- Right outside bleed: **17.386232–17.511232 in**
- Top/bottom bleed: **0.125 in each**

Background fills all bleed areas. The same ground color continues across the spine to avoid an obvious hard fold edge. **Spine text is omitted**: the page count permits spine text, but after KDP's 0.0625-in clearance on both sides the remaining text width is only 0.136232 in, too narrow for this title to read well or tolerate binding shift.

## Barcode reserve and cover safety

The lower-right back-cover area is intentionally blank white at **2 × 1.2 in**, positioned 0.25 in from the back trim's bottom and right edges. No text, art, or rules cross it. This accommodates KDP's automatic barcode if the book is published without an ISBN; no ISBN is printed on the cover. Front/back text has at least 0.125 in trim clearance; the actual design is more generously inset. All visible cover type is at least 7 pt.

## Low-content ISBN implications

Based on the actual book, the recommended KDP designation is **Low-content**: 94 of 116 pages are structured logs, repeatable forms, recipe cards, indexes, settings maps, or note pages intended for user completion; the remaining 20 pages provide guidance/reference material. KDP's examples include log books and it acknowledges exceptions, so its title review is final. Low-content books cannot use a free KDP ISBN; choose an owned ISBN or publish without one. Check the live setup options and barcode treatment after making that choice.

## Official sources

- [KDP Print Cover Calculator and Templates](https://kdp.amazon.com/cover-calculator)
- [Create a Paperback Cover](https://kdp.amazon.com/en_US/help/topic/G201953020) — bleed, formula, spine, safe areas, barcode, and one-page PDF requirements.
- [Trim Size, Bleed, and Margins](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6) — 8.5 × 11 trim range/page-count limits and bleed specifications.
- [Print Options](https://kdp.amazon.com/en_US/help/topic/G201834180) — available ink/paper options.
- [Low-Content Books](https://kdp.amazon.com/en_US/help/topic/GGE5T76TWKA85DJM) — definition, examples, setup selection, and ISBN restrictions.

**File status:** final full-wrap PDF and preview are present. The KDP-generated downloadable template has not been retrieved, and no KDP upload, Previewer, publication, or physical proof was performed.
