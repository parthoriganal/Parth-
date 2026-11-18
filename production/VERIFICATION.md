# Meridian render verification

**2026-11-18 · CPU only.** These checks used actual Cycles, Cairo, Chromium, or decoded video outputs. See the [framework guide](README.md) for commands.

## Finished 1080p reel

[Run 44245101395](https://github.com/parthoriganal/Parth-/actions/runs/44245101395) succeeded at `bc2d4bd` in about 13 minutes 41 seconds on `ubuntu-24.04`. The ten Cycles batches yielded 132 verified 1152×648 plates; Manim yielded 48 native 1920×1080 plates. Remotion composited those plates and the title graphics, and FFmpeg decoded all **216 frames** at **24 fps** and **1920×1080**. The export step also verified the five post-AAC audio cues and round-tripped the five closed captions. [Download `meridian-production`](https://github.com/parthoriganal/Parth-/actions/runs/44245101395/artifacts/14401578320) (6.94 MiB; expires 2026-12-18).

The hosted checks ran against the actual export. The GitHub artifact CDN was not reachable from the Arena sandbox, so the full master was not downloaded or visually reviewed there. The local visuals below were inspected separately.

### Full open-source master

[Run 44248744686](https://github.com/parthoriganal/Parth-/actions/runs/44248744686) restored the original checked Cycles and Cairo plates on `ubuntu-24.04`. It built the complete Pillow/FFmpeg edit without Node, Chromium, Remotion, or a paid plug-in. The job verified all 180 input plates, the **216-frame** 1080p video, stereo cues at all five edit points, and five embedded captions. It checked all three `.blend` files against the original manifest, tested the source ZIP, and confirmed that the published MP4 matches the SHA-256 of the QA-checked file.

[Public MP4](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/meridian.mp4) · [Public source kit](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/meridian-editable.zip) · [Decoded contact sheet](https://github.com/parthoriganal/Parth-/releases/download/meridian-m01-open-v1/contact-sheet.jpg). This was a full recomposition, not a second Cycles master render.

### Fresh full draft on the active branch

[Run 44248626544](https://github.com/parthoriganal/Parth-/actions/runs/44248626544) built a new `draft` bundle at `195d272` and rendered its 66 Cycles and 24 Manim plates on standard CPU runners. It composited and decoded the complete nine-second edit at **768×432, 12 fps (108 frames)**, including five timing-checked audio cues and five round-tripped captions. The Node and Remotion steps were skipped. [Draft artifact](https://github.com/parthoriganal/Parth-/actions/runs/44248626544/artifacts/14402583470).

### JSON-configured templates on real plates

The [Copper Field project](examples/copper-field.json) was authored using `build --project` with no edits to the geometry code. After reopening the `.blend` files, the scene audit found 40 knurls across two bands, two vault bays, and 520 terrain vertices across ten rings (nine layers). All **66 Cycles frames** rendered, and both Pillow/FFmpeg and Remotion/Chromium produced a 5.5-second video that decoded with its three audio cues and captions. [Copper Field contact sheet](copper-field.jpg) shows decoded frames from the Pillow/FFmpeg edit. A separately rendered four-bay pavilion verified the extended plinth.

On a copy of the Copper Field checkpoint, truncating frame 21 again caused just that frame to be rebuilt. The other four PNGs kept their timestamps and hashes. A real exported signature shot from the four-shot rehearsal also confirmed the new Pillow push-in; an image-only crop had a 9.63 mean luma delta after the entrance transition.

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
| Regression | Five Lantern Tide fixtures and five Meridian fixtures passed. Reassembled Lantern Tide from its verified 12 plates and matched the original MP4 byte-for-byte. The upgrade did not modify its source or workflow. |

The local rehearsal, decoded motion proof, and master `.blend` kit are in `production/demo-assets/` in the Arena workspace. The kit contains frozen scene hashes and the master still QA; the hosted film runs from its own matching source bundle. Source code, the master jacket image, and the rendered variant sheet are tracked; generated movies, ZIPs, and frame caches are not.
