/* Combat feel is rendering only: no timers, physics writes, RNG, save fields or hitstop. */
(() => {
  'use strict';
  const profiles = Object.freeze({
    gravecaller: { duration: .18, push: 2.4, lift: 1.5, turn: .035, squash: .025, color: '#c8a3ff', style: 'rune' },
    bloodknight: { duration: .24, push: 6.4, lift: 1.1, turn: .105, squash: .06, color: '#ce4760', style: 'slash' },
    ranger: { duration: .18, push: -3.8, lift: .5, turn: -.045, squash: .018, color: '#b4e6ff', style: 'string' },
    sunwarden: { duration: .18, push: .6, lift: 3.6, turn: .012, squash: .012, color: '#ffe8aa', style: 'halo' },
    ember: { duration: .18, push: -2.2, lift: 2.6, turn: -.06, squash: .036, color: '#ffae69', style: 'flame' },
    rogue: { duration: .18, push: 4.8, lift: .4, turn: .065, squash: .045, color: '#bb90e8', style: 'dagger' },
    frostwarden: { duration: .28, push: 5.2, lift: .8, turn: .07, squash: .09, color: '#b7efff', style: 'shield' },
  });
  let reactions = new WeakMap();
  const impacts = [], pool = [];
  let lastStats = { particles: 0, drawn: 0 };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function pose(o) {
    const p = profiles[o.kind];
    if (!p || !(o.cast > .025) || o.dead || o.hit > 0)
      return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, energy: 0, progress: 1 };
    const t = clamp(1 - o.cast / p.duration, 0, 1);
    // Early coil and sharp release are visual phases, never a delay to the attack.
    const coil = t < .22 ? -Math.sin(t / .22 * Math.PI) * .22 : 0;
    const release = t >= .22 ? Math.sin((t - .22) / .78 * Math.PI) : 0;
    const kick = coil + release;
    const d = o.direction || { x: 0, y: 1 }, length = Math.hypot(d.x, d.y) || 1;
    return { x: d.x / length * p.push * kick,
      y: -p.lift * release + d.y / length * p.push * kick * .22,
      rotation: d.x / length * p.turn * kick,
      scaleX: 1 + p.squash * release, scaleY: 1 - p.squash * release * .65,
      energy: release, progress: t };
  }
  function limit(q) { return (q?.maxAtmosphere ?? 32) >= 32 ? 24 : (q?.maxAtmosphere ?? 32) >= 16 ? 16 : 8; }
  function recycle() { const e = impacts.shift(); if (e && pool.length < 24) pool.push(e); }
  function hit(target, o, q) {
    const length = Math.hypot(o.x, o.y) || 1, dx = o.x / length, dy = o.y / length;
    const previous = reactions.get(target), now = o.clock;
    // A crowd or a rapid multi-hit spell cannot amplify sprite displacement.
    reactions.set(target, { at: now, x: dx, y: dy, crit: !!o.crit });
    if (previous && now - previous.at < .045) return;
    while (impacts.length >= limit(q)) recycle();
    const e = pool.pop() || {};
    Object.assign(e, { x: target.x, y: target.y, at: now, dx, dy,
      color: o.color || '#ffe0aa', crit: !!o.crit, height: o.height || 45,
      life: o.crit ? .26 : .18 });
    impacts.push(e);
  }
  function reaction(target, clock, project) {
    const r = reactions.get(target);
    if (!r) return { x: 0, y: 0, rotation: 0 };
    const age = clock - r.at;
    if (age < 0 || age >= .16) { reactions.delete(target); return { x: 0, y: 0, rotation: 0 }; }
    const d = project(r.x, r.y), length = Math.hypot(d.x, d.y) || 1;
    const beat = Math.sin(age / .16 * Math.PI) * (r.crit ? 4.5 : 2.7);
    return { x: d.x / length * beat, y: d.y / length * beat * .45, rotation: d.x / length * beat * .012 };
  }
  function drawAttack(ctx, o) {
    const p = profiles[o.kind], motion = pose(o);
    if (!p || motion.energy < .03) return;
    const side = (o.direction?.x ?? 1) < 0 ? -1 : 1, h = o.height || 80;
    ctx.save(); ctx.globalAlpha *= motion.energy * .62;
    ctx.translate(side * h * .18, -h * .53);
    ctx.strokeStyle = p.color; ctx.fillStyle = p.color; ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (p.style === 'slash' || p.style === 'dagger') {
      const n = p.style === 'dagger' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        ctx.moveTo(-side * 10, -14 + k * 6);
        ctx.quadraticCurveTo(side * 20, -5 + k * 6, side * 5, 15 + k * 6);
      }
    } else if (p.style === 'string') {
      ctx.moveTo(side * 7, -14); ctx.lineTo(-side * (3 + motion.energy * 6), 0); ctx.lineTo(side * 7, 14);
    } else if (p.style === 'shield') {
      ctx.moveTo(-9,-12);ctx.lineTo(9,-12);ctx.lineTo(11,4);ctx.lineTo(0,13);ctx.lineTo(-11,4);ctx.closePath();
    } else if (p.style === 'flame') {
      for (let k = 0; k < 3; k++) {ctx.moveTo(k*5-6,7);ctx.quadraticCurveTo(k*5-9,-4,k*4-4,-15-motion.energy*4);}
    } else {
      ctx.ellipse(0,0,p.style==='halo'?13:9,p.style==='halo'?5:9,motion.progress*1.5,0,Math.PI*2);
      if (p.style === 'rune') {ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.moveTo(0,-12);ctx.lineTo(0,12);}
    }
    ctx.stroke();ctx.restore();
  }
  function draw(ctx, s) {
    const cap = limit(s.quality), budget = (s.quality?.maxAtmosphere ?? 32) * 2;
    while (impacts.length > cap) recycle();
    let particles = 0, drawn = 0;
    for (let i = impacts.length - 1; i >= 0; i--) {
      const e = impacts[i], t = (s.clock - e.at) / e.life;
      if (t >= 1 || t < 0) { const [gone] = impacts.splice(i,1); if (pool.length < 24) pool.push(gone); continue; }
      if (!s.visiblePoint(e.x,e.y,70)) continue;
      const count = Math.min(budget - particles, (s.quality?.maxAtmosphere ?? 32) >= 32 ? 5 : (s.quality?.maxAtmosphere ?? 32) >= 16 ? 3 : 1);
      particles += count; drawn++;
      const paint = ()=>s.billboard(e.x,e.y,()=>{
        ctx.save();ctx.translate(0,-e.height*.5);ctx.globalAlpha=(1-t)*.8;
        ctx.strokeStyle='#11151b';ctx.lineWidth=e.crit?4:3;
        const d=s.projectVector(e.dx,e.dy), a=Math.atan2(d.y,d.x);
        ctx.beginPath();ctx.moveTo(-Math.cos(a)*(5+t*8),-Math.sin(a)*(5+t*8));ctx.lineTo(Math.cos(a)*(5+t*8),Math.sin(a)*(5+t*8));ctx.stroke();
        ctx.strokeStyle=e.color;ctx.lineWidth=e.crit?2:1.3;ctx.stroke();
        if(e.crit){ctx.beginPath();ctx.arc(0,0,4+t*13,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle=e.color;
        for(let k=0;k<count;k++){const angle=a+(k-(count-1)/2)*.48,dist=5+t*(e.crit?25:16);ctx.fillRect(Math.cos(angle)*dist,Math.sin(angle)*dist-4*t,2,2);}
        ctx.restore();
      });
      if(s.isometric)s.sceneItem(e.x+1,e.y+1,paint);else paint();
    }
    lastStats = { particles, drawn };
  }
  function reset() { while(impacts.length) recycle(); reactions = new WeakMap(); lastStats = {particles:0,drawn:0}; }
  window.EmberCombatFeel = Object.freeze({pose,hit,reaction,drawAttack,draw,reset,stats:()=>({...lastStats,queued:impacts.length,pooled:pool.length})});
})();
