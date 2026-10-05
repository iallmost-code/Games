"""Author Ember Crypt's original sample layers; no external recordings or libraries.

Run from any directory with Python 3. Deterministic, 24 kHz mono PCM16 WAVs.
These are designed sound effects (filtered noise, physical modal resonances and
envelopes), not recorded Foley. Runtime playback never invokes this generator.
"""
from pathlib import Path
import math
import random
import struct
import wave

RATE = 24000
OUT = Path(__file__).resolve().parent
TAU = math.tau


def noise(seed, count, cutoff=0.15):
    rng = random.Random(seed)
    value = 0.0
    result = []
    for _ in range(count):
        value += cutoff * (rng.uniform(-1, 1) - value)
        result.append(value)
    return result


def render(name, duration, recipe, seed):
    count = round(duration * RATE)
    low = noise(seed, count, 0.055)
    mid = noise(seed + 71, count, 0.34)
    high = noise(seed + 139, count, 0.92)
    samples = [recipe(i / RATE, low[i], mid[i], high[i]) for i in range(count)]
    peak = max(abs(v) for v in samples) or 1
    # A controlled headroom target plus edge fades prevents clicks after repitching.
    samples = [v * 0.78 / peak * min(1, i / (RATE * 0.0015),
               (count - 1 - i) / (RATE * 0.018)) for i, v in enumerate(samples)]
    with wave.open(str(OUT / (name + '.wav')), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b''.join(struct.pack('<h', round(v * 32767)) for v in samples))


def modal(t, modes, decay):
    return sum(amp * math.sin(TAU * frequency * t) * math.exp(-t * decay * falloff)
               for frequency, amp, falloff in modes)


render('blade-air', 0.24, lambda t, lo, mid, hi:
       (mid * 1.3 + hi * 0.18) * math.sin(math.pi * min(1, t / 0.24)) ** 1.7 +
       lo * math.sin(TAU * (170 * t - 170 * t * t)) * math.exp(-t * 13), 101)
render('dash-air', 0.27, lambda t, lo, mid, hi:
       (mid * 0.85 + lo * 1.8) * (1 - math.exp(-t * 110)) * math.exp(-t * 19) +
       hi * 0.12 * math.exp(-t * 12), 207)
render('stone-impact', 0.29, lambda t, lo, mid, hi:
       (lo * 1.9 + mid * 0.5 + hi * 0.4) * math.exp(-t * 35) +
       modal(t, [(83, .7, 1), (139, .4, 1.6), (213, .18, 2)], 24), 309)
render('metal-impact', 0.35, lambda t, lo, mid, hi:
       hi * 0.8 * math.exp(-t * 70) + mid * 0.3 * math.exp(-t * 30) +
       modal(t, [(427, .3, 1.2), (761, .22, 1), (1239, .14, 1.5), (1891, .10, 2)], 14), 411)
render('armor-hit', 0.28, lambda t, lo, mid, hi:
       (mid * 0.6 + lo * 1.6) * math.exp(-t * 22) + hi * 0.35 * math.exp(-t * 75) +
       modal(t, [(103, .35, 1), (338, .2, 1.8), (809, .08, 2.3)], 26), 509)
render('shield-ring', 0.38, lambda t, lo, mid, hi:
       hi * 0.5 * math.exp(-t * 82) +
       modal(t, [(282, .30, 1), (731, .20, 1.5), (1443, .13, 2), (2119, .07, 3)], 12), 611)
render('bow-release', 0.26, lambda t, lo, mid, hi:
       (mid * 0.6 + hi * 0.35) * math.exp(-t * 58) +
       modal(t, [(139, .28, 1), (281, .13, 1.5), (561, .07, 2)], 28) +
       lo * 0.5 * math.exp(-max(0, t - .018) * 23), 719)
render('soul-cast', 0.42, lambda t, lo, mid, hi:
       (mid * .32 + lo * .8) * math.sin(math.pi * min(1, t / .42)) * math.exp(-t * 4) +
       sum(a * math.sin(TAU * (f * t - 54 * t * t)) for f, a in [(227, .11), (341, .07), (571, .035)]) *
       (1 - math.exp(-t * 90)) * math.exp(-t * 10), 823)
render('fire-crackle', 0.39, lambda t, lo, mid, hi:
       lo * 1.3 * math.exp(-t * 12) + mid * .5 * math.exp(-t * 16) +
       hi * sum(.6 * math.exp(-abs(t - p) * 320) for p in [.007, .049, .097, .178, .251]), 929)
render('crystal-chime', 0.48, lambda t, lo, mid, hi:
       modal(t, [(839, .28, 1), (1261, .13, 1.1), (2177, .065, 1.6)], 10) +
       hi * .3 * math.exp(-t * 70), 1031)
