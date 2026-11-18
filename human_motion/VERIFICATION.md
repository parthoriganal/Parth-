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
