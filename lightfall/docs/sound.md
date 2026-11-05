# Sound design and music plan

## Delivered audio

- `audio/01-hook.mp3` through `05-ending.mp3`: generated, user-selected voice.
- `audio/master.m4a`: complete 74-second mixed soundtrack, AAC, 48 kHz.
- `tools/score.py`: original, seeded synthesizer score generator (no samples).
- `tools/mix.sh`: reproducible FFmpeg mix using the delivered voice stems.

## Musical identity

A restrained, low-register electronic chamber score. Five slowly crossfading
four-note voicings track the five chapters. Sine oscillators avoid the harsh
upper harmonics of a trailer-style synth. A very quiet upper overtone creates a
sense of scale. A filtered noise bed suggests an observatory, not literal sound
travelling through a vacuum.

## Cue sheet

| Cue | Design | Mix intention |
|---|---|---|
| 0–12 | Slow fade of drone and fine air | Leave the opening question exposed. |
| 12 | Decaying low-frequency impact; 1.5s air transition | Announce the shift to the accretion disk without interrupting speech. |
| 27 | Harmonic shift + low impact + soft air sweep | Support the move into the spatial ray diagram. |
| 41 | Low impact and new chord | Give the shadow/horizon distinction weight. |
| 57 | Final harmonic shift and impact | Prepare the last implication. |
| 70–74 | Four-second fade | Let the end line resonate, then silence. |

## Gain structure and limitations

Voice stems are mixed at 1.35 after light compression. Underscore is reduced to
0.7 of its already quiet synthesis level. The final limiter is set to 0.89.
There is no heavy side-chain pumping. Music and effects are intentionally
subordinate to the narration. Listen on headphones and phone speakers before
broadcast use; this is not a certified broadcast-loudness master.

The mix is **mono**, centred for clear speech and mobile playback. Transitions
are synchronized in time rather than binaural or surround spatialized. No
claim of a Dolby/Atmos or professionally studio-recorded human voice is made.
The voice is synthetic. The music and effects are generated with ordinary DSP,
not an external licensed music track.
