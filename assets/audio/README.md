# Ember Crypt presentation audio

The twenty-seven WAV layers here are original designed sound effects authored for this
project by `generate_samples.py`. They use deterministic filtered noise, envelopes
and modal resonance synthesis. They are **not recorded Foley**, a licensed sound
pack or external audio. Regenerate with `python3 assets/audio/generate_samples.py`.
Playback needs no Python, build step, external host or runtime sound generation.

All samples are 24 kHz mono PCM16, 0.24–0.88 seconds, with click-preventing edge
fades and headroom. The complete sample payload is 581,988 bytes. Layers combine
blade air, stone/metal impacts, armor, shield resonance, bow string, spectral casts,
fire crackle, gem/crystal tones, blasts, a rising Ultimate, a falling soul and stone
doors. Casts and automatic shots use different combinations for the five heroes.

`combat-audio.js` exports `window.EmberAudio`:

- `ensure(audioCtx)` asynchronously caches downloads and decodes; resolves whether
  any buffer loaded. It does not create/resume an AudioContext or change mute state.
- `play(kind, audioCtx, heroClass)` returns `true` only when at least one sampled
  voice was actually scheduled. It returns `false` while loading, when suspended,
  for missing samples, throttled events or a full voice budget. Failures are caught.
- `ready(kind, audioCtx, heroClass)` identifies a fully loaded event. If `play`
  returns false but `ready` returns true, the event was intentionally capped and
  the caller should avoid legacy fallback. Preserve the existing caller's sound
  guard and legacy cooldowns before this decision.
- `stop(audioCtx)` immediately stops/disconnects voices for mute or page lifecycle
  handling. It leaves decoded buffers reusable and never closes the shared context.
- `stats(audioCtx)` returns decode/voice counters for diagnosis; it changes no state.

Integrate `ensure` into the existing user-gesture audio setup. Once sound is enabled
and the context is running, prefer sampled playback and retain the existing tones
only when the sampled event is unavailable:

```js
if (EmberAudio.play(kind, audioCtx, hero && hero.class) ||
    EmberAudio.ready(kind, audioCtx, hero && hero.class)) return;
```

Use `swing` for Bloodknight's automatic sword release if distinguishing it from a
confirmed `hit`; this changes presentation only. `shoot` covers the automatic shots
which previously had no legacy sound definition.

There are at most twelve active sources, two layers per event, no per-voice filters,
no spatial panners and one shared dynamics compressor. High-priority hero damage,
Dash, Ultimate and boss cues can replace older ordinary attack voices. Sources and
gains disconnect on natural end or stop. Variation uses a local counter rather
than the game's random generator. Samples download once per page, decode once per
AudioContext, and failed loads do not trigger combat-time retries. Music is separately controlled and bounded, as described below.

Run `node tests/audio-presentation.cjs` for WAV integrity/budget checks, mocked
failure/cache/voice/mute lifecycle assertions and actual Chromium Web Audio decode
and playback scheduling. Browser tests verify graph behavior, not subjective
listening quality or Android hardware audio latency.

## v69 additions and music

New original samples: thunder-string, holy-chime, fire-whoosh, four enemy death families (bones/flesh/stone/spirit), chest-open, well-drink, forge-anvil, stairs-step and boss-roar. Enemy types select a material family and pitch: skeleton/sentinel bones; Frost Golem/burrower/Heart stone; wraith/caster/Oracle spectral; others flesh. Ranger uses bowstring + thunder, Sunwarden holy chime, Emberweaver whoosh + crackle. Door unlock layers stone movement and metal. URLs carry a fixed asset version, while raw downloads/decodes remain cached without combat-time retries. All sample events still share the 12-voice cap and compressor.

`music.js` exports EmberMusic.ensure/unlock/update/sting/stats. It authors small 16 kHz mono buffers lazily using deterministic local synthesis, never gameplay RNG. The menu uses an original dark minor motif; Ash drones/crackle, Frost glass/wind and Venom FM drips/bubbling each have an eight-second ambient loop. Combat percussion follows quantized nearby-enemy density; boss drums replace it. Zone changes crossfade, with at most three playing loops plus three retiring loops; stings cap at three and disconnect on natural end. All music passes a master gain/compressor. It allocates no additional sources as enemy count changes.

MUSIC ON/OFF uses only `ember-crypt-music-muted`; `ember-crypt-muted` still controls effects. Music waits for a pointer/keyboard gesture, fades its master on pause or tab hide, and tab-return remains gated until another gesture. Turning off effects does not disable music, and music OFF does not alter effects. Game simulation stubs `function music(kind) {` independently; tests/sound-motion.cjs also tests the real module directly in Chromium.
