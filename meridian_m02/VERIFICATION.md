# Weather Atlas · verification

This report separates rendered evidence from implementation and explicitly notes what was not tested. The `m02-preflight`, `m02-rendered-evidence` and `weather-atlas-production` artifacts from the [M/02 workflow](../.github/workflows/render-meridian-m02.yml) carry the original PNGs and JSON measurements. Native plate resolution and encoded resolution are reported separately.

## Coverage

| Capability | Rendered test and acceptance signal |
|---|---|
| Procedural environments | The tidal archive, glasshouse and alpine observatory are separately authored, reopened and rendered; their mesh/module counts accompany the PNGs. Only closed architectural extrusions are counted as Trimesh-validated solids. |
| Layered materials and light | A frozen tide view and pose are rendered normally, rerendered with material layers bypassed, and rerendered with another sun/sky recipe. Pixel deltas and input hashes accompany the A/B images. |
| Character animation | World-space two-link foot IK with evaluated sole height, stance drift and swing clearance. The greenhouse close-up renders the same phase on the raised and corrected foot plane. |
| Automated image inspection | The entire animation plate set is decoded, checksum checked and measured before composition. A valid blank Cycles render is explicitly rejected. |
| Correction | With separate injected-fault inputs, full-set lens fit, off-deck IK and underexposure must activate and re-render successfully; a fixed-shot overexposure also tests downward correction. |
| Storyboard to sequence | The JSON resolves reusable sets, per-take camera/light, frame counts and sound-caption cut timestamps. The edit decodes at the expected frame cadence. |
| Object/camera motion | Full-shot opening-to-closing image deltas and keyed camera/lens evaluation; separate locked camera pairs reveal instrument motion independently of the camera path. |
| Reuse | Lichen Crossing reuses a differently seeded, differently colored five-bay asset in two independently rendered takes. |

## Not claimed

No GPU, Eevee, Blender GUI, arbitrary script import, live editor integration, optics plugin, M/02 Remotion/Manim export or cloud DCC was tested. No arbitrary scene understanding, automatic aesthetic rating, collision correction outside the authored floor, temporal denoising/flicker removal, or photometric or professional-quality certification. Master encodes 1080p from 1152×648 Cycles plates, not native 1080p Cycles for every frame.
