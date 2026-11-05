# Science, sources and visualization limits

## What the film claims

1. **The glow is not the hole.** An accretion disk is matter outside the event
   horizon. Hot gas can radiate; the black hole does not have a glowing solid
   surface. Not every black hole has a bright accretion disk.
2. **The event horizon is a causal boundary.** Light emitted from inside cannot
   escape to a distant external observer. The film does not depict escaping
   rays from inside this boundary.
3. **Gravity changes the paths of light.** Radiation emitted from the far side
   of a disk can reach an observer along curved trajectories. A lensed image
   may therefore show disk material apparently above and below the shadow.
4. **The shadow is not the horizon.** For an ideal, non-rotating Schwarzschild
   black hole viewed from far away, the critical impact parameter is
   `b_critical = (3 sqrt(3) / 2) R_s ≈ 2.598 R_s`. This is the shadow's apparent
   radius in impact-parameter units, compared with a horizon areal radius
   `R_s`. It is not a material spherical shell at 2.6 R_s.
5. **A bright ring is light, not a solid surface.** The visible bright structure
   depends on the radiating matter, its motion, and how light is deflected.
   The narrow critical-curve visibility aid in our shader should not be
   identified with the whole broad emission ring in a telescope image.

## References

- NASA Scientific Visualization Studio, **Black Hole Accretion Disk
  Visualization**: https://svs.gsfc.nasa.gov/13326/
  Describes far-side disk lensing, brightness asymmetry, and the distinction
  between event horizon, shadow and photon ring.
- NASA Scientific Visualization Studio, **NASA Black Hole Visualization Takes
  Viewers Beyond the Brink**: https://svs.gsfc.nasa.gov/14576/
  Describes a non-rotating black-hole visualization and its labelled boundaries.

The narration avoids claiming that every black hole has a disk or that the
image shows a black-hole interior. It does not discuss Hawking radiation,
singularities, rotation, or jet physics.

## Numerical view

The main GLSL image integrates the spatial null-ray orbit equation of a
Schwarzschild black hole, in units `R_s = 1`:

```
d²r/dλ² = -(3/2) R_s |L|² r / |r|⁵
L = r × dr/dλ
```

The integration uses velocity Verlet with adaptive spatial step size and a
fixed maximum of 144 steps per pixel. Plane crossings sample an illustrative
emitting disk between radii 3 and 12 R_s. The camera remains outside the hole.
A ray ending inside 1.015 R_s is terminated; the small numerical offset avoids
unstable boundary steps. A far-away escape samples the procedural star field.

This is **not** a full general-relativistic radiative-transfer calculation.
The observer directions use a Euclidean camera approximation at finite radius,
not a relativistic local tetrad. Discretization, integration budget and finite
escape distance introduce error. Emission, opacity, turbulence, temperature
colour, exposure and the thin critical-curve highlight are artistic. Doppler
brightness is qualitative, not a spectral transfer calculation. No scientific
measurement should be inferred from rendered pixels.

## Teaching diagrams

The 27–41 second scene uses Three.js spline bundles and animated photon markers
for conceptual explanation. Those splines are not numerically solved null
geodesics, and their receiver geometry is schematic. The labels say so.

The 43–56 second radius diagram is a conceptual comparison, not a literal
cross-section through an observer image. The cyan radius is 2.598 times the
amber radius by construction. The dashed 1.5 R_s guide corresponds to the
Schwarzschild photon-sphere radius; it is not a physical surface. A distant
observer sees impact parameters, not these radii laid out side by side in space.

All imagery is original code-generated illustration, **not NASA footage or
Event Horizon Telescope data**. Sound design is non-diegetic; it is not sound
propagating through empty space.
