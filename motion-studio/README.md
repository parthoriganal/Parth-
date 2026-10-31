# Frame Studio

A local-first motion-graphics production studio. Frame combines an editable storyboard and a live video preview with deterministic rendering to H.264/AAC MP4. The default project is a 24-second sample film; it includes a generated image, a locally synthesized music bed, and a transition sound. It does **not** contain a voiceover.

> This is a focused production foundation, not a full nonlinear editor. AI planning requires a configured provider; the default planner is rules-based and labeled accordingly. Review every draft and every statistic before publishing.

## Get started

Requires Node.js **22.17+**, npm, and a Linux x64 host for the included Chromium/FFmpeg binaries. The first render extracts a headless Chromium binary and shared libraries into the OS temporary directory. No system FFmpeg is required on the tested platform.

```bash
cd motion-studio
npm ci
npm run dev
# Open the server's URL, normally http://localhost:3000
```

For a production-style build:

```bash
npm run build
NODE_ENV=production npm run dev
```

The server listens on `0.0.0.0` for preview environments. `PORT` changes the port. On other platforms install a compatible Chrome/Chromium and set `CHROME_PATH` to its executable; those platforms have not been verified here. FFmpeg and FFprobe are installed from npm platform packages.

### Basic workflow

1. Enter a brief and choose a direction, format, and accent. **Create local storyboard** uses a deterministic heuristic; if an AI provider is configured the button changes to **Generate with AI**.
2. Select a scene in the storyboard. Edit its headline, supporting copy, script, visual format, layout, and duration. Reorder or delete scenes in the details panel. The preview is the actual Remotion composition, not a mockup.
3. For photos or footage, upload a file or choose an existing asset. For an infographic, enter up to three **verified** percentages and labels. Three.js phone, clock, and globe objects are procedural and deliberately limited to supporting roles.
4. In **Audio**, attach a narration recording, music, and any sound effects. Set each track's volume and its start time in seconds. **Fit scenes to narration** estimates scene lengths from the recording's length and script word counts; it is not speech recognition and must be fine-tuned. **Auto-cue transitions** moves existing effects to scene cuts and adds built-in swishes as needed. Narration text is only a script: it is **not** automatically synthesized. The sample music/effect can be removed or replaced.
5. Choose **Export video**, review validation messages, choose Remotion or HyperFrames and 1080p or 4K, and render. The server checks the finished codec, dimensions, frame rate, frame count, duration, audio presence, and decodability before showing a download.
6. **Project** downloads a JSON edit decision file; **Import** restores it. Uploaded media remains on the server in `storage/`, so JSON exports reference asset IDs rather than bundling the media. Back up `storage/assets/` and `storage/assets.json` alongside project JSON.

The storyboard has 1–16 scenes, each 1–30 seconds; total runtime is capped at 3 minutes. Uploads are capped at 150 MB. Only one render runs per server at a time. Render jobs are in memory and are lost if the server restarts; completed files live in ignored `storage/renders/`. 4K and longer projects can take substantial CPU time and memory.

## AI-assisted storyboards (optional)

The server accepts an OpenAI-compatible Chat Completions endpoint. Configure it **on the server**, not in the browser:

```bash
export AI_BASE_URL="https://api.openai.com/v1"
export AI_API_KEY="your-provider-key"
export AI_MODEL="your-model-name"
npm run dev
```

The base URL must be HTTPS (HTTP is allowed only for a local test server). A configured provider receives the brief and creative direction. The returned JSON is validated and reduced to supported scene types; it cannot run code or invent asset paths. External providers, network access, costs, privacy policies, and factual accuracy are the operator's responsibility. The adapter has been tested with a local mock, **not** with a live account in this environment.

Without those variables, Frame uses a local rule-based planner. It detects explicitly mentioned phone/clock/globe concepts, percentages, and process language; it can match already-uploaded images or footage by filename. It does not research facts, generate images, search stock libraries, or understand which visual is objectively best. Its decisions are editable and should be reviewed.

## Composition and rendering

