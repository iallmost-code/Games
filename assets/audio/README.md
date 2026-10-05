# Ember Crypt presentation audio

The fifteen WAV layers here are original designed sound effects authored for this
project by `generate_samples.py`. They use deterministic filtered noise, envelopes
and modal resonance synthesis. They are **not recorded Foley**, a licensed sound
pack or external audio. Regenerate with `python3 assets/audio/generate_samples.py`.
Playback needs no Python, build step, external host or runtime sound generation.

All samples are 24 kHz mono PCM16, 0.24–0.88 seconds, with click-preventing edge
fades and headroom. The complete sample payload is 302,580 bytes. Layers combine
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
AudioContext, and failed loads do not trigger combat-time retries. No ambience loop
is added, so pause and battery behavior do not gain background audio work.

Run `node tests/audio-presentation.cjs` for WAV integrity/budget checks, mocked
failure/cache/voice/mute lifecycle assertions and actual Chromium Web Audio decode
and playback scheduling. Browser tests verify graph behavior, not subjective
listening quality or Android hardware audio latency.
