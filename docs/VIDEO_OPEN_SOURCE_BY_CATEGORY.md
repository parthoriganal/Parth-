# Best Open Source Repos, Code Libraries & Skills for Making Videos — by Style / Category

**Purpose:** A filtered, category-organized table of the best open-source GitHub repositories, code libraries, and skills for video creation — covering motion graphics, 3D animation, 2D animation, 2.5D animation, cinematic rendering, web/code animation, and AI "skills" (MCP agents).  
**Research date:** 2026-11-05. Star counts are approximate snapshots ("~"). Verify `pushed_at`, release cadence, and open issues before depending on any repo.

---

## How to read the verdicts

| Verdict | Meaning |
|---|---|
| ✅ **Recommended** | Actively maintained, permissive license (MIT/Apache-2.0/GPL for personal use), runnable, real GitHub repo with source code. |
| ⚠️ **Conditional** | Good but check the license (e.g., AGPL copyleft) or maturity (alpha/beta) before commercial use. |
| ❌ **Avoid** | Abandoned, no source code, paid-only ".exe", unclear license, or unverified marketing claims. |

---

## Master table — best open source tool for each video category

| # | Category | Best open source repo / library | Repo (GitHub) | License | Stars (~*) | Best for | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Motion graphics** | EffectCraft | storytold/effectcraft | MIT or Apache-2.0 | ~2–5k | After Effects alternative: compositions, layers, keyframes, 306 effects, expressions, render queue, Lottie import/export, H.264/ProRes/AV1 export | ✅ Recommended |
| 2 | **Motion graphics (web)** | mo-js (mojs) | mojs/mojs | MIT | ~18k | Web motion graphics: HTML/SVG shape, swirl, burst, stagger animations; declarative API | ✅ Recommended |
| 3 | **Motion graphics (desktop)** | Premation | isroil01/premation | AGPL-3.0 | ~1–3k | After Effects alternative with graph editor, 2.5D cameras, rigging, native GPU engine; opens .aep | ⚠️ AGPL copyleft |
| 4 | **3D animation & rendering** | Blender | blender/blender | GPL-2.0+ | ~40–50k | Full 3D pipeline: modeling, rigging, animation, simulation, rendering, compositing, video editing; Cycles + EEVEE | ✅ Recommended |
| 5 | **3D animation (modeling)** | Dust3D | Dust3D/Dust3D | MIT | ~8–10k | Fast watertight 3D modeling for characters, game assets, 3D printing | ✅ Recommended |
| 6 | **3D animation (engine)** | Armory 3D | armory3d/armory | Zlib | ~2–4k | Open-source 3D game engine with full Blender integration | ✅ Recommended |
| 7 | **Cinematic / path-traced rendering** | LuxCoreRender | LuxCoreRender/LuxCore | Apache-2.0 | ~3–5k | Physically based path tracing: caustics, dispersion, volumetric rendering, GPU (OpenCL/CUDA) | ✅ Recommended |
| 8 | **Cinematic / path-traced rendering** | OSPRay (RenderKit) | ospray/ospray | Apache-2.0 | ~2–4k | Scalable, portable ray-tracing engine for high-fidelity visualization | ✅ Recommended |
| 9 | **Cinematic / real-time path tracing** | ZetaRay | alipbcs/ZetaRay | MIT | ~300–500 | Real-time Direct3D 12 path tracer with ReSTIR GI, FSR2, hardware ray tracing (RTX/RX 6000+) | ✅ Recommended |
| 10 | **2D animation (frame-by-frame)** | Krita | Krita/krita | GPL-3.0 | ~10–15k | Digital painting + frame-by-frame 2D animation, brush engine, onion skinning | ✅ Recommended |
| 11 | **2D animation (traditional pipeline)** | OpenToonz | opentoonz/opentoonz | BSD-style | ~8–10k | Production-grade traditional 2D (used at Studio Ghibli), exposure sheet, node compositing; free for commercial use | ✅ Recommended |
| 12 | **2D animation (vector tweening)** | Synfig Studio | Synfig/Synfig | GPL-3.0 | ~4–6k | Bone-based rigging, automatic in-betweening, vector cut-out animation | ✅ Recommended |
| 13 | **2D animation (beginner)** | Pencil2D | pencil2d/pencil | GPL-2.0+ | ~8–10k | Simple hand-drawn frame-by-frame 2D animation, bitmap + vector | ✅ Recommended |
| 14 | **2.5D animation** | Premation | isroil01/premation | AGPL-3.0 | ~1–3k | 2.5D cameras, graph editor, After Effects-like timeline; .motion files | ⚠️ AGPL copyleft |
| 15 | **2.5D / 3D web** | three.js | mrdoob/three.js | MIT | ~90–100k | WebGL 3D library for the browser; scenes, cameras, lights, animation | ✅ Recommended |
| 16 | **Web animation (code)** | Anime.js | juliangarnier/anime | MIT | ~45–50k | Lightweight JS animation engine for CSS, SVG, DOM, JS objects | ✅ Recommended |
| 17 | **Web animation (timeline)** | Scene.js | daybrush/scenejs | MIT | ~2–4k | JavaScript & CSS timeline-based animation library | ✅ Recommended |
| 18 | **Web animation (tweening)** | TweenJS / Between.js | CreateJS/TweenJS / sasha240100/between.js | MIT | ~5–10k | Lightweight tweening/animation engines | ✅ Recommended |
| 19 | **AI agent skills (MCP)** | ZensInk | ZensInk/zens-ink-seo-package | MIT | ~50–70 | Zero-dep Python CLI toolkit; ships MCP stdio server (`python3 -m zens_ink.mcp`) and agent skill (`npx skills add ...`) | ✅ Recommended |
| 20 | **Prompt skills** | nexscope-ai/amazon-skills | nexscope-ai/amazon-skills | Unstated | ~1–3k | 48 `SKILL.md` prompt definitions (keyword research, niche finder, competitor analysis) — reference only, not executable standalone | ⚠️ Reference only |

