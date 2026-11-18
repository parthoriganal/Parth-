# Meridian M/01 — CPU production framework

![Rendered product chapter: cream editorial type and an illuminated petrol-and-brass lantern](meridian.jpg)

**Meridian** is a nine-second field-light design reel: a product reveal, an architectural shelter with a walking guide, a coastal environment, an animated optics section, and a signature card. One [edit decision list](meridian.json) drives the picture cuts, animation durations, stereo score, and closed captions. All plates and graphics are produced without GPU acceleration. See [render verification](VERIFICATION.md) and the [rendered template variants](template-variants.jpg).

**[Download the 1080p film (MP4)](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/meridian.mp4)** · **[Download the editable source kit (ZIP)](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/meridian-editable.zip)** · [Final contact sheet](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/contact-sheet.jpg)

These are public GitHub Release assets. The nine-second **1920×1080, 24 fps** edit was [composited and checked with Pillow/FFmpeg](https://github.com/parthoriganal/Parth-/actions/runs/44248744686), reusing the verified Cycles and Manim master plates. The source kit includes the three matching Blender files, the score, captions, Manim plate and QA. The [original Remotion MP4](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-v1/meridian.mp4) is still available separately.

## Reuse the pieces

| Layer | Entry point | What remains editable |
|---|---|---|
| Product modeling | [`LampSpec` / `luminaire()`](sets.py) | Turned body and lens profiles, knurl count, material and output recipes, modular badge and handle |
| Architecture | [`PavilionSpec` / `portal()` / `pavilion()`](sets.py) | Vault bay spacing/span, piers, cove lights and surface assignments |
| Environment | [`LandSpec` / `terrain()`](sets.py) | Seeded stratification, scree, sea plate and contour geometry |
| Cinematography | [`studio.py`](studio.py) | Authored position/aim/focal keys, product focus pull setup, shaped area lights, the sweep and PBR material recipes |
| Character | [`field_guide()` / `fk_walk()`](character.py) | Separate 13-bone armature, vertex groups, armature modifier and action keys. This is an FK mannequin walk, not mocap, IK, or foot-locking |
| 2D graphics | [`manim_stage.py`](manim_stage.py) | Cairo vector paths, ray reveals, moving traces and grid. The diagram is illustrative, not a photometric measurement |
| Motion graphics | [`motion/index.jsx`](motion/index.jsx) | Typography, lower-third label, time rail, rise/reveal/push presets, alternating wipe and dip, signature card |
| Editorial sound | [`audio.py`](audio.py) | Original stereo synth score; hit cues and authored non-dialogue captions derived from frame time, not speech recognition |

To make another edit, copy `meridian.json` or [`examples/copper-field.json`](examples/copper-field.json) and pass `build --project your-edit.json`. Shot IDs are unique; `ticks` use the declared clock (24 here), must align with the selected fps, and are independent of Blender's one-based local shot frames. An `endcard` holds the last plate of a preceding Blender shot.

### Customize a 3D shot in JSON

Add a `model` object to a `product`, `pavilion`, or `landscape` shot. Omitted fields keep the template defaults. The build validates the options and records their resolved values in the bundle and in the reopened scene audit. For example, on a `product` shot:

```json
"model": {"chassis": "#763c34", "rib_count": 20, "body_radius": 0.57, "output": 2.9}
```

| Template | Editable model options |
|---|---|
| `product` | `scale`, `body_radius`, `rib_count`, `chassis` (six hex digits), `output` |
| `pavilion` | `bays`, `span`, `bay_spacing`, `stone` (six hex digits) |
| `landscape` | `layers`, `radius`, `seed` |

[`models.py`](models.py) defines the bounds for the authored staging and camera paths. These are not limits on the Python geometry factories or on the saved Blender files. Review composition and character clearance if you change the staging. The Copper Field example sets a red chassis with 20 knurls per band, a two-bay mineral-tint shelter, and a nine-layer coast from a different seed.

```bash
.venv/bin/python -m production --root out/copper-field build \
  --preset draft --project production/examples/copper-field.json
```

Use that same `--root` for later stages. Copper Field is a three-shot model study; the complete Meridian edit adds optics and the signature. [See the rendered Copper Field frames](copper-field.jpg).

## Presets and outputs

| Preset | Composited output | Native Cycles plates | Samples | Meridian frames / max batch |
|---|---:|---:|---:|---:|
| `draft` | 768 × 432 @ 12 fps | 640 × 360 | 6 | 108 / 8 |
| `master` | 1920 × 1080 @ 24 fps | 1152 × 648 | 12 | 216 / 14 |

The `master` typography and Cairo plates render at **native 1080p**; its 3D plates are composited up to 1080p. Native 1080p Cycles plates are **not** claimed. The preset uses OIDN, adaptive sampling, bounded bounces, packed fonts, modest mesh budgets, 768-pixel Cycles tiles, a cap of four Cycles threads per worker, and two Chromium composition workers. The workflow partitions plates by **shot and frame range**, with six batches allowed in flight, and does not retain per-frame scene data in Blender. GitHub's availability and billing policies still apply.

[Render Meridian (CPU production)](../.github/workflows/render-meridian.yml) creates `meridian-production`: `meridian.mp4` (H.264/AAC and toggleable English subtitles), `meridian.srt`, the source score WAV, decoded poster/contact sheet, Manim source plate, three portable `.blend` shots, and QA/manifest files. Relevant pushes run the full nine-second `draft` preset with Pillow/FFmpeg. A manually dispatched build defaults to `master` (1080p) and Pillow/FFmpeg, once registered on the default branch. The full artifact is retained for 30 days; the large intermediate PNG artifacts expire after 7. No automatic release, Pages deployment, or binary commit is needed.

## Run the stages on Linux

From the repo root, use Python 3.11 x86_64 and the Blender system libraries in the [CPU setup action](../.github/actions/setup-blender-cpu/action.yml). Install the locked Blender and media wheels into one environment:

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install --only-binary=:all: --require-hashes \
  -r blender_pipeline/requirements-build.lock -r blender_pipeline/requirements-media.lock
.venv/bin/python -m production build --preset draft
.venv/bin/python -m production matrix
# Render every planned batch sequentially; distinct IDs may also run on separate workers.
set -o pipefail
.venv/bin/python -m production matrix | .venv/bin/python -c \
  'import json,sys; print("\n".join(b["id"] for b in json.load(sys.stdin)["include"]))' | \
  while IFS= read -r batch; do
    .venv/bin/python -m production render --shard "$batch" --threads 2 || exit
  done
```

Keep `out/meridian/bundle` unchanged when resuming: rerun the same shard to skip verified PNGs and regenerate only missing/corrupt frames. Writes are atomic, bound to the scene/render manifest and recorded in a SHA-256 receipt. A normal render error retries with a freshly loaded scene. A cancelled or timed-out hosted job can lose frames not uploaded yet; same-run artifact restoration is best-effort. To render a different project or profile without replacing the current bundle, pass `--root out/new-edit` **before** the stage name.

The optical plate requires Cairo/Pango development libraries (`pkg-config`, `libcairo2-dev`, `libpango1.0-dev`, `fonts-dejavu-core` on Ubuntu). Use a **separate** environment because Manim requires NumPy 2 and the `bpy` wheel requires NumPy 1.26:

```bash
python3.11 -m venv .venv/manim
.venv/manim/bin/python -m pip install --only-binary=:all: --require-hashes \
  -r blender_pipeline/requirements-media.lock
.venv/manim/bin/python -m pip install -r production/requirements-manim.txt
.venv/manim/bin/python -m production manim
.venv/bin/python -m production stage
```

The normal composition path is **Pillow/FFmpeg**. It needs neither Node, Chromium nor a Remotion license. For the optional Remotion edit, use Node 22 and installed Chrome/Chromium. The verified Remotion build uses Chromium in CPU mode and local OFL fonts from the repository. Remotion 4's [Free License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) covers individuals, for-profit organizations with up to three employees, nonprofits, and noncommercial evaluation; **it is not an unconditional open-source license**. The Remotion demo uses the free evaluation path. Use that engine only if you are eligible.

```bash
# Open-source default:
.venv/bin/python -m production compose
.venv/bin/python -m production export
```

To opt in to Remotion, replace `compose` with the commands below (or select `compositor: remotion` in a manual workflow run), then run `export` as usual.

```bash
npm ci --prefix production/motion --no-audit --no-fund --ignore-scripts
CHROME_PATH=/usr/bin/google-chrome node production/motion/render.mjs out/meridian
```

The open compositor renders its own typography, title rise, wipes/dips, signature push-in and time rail. Both engines share the same editorial and audio timing. Export fully decodes the MP4, checks dimensions/FPS/frame count and stereo duration, verifies an audible cue at every cut after AAC decoding, round-trips all SRT cues, and makes a contact sheet from decoded frames. It does not promise pixel-identical rendering across CPUs.
