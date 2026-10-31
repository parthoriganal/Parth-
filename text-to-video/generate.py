#!/usr/bin/env python3
"""Generate a short video from text with Picsart Text2Video-Zero on CPU.

Uses the upstream diffusion pipeline, cross-frame attention and latent motion
field. No input image, slideshow, zoom, pan, or frame interpolation is used.
The export wrapper writes the generated frames directly because the upstream
demo's make_grid export helper mishandles HWC frames.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import time
from pathlib import Path

PROMPT = (
    "An astronaut walking across the surface of the Moon, side view, legs taking "
    "steps and arms swinging, lunar dust rising from the boots, Earth hanging in "
    "the black sky, cinematic realistic science fiction, smooth tracking shot"
)
NEGATIVE = (
    "still image, static pose, duplicate person, extra limbs, bad anatomy, blurry, "
    "low quality, distorted face, text, subtitles, logo"
)
MODEL = "stable-diffusion-v1-5/stable-diffusion-v1-5"
UPSTREAM_COMMIT = "fd76734e06aadb1dee83d2b7a368b14bdaa35565"
FRAMES = 8
FPS = 4
SIZE = 512
STEPS = 50
SEED = 42


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "output")
    parser.add_argument("--size", type=int, default=512, help="square resolution, divisible by 8")
    args = parser.parse_args()
    size = args.size
    if size % 8 or size < 256:
        raise ValueError("size must be >=256 and divisible by 8")
    upstream = args.upstream.resolve()
    actual_commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=upstream, text=True
    ).strip()
    if actual_commit != UPSTREAM_COMMIT:
        raise RuntimeError(f"Unexpected Text2Video-Zero revision: {actual_commit}")

    # Upstream utils.py eagerly constructs three unrelated ControlNet detectors,
    # one of which requires CUDA. Disable only those unused imports/constructors.
    utils_path = upstream / "utils.py"
    source = utils_path.read_text()
    disabled, kept = [], []
    for line in source.splitlines():
        if line.startswith(("from annotator.", "apply_canny =", "apply_openpose =", "apply_midas =")):
            disabled.append(line)
            kept.append("# CPU text-to-video: unused detector disabled")
        else:
            kept.append(line)
    if len(disabled) != 7:
        raise RuntimeError(f"Expected seven unused detector lines, found {len(disabled)}")
    utils_path.write_text("\n".join(kept) + "\n")

    import sys
    sys.path.insert(0, str(upstream))
    import numpy as np
    import torch
    import diffusers
    import transformers
    import imageio
    from PIL import Image, ImageDraw
    from huggingface_hub import model_info
    from diffusers.schedulers import DDIMScheduler
    from model import Model, ModelType
    import utils as upstream_utils

    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    args.output.mkdir(parents=True, exist_ok=True)
    frames_dir = args.output / "frames"
    frames_dir.mkdir(exist_ok=True)
    raw_path = args.output / "astronaut-moon-raw.mp4"
    output_path = args.output / "astronaut-moon.mp4"

    revision = model_info(MODEL).sha
    print(f"Text2Video-Zero {actual_commit}; weights {MODEL}@{revision}", flush=True)
    print(f"Prompt: {PROMPT}", flush=True)
    print(f"CPU threads={torch.get_num_threads()}; torch={torch.__version__}", flush=True)

    model = Model(device="cpu", dtype=torch.float32)
    model.set_model(ModelType.Text2Video, model_id=MODEL, revision=revision)
    model.pipe.scheduler = DDIMScheduler.from_config(model.pipe.scheduler.config)
    model.pipe.unet.set_attn_processor(model.text2video_attn_proc)
    model.pipe.enable_attention_slicing(1)
    model.pipe.enable_vae_slicing()
    model.generator.manual_seed(SEED)

    added_prompt = "high quality, HD, 8K, high focus, dramatic lighting"
    prompt = PROMPT.rstrip().rstrip(",.") + ", " + added_prompt
    started = time.monotonic()
    # Direct upstream pipeline call: one text-conditioned diffusion batch produces
    # all eight frames. This avoids the demo wrapper's off-by-one chunk export.
    with torch.inference_mode():
        result = model.pipe(
            prompt=[prompt] * FRAMES,
            negative_prompt=[NEGATIVE] * FRAMES,
            video_length=FRAMES,
            frame_ids=list(range(FRAMES)),
            height=size,
            width=size,
            num_inference_steps=STEPS,
            guidance_scale=7.5,
            guidance_stop_step=1.0,
            t0=44,
            t1=47,
            motion_field_strength_x=12,
            motion_field_strength_y=12,
            use_motion_field=True,
            smooth_bg=False,
            generator=model.generator,
            output_type="numpy",
        )
    elapsed = time.monotonic() - started
    frames = result.images
    if isinstance(frames, torch.Tensor):
        frames = frames.detach().cpu().numpy()
    frames = np.asarray(frames)
    if frames.shape != (FRAMES, size, size, 3):
        raise RuntimeError(f"Unexpected generated frame shape: {frames.shape}")
    frames = (np.clip(frames, 0, 1) * 255).round().astype(np.uint8)

    watermark = upstream / "__assets__" / "t2v-z_watermark.png"
    exported = []
    hashes = []
    for i, frame in enumerate(frames):
        if watermark.is_file():
            image = upstream_utils.add_watermark(frame, str(watermark))
        else:
            image = Image.fromarray(frame)
        image.save(frames_dir / f"frame_{i:02d}.png")
        exported.append(np.asarray(image))
        hashes.append(hashlib.sha256(np.asarray(image).tobytes()).hexdigest())
    if len(set(hashes)) != FRAMES:
        raise RuntimeError("Generated frames are not all distinct")
    imageio.mimsave(str(raw_path), exported, fps=FPS, codec="libx264", macro_block_size=1)

    # Container/codec normalization only; no new frames or spatial transforms.
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw_path),
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output_path),
    ], check=True)
    reader = imageio.get_reader(str(output_path))
    frame_count = reader.count_frames()
    metadata = reader.get_meta_data()
    reader.close()
    if frame_count != FRAMES:
        raise RuntimeError(f"Expected {FRAMES} generated frames, got {frame_count}")

    differences = [
        float(np.abs(exported[i].astype(np.float32) - exported[i - 1].astype(np.float32)).mean())
        for i in range(1, FRAMES)
    ]
    sheet = Image.new("RGB", (size * 4, (size + 32) * 2), (12, 18, 28))
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(exported):
        x, y = (i % 4) * size, (i // 4) * (size + 32)
        sheet.paste(Image.fromarray(frame), (x, y))
        draw.text((x + 10, y + size + 8), f"Generated frame {i + 1}/{FRAMES}", fill="white")
    sheet.save(args.output / "contact-sheet.jpg", quality=92)

    manifest = {
        "generator": "Picsart-AI-Research/Text2Video-Zero",
        "generator_url": "https://github.com/Picsart-AI-Research/Text2Video-Zero",
        "generator_commit": actual_commit,
        "model": MODEL,
        "model_revision": revision,
        "prompt": PROMPT,
        "negative_prompt": NEGATIVE,
        "method": "text-conditioned diffusion with cross-frame attention and latent motion field",
        "input_image": None,
        "frame_interpolation": False,
        "zoom_or_pan": False,
        "generated_frames": frame_count,
        "resolution": [size, size],
        "fps": FPS,
        "duration_seconds": frame_count / FPS,
        "inference_steps": STEPS,
        "seed": SEED,
        "device": "CPU",
        "generation_seconds": round(elapsed, 2),
        "python": platform.python_version(),
        "torch": torch.__version__,
        "diffusers": diffusers.__version__,
        "transformers": transformers.__version__,
        "cpu_compatibility_patch": disabled,
        "export_note": "Generated HWC frames written directly; upstream make_grid helper bypassed",
        "postprocessing": "H.264 transcode and fast-start only; frame content unchanged",
        "frame_sha256": hashes,
        "mean_absolute_frame_differences_0_255": differences,
        "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "bytes": output_path.stat().st_size,
        "source_metadata": metadata,
    }
    (args.output / "generation.json").write_text(json.dumps(manifest, indent=2, default=str) + "\n")
    (args.output / "prompt.txt").write_text(PROMPT + "\n")
    print(f"DONE: {output_path} ({manifest['bytes']} bytes, {elapsed:.1f}s)", flush=True)


if __name__ == "__main__":
    main()
