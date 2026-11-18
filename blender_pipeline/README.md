# Blender CPU render pipeline

**Build → scene QA → parallel Cycles frame batches → image QA → FFmpeg → full video decode check.** The sample is [Lantern Tide](../lantern-tide/), an editable lighthouse diorama with a looping camera orbit. No desktop Blender, GPU, API key, third-party add-on, or render-farm service is required. See the [compatibility audit](../docs/BLENDER_COMPATIBILITY.md) and [agent runbook](AGENT_PLAYBOOK.md).

## Run on GitHub

The [workflow](../.github/workflows/render-lantern-tide.yml) runs **`ci`** on pushes touching pipeline code. Once registered on the default branch, **Actions → Render Lantern Tide (Blender CPU) → Run workflow** also offers:

| Profile | Resolution | Frames / rate | Max samples | Batches |
|---|---:|---:|---:|---:|
| `ci` | 544 × 408 | 12 @ 8 fps | 12 | 3 × 4 |
| `preview` | 768 × 576 | 36 @ 12 fps | 16 | 6 × 6 |
| `quality` | 1152 × 864 | 72 @ 24 fps | 32 | 9 × 8 |

The workers share one checksummed `.blend` artifact; they don't regenerate it independently. Up to four standard Linux CPU jobs run concurrently, subject to GitHub availability and quota. Try `ci` before choosing a larger profile or adapting the pipeline to another project.

**Download `lantern-tide` from the successful run** (30 days): editable `lantern-tide.blend`, `lantern-tide.mp4`, `poster.png`, `contact-sheet.jpg`, `project.json`, and the scene/render QA and encode log. `blender-scene` and `blender-frames-*` contain inputs and intermediate checkpoints/logs for 7 days. This workflow does not deploy Pages or publish releases.

## Run locally

Use **Linux x86_64, Python 3.11**, and the system shared libraries listed in the [CPU setup action](../.github/actions/setup-blender-cpu/action.yml). The image and encode stage deliberately has its own smaller lock and does not import Blender.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --only-binary=:all: --require-hashes \
  -r blender_pipeline/requirements-build.lock -r blender_pipeline/requirements-media.lock
python -m unittest discover -s blender_pipeline/tests -v

python -m blender_pipeline build --profile ci
python -m blender_pipeline matrix
python -m blender_pipeline render --shard 00
python -m blender_pipeline render --shard 01
python -m blender_pipeline render --shard 02
python -m blender_pipeline assemble
```

The default output tree is `out/blender-cpu/{bundle,frames,final}/` (ignored by Git). Use `--bundle`, `--frames-root`, and `--output` for separate working directories. For local parallel processes, give each process its own shard and use `--threads` to share cores. Never run two workers on the same shard directory simultaneously.

### Recovery and QA

- **Do not rebuild the scene to resume a run.** Keep the bundle and shard folders, and rerun `render --shard NN`. Each PNG is decoded and hashed before it is atomically published; a receipt associates its checksum with the exact scene/build and frame range. Missing, changed, stale, or unreadable frames are replaced; intact frames are not rerendered. A caught frame failure retries once with a freshly loaded scene by default. A killed process is recovered by starting the shard again, not by retrying inside a dead process.
- **On GitHub, use Re-run failed jobs** on the same run while the 7-day checkpoints exist. The render job attempts to restore its previous artifact and uploads valid progress even when the worker exits with an error. A cancelled job or hard timeout may lose frames it never uploaded. A fresh workflow run or rebuilt bundle is not a cross-run resume mechanism.
- **Scene QA is sample-specific.** It reopens the `.blend` without auto-running scripts, checks the camera orbit and loop, UV bounds and collapsed UV faces, the tower's watertightness and winding, evaluated cliff subdivision, actual Geometry Nodes instances, and asset portability. It is not a general topology, UV-overlap, lighting, or aesthetic certification for every object.
- **Image/video QA checks every frame** for a matching receipt hash, full RGB PNG decode, resolution, and near-blank pixels. It checks orbit motion at two points, builds a visual contact sheet, and decodes every MP4 frame to verify count, size and rate. Inspect the contact sheet or poster for artistic issues the heuristics can't detect.
- **Diagnostics:** `scene-qa.json`, `build.log`, per-shard `events.jsonl` (attempts, frame time, peak RSS), worker stdout/stderr, `render-qa.json` and `encode.log`. The assembler fails if any expected shard or frame is missing; it will not silently encode a shorter clip.

The wheel hashes, exact versioned Actions, fixed seeds, render profile, build hash, source digests and `.blend` checksum make the build traceable and repeatable. The OS image, system libraries, CPU and denoising implementation can affect exact pixels; cross-host byte-identical renders are **not** promised.
