# Meridian render verification

**2026-11-18 · CPU only.** These checks used actual Cycles, Cairo, Chromium, or decoded video outputs. See the [framework guide](README.md) for commands.

## Finished 1080p reel

[Run 44245101395](https://github.com/parthoriganal/Parth-/actions/runs/44245101395) succeeded at `bc2d4bd` in about 13 minutes 41 seconds on `ubuntu-24.04`. The ten Cycles batches yielded 132 verified 1152×648 plates; Manim yielded 48 native 1920×1080 plates. Remotion composited those plates and the title graphics, and FFmpeg decoded all **216 frames** at **24 fps** and **1920×1080**. The export step also verified the five post-AAC audio cues and round-tripped the five closed captions. [Download `meridian-production`](https://github.com/parthoriganal/Parth-/actions/runs/44245101395/artifacts/14401578320) (6.94 MiB; expires 2026-12-18).

The hosted checks ran against the actual export. The GitHub artifact CDN was not reachable from the Arena sandbox, so the full master was not downloaded or visually reviewed there. The local visuals below were inspected separately.

## Additional render checks

| Feature | Evidence |
|---|---|
| Procedural models | Rendered the luminaire, vaulted pavilion, and coastal headland at 640×360 in Cycles. Rendered an additional configuration for each: copper-red body with 20 knurls per band, two-bay mineral-tint pavilion, and a receded shoreline with seed 87. [Default and variant renders](template-variants.jpg). |
| Shot design and camera motion | Rendered the full **66-plate draft 3D sequence** and inspected representative shots. First-to-last sampled luma delta: 13.75 / 25.86 / 10.79 for product / shelter / terrain. The separately rendered 1152×648 master proofs use the 12-sample profile, and Remotion rendered the [1080p product still](meridian.jpg). |
| Editable rig | Reopened the saved shelter and evaluated its 13-bone FK walk. Master audit: 1,470 deformed skin vertices and 2.05 scene units of root travel. The guide appears walking in the actual shelter sequence. No interactive rig tools or motion capture were required. |
| Memory and recovery | Nine local draft batches rendered 66 plates in 287 seconds of cumulative worker time at two threads, with at most 598.5 MiB process RSS. Corrupted one real frame by truncating it to 60 bytes. `terrain-02` detected the checksum mismatch, regenerated only frame 21, and reused the four intact frames with their original timestamps and checksums. Hosted same-run retry restoration is designed but not verified. |
| Cairo motion graphics | The [hosted Manim job](https://github.com/parthoriganal/Parth-/actions/runs/44245101395/job/134602562383) rendered the optical study and decoded **48 frames at 1920×1080**; it passed a motion check before uploading `meridian-optics`. Cairo ran in its own Python environment with real Pango, not the Blender/X shim. |
| Editorial animation | Decoded and inspected wipes, dips, title reveal, time rail, and signature in a separate **4-second four-shot** local edit. Both Remotion/Chromium and Pillow/FFmpeg encoded and verified all 48 frames at 768×432/12 fps. The local edit excludes optics; it is not the full `draft` render. |
| Audio and captions | Both local encodes decoded as stereo AAC at 48 kHz, with chimes detected at all four edit points after AAC priming/padding. All four English closed captions round-tripped from `mov_text` with their original text and timestamps. These are authored descriptive music captions, not speech recognition. |
| Regression | Five Lantern Tide fixtures and three Meridian fixtures passed. Reassembled Lantern Tide from its verified 12 plates and matched the original MP4 byte-for-byte. The upgrade did not modify its source or workflow. |

The local rehearsal, decoded motion proof, and master `.blend` kit are in `production/demo-assets/` in the Arena workspace. The kit contains frozen scene hashes and the master still QA; the hosted film runs from its own matching source bundle. Source code, the master jacket image, and the rendered variant sheet are tracked; generated movies, ZIPs, and frame caches are not.
