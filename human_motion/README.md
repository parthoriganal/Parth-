# A Passing Hello

Arun walks across a quiet sandstone courtyard, notices someone and offers a small greeting. One continuous outdoor take, **360 individual renders at 24 fps**. This deliberately has no dialogue or lip-sync. A little original stereo courtyard tone and six timed shoe cues accompany the film.

| Time | Frames | Direction |
|---|---|---|
| 0–3 s | 1–72 | Relaxed stance, quiet breath, brief blinks; full-body establishing view |
| 3–6 s | 73–144 | Lateral weight transfer, alternating heel-to-toe steps and opposing arm swing; dolly into medium framing |
| 6–9 s | 145–216 | Plant, turn gaze before head, and look across the courtyard in close-up |
| 9–12 s | 217–288 | Reframe for the right palm, two small wrist accents and a slight smile |
| 12–15 s | 289–360 | Lower the arm, release the expression, breathe and settle |

**Verified downloads:** [MP4 + editable Blender + Python + contact sheet + QA](https://github.com/parthoriganal/Parth-/actions/runs/44266306549/artifacts/14411440460) · [All 360 native PNGs](https://github.com/parthoriganal/Parth-/actions/runs/44266306549/artifacts/14410832132) · [Verification and measured render time](VERIFICATION.md). GitHub Actions keeps these archives through December 18, 2026.

## Open and edit

Open `a-passing-hello.blend` in Blender **5.0.1**, and read **START HERE** in the Text Editor. The scene is self-contained, with the eye/skin image inputs and the wayfinding font packed. It requires no add-ons, plug-ins, external geometry libraries, or automatic scripts to play the timeline. The named timeline markers use times starting at frame 1 = 0.000 s.

- **Arun | animation controls** in Pose Mode: native root, clavicle, shoulder, torso, neck/head and FK arm controls. Toggle the Finger and Face bone collections to reveal the smaller joints. The stance/swing controls are the separate **shoe roll + plant** and **knee direction** empties; the neck and eyes are decoupled with an editable binocular look point. Foot IK is non-stretching and the sole was matched to the actual shoe geometry. Shapes on the skin mesh expose independent **Blink.L/R**, **Brow.L/R**, and **Smile**.
- For clean poses in the editor, start in camera view; enable **Viewport Overlays → Bones** (and **Extras** for empties) to see the controls. Render settings, light sources, focus target/lens, materials, hair fibers, garments, and courtyard geometry remain editable. Curves are sampled on the 24 fps clock and authored into native Actions; the generator is also available for broad changes.
- This is a CG performance using anatomical topology, articulated fingers, woven garments, skin scattering, dual-quaternion weighting, a groom and calibrated eyes. There is no motion capture import, speech, collision/cloth simulation, or post-processed interpolation of missing video frames.

## Headless rebuild and review

Use the repository's existing locked CPU environment. The standalone headless build takes the same `requirements-build.lock` as Meridian. Inside this repository the local `singularity-bloom/setup_bpy_headless.sh` supplies the required X11 compatibility libraries if the matching system libraries are missing. On GitHub Actions the bundled `setup-blender-cpu` action installs the system packages and locked wheels. With the environment active:

```sh
python -m human_motion build
python -m human_motion matrix
python -m human_motion samples 1 92 190 194 242 329
python -m human_motion render --shard 00 --threads 4 # repeat for 00…19, or omit --shard
python -m pip install --only-binary=:all: --require-hashes -r meridian_m02/requirements-media.lock
python -m human_motion deliver
```

`--root` before the verb selects a different output root (default `out/a-passing-hello`). `samples` is a separate review path and cannot satisfy a master receipt. Each render batch checks the loaded `.blend` hash and Blender build, repairs only absent/bad-checksum/undecodable frames, and logs actual elapsed time. The grading/render intent is 12 samples max + CPU open denoising at **1152×648 native**. The edition uses a Lanczos spatial upscale to **1920×1080**, not a native 1080p render. There are no synthesized frames. Execution time is taken from the worker logs, not predicted from sample renders. The separate export reports finalization time and how wall span differs from the sum across concurrent jobs.

**Deliverables:** MP4, `.blend`, source ZIP (packed scene, rebuild Python, locks, notices, WAV), 360 native PNGs in a separate ZIP with per-frame hashes, decoded contact sheet, and pose/media QA. `deliver` refuses to run until all 360 frames are present and valid, decodes the entire final MP4 to check size, PTS, frame rate/count, and checks the decoded audio clock and adjacent image deltas.

## Credits and source terms

Original character likeness (Arun), proportions and sculpt mix, groom, layered materials, tailored surfaces, architecture, lighting, camera, animation, and synthetic foley authored for this film. Anatomical basis and eye proxy/iris use a content-addressed subset of [MakeHuman graphical data](https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data); regional texture masks use [MPFB2 graphical data](https://github.com/makehumancommunity/mpfb2/tree/9de0707fdc88438d7c53a1a2ac7937d9221e2431/src/mpfb/data/textures). Both subsets are CC0 1.0 as documented by their pinned asset notices; no AGPL/GPL application code or plug-in is bundled from either project. `assets/sources.json` identifies the exact source paths, revisions and SHA-256s; the notices are in `assets/human-base-cc0.zip`. The packed wayfinding/review fonts (Instrument Serif and JetBrains Mono) are under OFL, notices included. The shared Python worker, media checks and scene primitives come from the existing repository.
