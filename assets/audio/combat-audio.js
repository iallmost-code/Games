/* Original sampled presentation audio. No game state, timers, saves or RNG here. */
(function (root) {
  'use strict';
  const script = root.document && root.document.currentScript;
  const base = new URL('.', script && script.src ? script.src :
    new URL('assets/audio/combat-audio.js', root.document ? root.document.baseURI : 'http://localhost/').href);
  const contexts = new WeakMap(), downloads = new Map();
  const MAX_VOICES = 12;
  const SAMPLE_VERSION = '73';
  const names = ['blade-air', 'dash-air', 'stone-impact', 'metal-impact', 'armor-hit',
    'shield-ring', 'bow-release', 'soul-cast', 'fire-crackle', 'crystal-chime',
    'pickup-gem', 'ember-blast', 'ultimate-rise', 'soul-fall', 'stone-door',
    'dagger-whisper','glacial-bash','thunder-string','holy-chime','fire-whoosh','death-bones','death-flesh','death-stone','death-spirit','chest-open','well-drink','forge-anvil','stairs-step','boss-roar'];
  const layer = (name, gain, pitch = 1, delay = 0) => ({ name, gain, pitch, delay });
  const casts = {
    rogue: [layer('dagger-whisper', .23),layer('blade-air', .07, 1.3)],
    frostwarden: [layer('glacial-bash', .23),layer('shield-ring', .12, .75)],
    gravecaller: [layer('soul-cast', .24, .90), layer('blade-air', .09, .75, .018)],
    bloodknight: [layer('blade-air', .25, .84), layer('armor-hit', .08, 1.13, .016)],
    ranger: [layer('bow-release', .21), layer('thunder-string', .13, 1, .018)],
    ember: [layer('fire-whoosh', .22), layer('fire-crackle', .10, .86, .016)],
    sunwarden: [layer('holy-chime', .19), layer('blade-air', .10, 1.10)]
  };
  const events = {
    chest:[layer('chest-open',.23),layer('pickup-gem',.1,1,.08)],
    well:[layer('well-drink',.23)],forge:[layer('forge-anvil',.23)],
    unlock:[layer('stone-door',.23),layer('metal-impact',.11)],stairs:[layer('stairs-step',.24)],
    start: [layer('crystal-chime', .14, .85), layer('pickup-gem', .12, .89, .08)],
    cast: casts.gravecaller,
    shoot: casts.gravecaller,
    hit: [layer('stone-impact', .19), layer('metal-impact', .09, .84, .008)],
    swing: casts.bloodknight,
    crit: [layer('metal-impact', .24, 1.12), layer('crystal-chime', .14, 1.28, .01)],
    hurt: [layer('armor-hit', .28, .83), layer('stone-impact', .12, .77, .015)],
    block: [layer('shield-ring', .23), layer('armor-hit', .10, 1.12)],
    dash: [layer('dash-air', .23), layer('blade-air', .10, 1.31, .015)],
    ultimate: [layer('ultimate-rise', .27), layer('ember-blast', .15, .81, .055)],
    blast: [layer('ember-blast', .27), layer('stone-impact', .12, .78)],
    death: [layer('soul-fall', .26), layer('armor-hit', .13, .71)],
    pickup: [layer('pickup-gem', .12)],
    loot: [layer('pickup-gem', .20, .84), layer('crystal-chime', .13, 1.12, .065)],
    upgrade: [layer('crystal-chime', .20, .81), layer('pickup-gem', .16, 1.08, .10)],
    door: [layer('stone-door', .21), layer('armor-hit', .09, .66, .045)],
    warning: [layer('soul-cast', .16, .64), layer('shield-ring', .09, .59)],
    boss: [layer('boss-roar', .25), layer('stone-door', .12, .79)],
    bossDown: [layer('ember-blast', .20, .82), layer('crystal-chime', .22, .80, .11)]
  };
  // Admission is cosmetic. Only a bounded number of nodes is active even in dense fights.
  const cooldown = { cast: .09, shoot: .09, hit: .14, swing: .14, crit: .15, hurt: .17,
    block: .18, blast: .35, pickup: .09, loot: .15, upgrade: .20, warning: .55,
    boss: .90, bossDown: .40, death: 1, door: 1.25, dash: .04, ultimate: .08, start: .04 };
  const priorities = { hit: 0, swing: 0, cast: 0, shoot: 0, pickup: 0, loot: 1,
    crit: 1, blast: 1, block: 2, hurt: 2, dash: 2, warning: 2,
    ultimate: 3, death: 3, boss: 3, bossDown: 3 };

  function definitions(kind, heroClass) {
    if(kind.startsWith('enemy-')){const type=kind.slice(6),family=['skeleton','sentinel','drownedKnight'].includes(type)?'bones':['frostGolem','burrower','heart','machineGolem','foundry','cryptHeart'].includes(type)?'stone':['wraith','caster','oracle','ghostChoir','bishop'].includes(type)?'spirit':'flesh';return [layer('death-'+family,.16,type==='brute'?.8:type==='cinderImp'?1.25:1)];}
    return (kind === 'cast' || kind === 'shoot') ? casts[heroClass] || events[kind] : events[kind];
  }
  function raw(name) {
    if (!downloads.has(name)) {
      // A failed request stays failed; effects never start retrying network work during combat.
      downloads.set(name, Promise.resolve().then(() => root.fetch(new URL(name + '.wav?v=' + SAMPLE_VERSION, base).href))
        .then(response => response.ok ? response.arrayBuffer() : null).catch(() => null));
    }
    return downloads.get(name);
  }
  function decode(ctx, bytes) {
    return new Promise(resolve => {
      if (!bytes) return resolve(null);
      try {
        // The callback form also works on older WebKit. Never decode a buffer twice.
        const pending = ctx.decodeAudioData(bytes.slice(0), resolve, () => resolve(null));
        if (pending && pending.catch) pending.catch(() => resolve(null));
      } catch (_) { resolve(null); }
    });
  }
  function ensure(ctx) {
    if (!ctx || ctx.state === 'closed') return Promise.resolve(false);
    let state = contexts.get(ctx);
    if (state) return state.loading;
    try {
      const master = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
      master.gain.value = .68;
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 3;
      compressor.attack.value = .003;
      compressor.release.value = .18;
      master.connect(compressor); compressor.connect(ctx.destination);
      state = { master, compressor, buffers: new Map(), live: new Set(), last: new Map(),
        serial: 0, scheduled: 0, maximum: 0, decoded: 0, loading: null };
      contexts.set(ctx, state);
      state.loading = Promise.all(names.map(async name => {
        const buffer = await decode(ctx, await raw(name));
        if (buffer) { state.buffers.set(name, buffer); state.decoded++; }
      })).then(() => state.decoded > 0).catch(() => false);
      return state.loading;
    } catch (_) { return Promise.resolve(false); }
  }
  function ready(kind, ctx, heroClass) {
    const state = ctx && contexts.get(ctx), plan = definitions(kind, heroClass);
    return !!(state && plan && plan.every(item => state.buffers.has(item.name)));
  }
  function release(state, voice) {
    if (!state.live.delete(voice)) return;
    try { voice.source.disconnect(); } catch (_) {}
    try { voice.gain.disconnect(); } catch (_) {}
    voice.source.onended = null;
  }
  function stopVoice(state, voice) {
    try { voice.source.stop(); } catch (_) {}
    release(state, voice);
  }
  function play(kind, ctx, heroClass) {
    if (!ctx || ctx.state !== 'running') return false;
    const state = contexts.get(ctx), plan = definitions(kind, heroClass);
    if (!state) { ensure(ctx); return false; }
    if (!ready(kind, ctx, heroClass)) return false;
    const now = ctx.currentTime, previous = state.last.get(kind);
    if (previous !== undefined && now - previous < (cooldown[kind] || .04)) return false;
    const priority = priorities[kind] || 0;
    // Important cues may replace an older low-priority voice. Regular attacks never
    // steal a hero damage warning, Dash, Ultimate or death cue.
    if (state.live.size + plan.length > MAX_VOICES) {
      const victims = [...state.live].filter(v => v.priority < priority)
        .sort((a, b) => a.priority - b.priority || a.started - b.started);
      while (victims.length && state.live.size + plan.length > MAX_VOICES) stopVoice(state, victims.shift());
      if (state.live.size + plan.length > MAX_VOICES) return false;
    }
    // Three subtle variations come from a presentation counter; game RNG is untouched.
    const variation = [1, .973, 1.024][state.serial++ % 3];
    let count = 0;
    for (const item of plan) {
      let source, gain, voice;
      try {
        source = ctx.createBufferSource(); gain = ctx.createGain();
        source.buffer = state.buffers.get(item.name);
        source.playbackRate.value = item.pitch * variation;
        gain.gain.value = item.gain;
        source.connect(gain); gain.connect(state.master);
        voice = { source, gain, priority, started: now };
        state.live.add(voice);
        source.onended = () => release(state, voice);
        source.start(now + .003 + item.delay);
        count++; state.scheduled++;
        state.maximum = Math.max(state.maximum, state.live.size);
      } catch (_) {
        if (voice) release(state, voice);
        else {
          try { if (source) source.disconnect(); } catch (_) {}
          try { if (gain) gain.disconnect(); } catch (_) {}
        }
      }
    }
    if (count) state.last.set(kind, now);
    return count > 0;
  }
  function stop(ctx) {
    const state = ctx && contexts.get(ctx);
    if (!state) return;
    for (const voice of [...state.live]) stopVoice(state, voice);
    state.last.clear();
  }
  function stats(ctx) {
    const state = ctx && contexts.get(ctx);
    return state ? { decoded: state.decoded, active: state.live.size, maximum: state.maximum,
      scheduled: state.scheduled, limit: MAX_VOICES } :
      { decoded: 0, active: 0, maximum: 0, scheduled: 0, limit: MAX_VOICES };
  }
  root.EmberAudio = Object.freeze({ ensure, play, ready, stop, stats });
})(typeof window !== 'undefined' ? window : globalThis);
