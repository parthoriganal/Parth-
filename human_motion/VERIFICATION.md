# A Passing Hello — verification

The film is an authored CG performance, not a photographic likeness or a motion-capture clip. The scene is one camera take with a full-body opening, a medium walking passage, a face close-up, an open-palm greeting and a final settle. There is no speech, cloth simulation, or frame interpolation.

## Reopened scene

Blender 5.0.1 headless (`a3db93c5b259`), Cycles CPU, 12 samples max, OIDN, 1152×648 native. The packed file was opened with auto-run disabled before the following checks. It was also rebuilt and audited from an extracted source archive without a repository on the import path.

| Check | Observed locally on the frozen performance |
|---|---|
| Timeline | All 360 frames evaluated; 24 fps; 155 armature bones, 30 finger joints, 5 expression shapes plus linked lash shape animation |
| Mesh deformation | 7,954 face/neck/hands, 1,396 overshirt and 1,022 trouser base vertices; every vertex in those surfaces normalized to the rig. 17 poses evaluated with the armature/face shapes active. Small-lid folds are scored separately from cloth/hands. |
| Walk | 2.465 m total root travel. Six swing arcs with 94–122 mm apex sole height; no stretched IK. Max ankle-to-target error 0.045 mm. |
| Contact | Evaluated lowest ring on each modeled shoe: grounded clearance 2.170–2.201 mm; flat XY drift ≤0.005 mm; rolling support drift ≤0.186 mm. These are geometry measurements on a level path, not an inference from optical flow. |
| Flexion | Knee bend up to 70.53°, leading elbow up to 109.55°, greeting wrist rises 0.64 m from rest and returns to within 5.5 cm of the opening height. |
| Expression/framing | Evaluated glance shift 42.09°; independent blink values plus active lash keys; head remains at least 5.89% inside picture, opening shoes at least 5.11%. Later changes to leg/torso framing are intentional in-camera crops. |

## Repairs before the full frame run

- **Arcade:** overlapping double piers created black slots in the first still. Shared masonry courses with a single face removed them. Overshirt was lengthened and trousers cut to leave modest but visible garment ease. See F001 pair.
- **Eyes and framing:** upstream cornea polygons at the alpha-zero UV patch occluded the eye. The visible iris/sclera surface now carries its own clearcoat. Adjusted lid apertures and gaze height, and tightened the dolly for the face close-up. See F190 pair; lens/framing were also changed, so this is not a fixed-camera light comparison.
- **Blink:** the first closed-eye image had an indistinct closure line. Added a skin lid margin and small weighted upper lashes that follow each blink; verified by rerendering F194. No makeup texture was painted over the result.
- **Deformation:** the first walking exam found an interior trouser seam edge stretching 9.48× near frame 79 and a small sleeve seam at 3.77×. Anchored the central trouser gusset gradually toward the hips and softened elbow seam weights. Across the same inspected poses, max trouser edge ratio fell to 2.82×, max overshirt ratio to 2.55×. Rerendered frame 79 (walking), 194 (blink) and 242 (greeting). Frame 242 shows five resolved digits, a bent elbow and a readable smile.
- **Separate diagnostic camera:** [shoe-contact board](evidence/locked-shoe-contact.jpg), nine real 640×360/8-sample renders from a fixed orthographic camera at the shoes and knees. This is inspection coverage and is not substituted into the final edit. It shows the leg taking weight, release of the rear shoe, successive heel strikes and toe roll.

[Rendered before/after revisions](evidence/rendered-preflight.jpg) · [Rebuild and license notes](README.md)

## Final film and archives

[Download the MP4, editable Blender file, portable Python source, contact sheet and receipts](https://github.com/parthoriganal/Parth-/actions/runs/44266306549/artifacts/14411440460) · [Download all 360 native PNGs](https://github.com/parthoriganal/Parth-/actions/runs/44266306549/artifacts/14410832132). GitHub Actions downloads may require sign-in and are retained through December 18, 2026. The frame package contains a ZIP of the ordered PNGs and per-frame SHA-256s, not a rendered-video extraction.

- [Full CPU plate run](https://github.com/parthoriganal/Parth-/actions/runs/44265319915): **20 passed batches × 18 frames**, four CPU threads per batch. The observed span from the first worker's start to the last worker's finish was **580 s (9 min 40 s)**, excluding setup and FFmpeg. The sum of individual frame render/write/check times across workers was **8,185.63 s**; median **21.50 s**, range **17.26–33.50 s**. Peak worker resident memory **1,825.1 MiB**. The final package was built from those same validated plates, with no rerender.
- **Full decode:** FFmpeg verified **360/360 frames, 24 fps constant PTS, 15.000 s, 1920×1080** from the **1152×648** native raster via Lanczos. No missing, duplicate-adjacent downsampled images, corrupt PNGs, or interpolation. Both ZIPs passed CRC checks. The WAV has 720,000 samples/channel at 48 kHz; full AAC decode had 720,896 samples/channel including padding, within one AAC block. Audible cue windows were detected at the six intended strikes. There is no dialogue.
- **Visual review of the actual encoded file:** downloaded the exact MP4, verified its SHA-256 and decoded it again. Reviewed 36 time-ordered samples across all five beats, plus the [final contact sheet](evidence/contact-sheet.jpg) and the separate sole diagnostics. Checked the opening shoe margins, forward knee bend and weight transfer, the intentional lower-body crop during the move into medium framing, consistent face/eyelids and the close blink, palm and finger separation during the greeting, the arm returning to rest, and continuity of daylight, cast shadows and camera distance. The camera intentionally leaves the hands below frame in the final portrait. This is sampled visual inspection, not a claim of photorealism or an exhaustive collision scan.
- **Portability and recovery:** reopened the exact delivered Blender file locally and reevaluated all 360 poses. Independently extracted the Python package and rebuilt/reopened it headlessly. The [checkpoint fixture](evidence/checkpoint-recovery.json) truncated only PNG F195 to 85 bytes: the valid adjacent F194 was retained unchanged, only F195 rerendered and passed format/checksum validation. The fresh F195 hash differs from the original, so no byte-for-byte render repeatability is claimed. The three film unit tests and 15 shared pipeline regressions passed.

[Delivery and timing receipt](evidence/delivery-qa.json) · [Reopened-scene measurements](evidence/scene-qa.json) · [Decoded foley check](evidence/decoded-audio-qa.json)
