# Text-to-video: astronaut on the Moon

This folder runs **Picsart Text2Video-Zero** (https://github.com/Picsart-AI-Research/Text2Video-Zero), a real text-to-video diffusion method, on a GitHub Actions CPU runner.

Prompt:

> An astronaut walking across the surface of the Moon, side view, legs taking steps and arms swinging, lunar dust rising from the boots, Earth hanging in the black sky, cinematic realistic science fiction, smooth tracking shot

Method: Stable Diffusion 1.5 + Text2Video-Zero cross-frame attention + latent motion field. No input image, slideshow, zoom, pan, or frame interpolation.

The workflow publishes `astronaut-moon.mp4` as a GitHub Release asset together with `generation.json`, a contact sheet, and the prompt. The MP4 is a short 2-second proof clip (8 generated frames at 4 fps), because CPU diffusion is slow.