| Component | Use in this project | Boundaries |
| --- | --- | --- |
| [Remotion](https://github.com/remotion-dev/remotion) | Live preview and primary, frame-accurate composition renderer | 2D, uploaded photos/footage, 3D objects, diagrams and preview audio. |
| [GSAP](https://github.com/greensock/GSAP) | Easing in Remotion and seekable timelines in HyperFrames | Animation is authored by the included scene components. |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | A real 2D scene graph is deterministically sought and drawn inside vector-explainer scenes | One built-in three-node explainer; it is rasterized to a transparent canvas, not a general Motion Canvas project importer. |
| [Three.js](https://github.com/mrdoob/three.js) | Procedural lit phone, clock and globe | Selective objects, not full 3D environments or arbitrary model imports. Software WebGL is used on the tested host. |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | Independent HTML/GSAP renderer and downloadable source project | Kinetic type, diagrams, data bars and images only; 3D and footage are rejected rather than silently omitted. Its composition is similar but not pixel-identical to the Remotion preview. |
| [FFmpeg](https://ffmpeg.org/) / FFprobe | Timed audio mix, H.264/AAC delivery and validation | Manual offsets and approximate length-based fitting; no speech-aligned timing, ducking, transcription, or text-to-speech. |

HyperFrames source exports contain the HTML, GSAP, local fonts, referenced images and attached timed audio. The application's HyperFrames MP4 path renders visual frames first and mixes audio using its own FFmpeg stage. HyperFrames telemetry is disabled by the server.

Built-in scene styles use typography, gradients, vector paths, subtle particles, and restrained scene fades; uploaded illustrations are treated as images. Project direction presets change the accent palette, not the entire art direction. The system does not automatically source licensed footage, create arbitrary illustrations, or generate sophisticated bespoke 3D assets.

### Output presets

| Preset | Landscape | Vertical |
| --- | --- | --- |
| 1080p | 1920 × 1080 | 1080 × 1920 |
| 4K | 3840 × 2160 | 2160 × 3840 |

Projects default to 24 fps; the schema also accepts 30 fps in imported JSON. The preview uses an adaptive 1080p canvas when 4K is selected; the export uses the full requested dimensions.

## Verification

```bash
npm test                     # schema, planner, timing, mock AI and HTML escaping
npm run verify               # starts a test server; renders Remotion + HyperFrames MP4s
npm run verify -- --extended # also renders a 4K vertical MP4 (slow)
# In another terminal with the studio running:
npm run verify:ui            # browser interaction smoke tests
```

The rendering check runs real Chromium, Motion Canvas, Three.js and FFmpeg, probes and decodes output, verifies that different scenes produce different frames, and checks the HyperFrames source ZIP. Tests use temporary projects and do not modify the current browser draft.

In the initial implementation environment, the following were exercised: full 1080p sample render; short 1080p landscape and vertical renders; short 4K landscape and vertical renders; a 30 fps HyperFrames HTML lint, source export and MP4 render; uploaded MP4 footage; timed uploaded WAV narration; synthetic music/effects; and a mock AI endpoint. See the verification commands above for rerunning the pipeline. A live AI provider and other operating systems were not tested.

## Privacy, security and licensing

- This is a **single-user trusted-environment** server with no login, authorization, tenant isolation, or rate limiting. Do not expose it publicly without adding authentication, access controls, TLS, upload scanning and resource limits. The preview URL may be accessible to people who have it.
- Assets and renders stay on this server. A brief is sent to a provider only when AI is configured and AI generation is requested. Credentials are read from environment variables and are not returned by the API.
- Use only media and voices you have rights to. The bundled horizon is an AI-generated demonstration image; the demo audio is synthesized locally. Review upstream licenses before distributing or using the stack commercially: HyperFrames (Apache-2.0), Motion Canvas/Three.js (MIT), GSAP's current terms, and **Remotion's separate license**, which may require a paid company license. The bundled Linux FFmpeg build is configured with GPL components including x264; its distribution obligations apply.