*\*Star counts are approximate snapshots; verify on GitHub before depending on a repo.*

---

## Quick recommendations by goal

| If you want to… | Use this |
|---|---|
| Make a full animated short film (3D) | **Blender** (Cycles/EEVEE) + **LuxCoreRender** for cinematic path-traced frames |
| Make motion graphics / titles / VFX | **EffectCraft** (desktop) or **Premation** (2.5D, graph editor) |
| Make 2D cartoons frame-by-frame | **Krita** (drawing + animation) or **OpenToonz** (traditional pipeline) |
| Make 2D vector cut-out / rigged animation | **Synfig Studio** (bone rig + auto tweening) |
| Make simple hand-drawn 2D (beginner) | **Pencil2D** |
| Make web / UI motion graphics | **mo-js** or **Anime.js** or **three.js** (3D web) |
| Make cinematic photorealistic renders | **LuxCoreRender**, **OSPRay**, or **ZetaRay** (real-time path tracing) |
| Add AI agent skills to your pipeline | **ZensInk** (MCP server + agent skill, MIT, zero-dep Python) |

---

## What to avoid

| Repo / tool | Why avoid |
|---|---|
| Paid ".exe" scrapers / video tools with no source (e.g., yasinsayal, KaziArman) | Not actually open source; requires paid license; no code to integrate |
| Abandoned repos (no commits/releases in 1–2+ years) | Unmaintained, bugs/security issues won't be fixed |
| AGPL tools (Premation, some Blender alternatives) if building closed-source SaaS | Copyleft may require you to open-source your derivative work — legal review needed |
| Prompt-skill repos with no runnable harness / MCP server | Not executable; reference only |

---

## Bottom line

- **Best all-rounder:** Blender (3D + 2D Grease Pencil + video editing + rendering)  
- **Best motion graphics desktop alternative:** EffectCraft (MIT/Apache-2.0)  
- **Best 2.5D / graph-editor motion tool:** Premation (⚠️ AGPL-3.0)  
- **Best cinematic path-traced rendering:** LuxCoreRender or OSPRay  
- **Best web animation code libraries:** mo-js, Anime.js, three.js  
- **Best "skills" (MCP/agent):** ZensInk (MIT, zero-dependency Python)

The narration audio for this video is saved as `video_narration.mp3` in this repo. Frame images and an animated GIF preview are generated alongside this document so you can assemble the final MP4 (ffmpeg is not installed in this sandbox, so final MP4 muxing with audio must be done on your machine).
