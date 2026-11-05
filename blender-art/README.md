# Neon Singularity

A procedural sci-fi scene: a levitating singularity, luminous gyroscopic rings,
shards, obelisks, a distant sun and scattered stardust. The script saves an
editable Blender scene and renders a 1000 × 1000 PNG with Cycles.

From the repository root, with Blender installed:

```sh
blender --background --python blender-art/create_scene.py
```

Outputs: `blender-art/neon-singularity.blend` and
`blender-art/neon-singularity.png`. Rendering may take a few minutes on a CPU.

Alternatively, run the script using Blender's `bpy` Python package (tested target:
4.5.3), provided its system graphics libraries are installed. This environment
could install the `bpy` package but could not run it because the necessary Linux
shared libraries were unavailable, so the scene has not been rendered here.