render('pickup-gem', 0.27, lambda t, lo, mid, hi:
       modal(t, [(1187, .3, 1), (1779, .12, 1.4), (2381, .05, 2)], 19) +
       hi * .13 * math.exp(-t * 78), 1129)
render('ember-blast', 0.58, lambda t, lo, mid, hi:
       (lo * 2.6 + mid * .6 + hi * .26) * math.exp(-t * 9) +
       .38 * math.sin(TAU * (81 * t - 45 * t * t)) * math.exp(-t * 13) +
       hi * .24 * sum(math.exp(-abs(t - p) * 180) for p in [.08, .17, .29]), 1237)
render('ultimate-rise', 0.88, lambda t, lo, mid, hi:
       (lo * .8 + mid * .26) * math.sin(math.pi * min(1, t / .88)) * math.exp(-t * 3) +
       sum(a * math.sin(TAU * (f * t + 67 * t * t)) for f, a in [(157, .2), (237, .13), (397, .06)]) *
       (1 - math.exp(-t * 34)) * math.exp(-t * 5) +
       hi * .25 * math.exp(-abs(t - .15) * 35), 1339)
render('soul-fall', 0.69, lambda t, lo, mid, hi:
       (lo * .8 + mid * .25) * math.exp(-t * 6) +
       sum(a * math.sin(TAU * (f * t - 81 * t * t)) for f, a in [(213, .16), (319, .09)]) *
       (1 - math.exp(-t * 100)) * math.exp(-t * 6), 1439)
render('stone-door', 0.51, lambda t, lo, mid, hi:
       (lo * 2 + mid * .32) * (1 - math.exp(-t * 44)) * math.exp(-t * 9) +
       mid * .65 * math.exp(-abs(t - .07) * 90) +
       modal(t, [(69, .22, 1), (153, .09, 1.5)], 10), 1543)
print('Authored 15 original mono WAV layers:', sum(p.stat().st_size for p in OUT.glob('*.wav')), 'bytes')

# v69: additional original sample layers, same format and headroom as v68.
render('thunder-string', .39, lambda t, lo, mid, hi:
       modal(t, [(227,.32,1),(453,.17,1.4),(911,.08,2)],20) +
       (lo*1.2+hi*.22)*math.exp(-max(0,t-.028)*18),1601)
render('holy-chime', .62, lambda t, lo, mid, hi:
       modal(t, [(523,.24,1),(1047,.15,1.2),(1569,.08,1.6),(2093,.05,2)],7),1709)
render('fire-whoosh', .41, lambda t, lo, mid, hi:
       (lo*1.9+mid*.9+hi*.22)*math.sin(math.pi*min(1,t/.41))**1.3*math.exp(-t*4),1811)
render('death-bones', .38, lambda t, lo, mid, hi:
       mid*sum(math.exp(-abs(t-p)*160) for p in [.01,.05,.11,.20])+
       modal(t,[(487,.18,1),(911,.1,1.7)],24),1901)
render('death-flesh', .32, lambda t, lo, mid, hi:
       lo*1.6*math.exp(-t*13)+mid*.5*math.exp(-t*23)+
       math.sin(TAU*(97*t-30*t*t))*.25*math.exp(-t*14),2011)
render('death-stone', .48, lambda t, lo, mid, hi:
       (lo*2+mid*.7)*math.exp(-t*11)+modal(t,[(67,.26,1),(157,.15,1.7)],13),2111)
render('death-spirit', .56, lambda t, lo, mid, hi:
       (lo*.7+mid*.2)*math.exp(-t*8)+math.sin(TAU*(339*t-110*t*t))*.2*math.exp(-t*7),2203)
render('chest-open', .42, lambda t, lo, mid, hi:
       mid*.5*math.exp(-t*16)+modal(t,[(283,.18,1),(711,.08,2)],19)+
       hi*.35*math.exp(-abs(t-.13)*120),2309)
render('well-drink', .48, lambda t, lo, mid, hi:
       math.sin(TAU*(540*t+17*math.sin(22*t)))*.24*math.exp(-t*9)+lo*.8*math.exp(-t*11),2411)
render('forge-anvil', .61, lambda t, lo, mid, hi:
       hi*.5*math.exp(-t*70)+modal(t,[(337,.29,1),(829,.16,1.3),(1397,.08,2)],9),2503)
render('stairs-step', .32, lambda t, lo, mid, hi:
       (lo+mid*.6)*sum(math.exp(-abs(t-p)*140) for p in [.015,.13,.25]),2609)
render('boss-roar', .82, lambda t, lo, mid, hi:
       (lo*1.6+mid*.6)*math.sin(math.pi*min(1,t/.82))+
       math.sin(TAU*(71*t-22*t*t))*.3*math.exp(-t*3),2707)
print('v69 original mono WAV layers:', len(list(OUT.glob('*.wav'))),
      sum(p.stat().st_size for p in OUT.glob('*.wav')), 'bytes')
