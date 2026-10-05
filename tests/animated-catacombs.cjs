// Focused presentation integration checks. Game hooks and timing probes exist only
// in this HTTP fixture; production gameplay, saves, and scheduling stay untouched.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const script of source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Function(script[1]);
const heroes = ['gravecaller', 'bloodknight'];
const sizes = [{ width: 390, height: 844 }, { width: 844, height: 390 }];
const errors = [];
const report = { animation: [], scenes: [], compatibility: null, fallbacks: [], native: [], browserErrors: errors };
const hooks = `window.gameTest = { begin, applyProfile, selectSlot, saveProfile,
 update, draw, floorEntry, wallAt, segmentBlocked, spawnEnemy, spawnBoss,
 projectVector, inputVector, drawArtHero, drawGrounded, pauseRun, resumePaused,
 useDash, useUltimate, saveRun, readRun, restoreRun, makeSaveCode, loadSaveCode,
 ensureAudio, sfx, get audioCtx(){return audioCtx}, get clock(){return clock},
 get hero(){return hero}, get art(){return art}, get joy(){return joy},
 get enemies(){return enemies}, set enemies(v){enemies=v}, get dungeon(){return dungeon},
 get mode(){return mode}, set mode(v){mode=v}, get profile(){return profile},
 get effects(){return rpgFx}, get ghosts(){return dashGhosts},
 get viewZoom(){return viewZoom}, get rpgPreview(){return rpgPreview},
 set selectedHero(v){selectedHero=v}, set selectedMode(v){selectedMode=v}, set spawn(v){spawn=v}
};`;
function instrument(live) {
  let s = source;
  if (!live) s = s.replaceAll('requestAnimationFrame(frame);', '');
  if (live) s = s.replace('        function frame(t) {', `
        const originalFixtureDraw = draw;
        window.renderProbe = [];
        draw = function(){ const t = performance.now(); originalFixtureDraw();
          window.renderProbe.push(performance.now()-t); if(window.renderProbe.length>180)window.renderProbe.shift(); };
        function frame(t) {`);
  return s.replace('      })();', hooks + '\n      })();');
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/live') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(instrument(url.pathname === '/live'));
  }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end();
  }
  const ext = path.extname(file);
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.webp': 'image/webp', '.png': 'image/png', '.wav': 'audio/wav' })[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
function initialize(page, muted = true) {
  page.on('pageerror', error => errors.push(error.message));
  return page.addInitScript(muted => {
    localStorage.setItem('ember-crypt-character-slots-v1', JSON.stringify([
      { name: 'Animation Test', lastPlayed: 1, playTime: 60 },
      { name: 'Other Character', lastPlayed: 1, playTime: 60 }, null
    ]));
    localStorage.setItem('ember-crypt-active-slot-v1', '0');
    localStorage.setItem('ember-crypt-slot-1-profile', JSON.stringify({ version: 2, migrated: true, embers: 127, total: 127,
      ranger: true, ember: true, bloodknight: true, sunwarden: true, upgrades: {} }));
    localStorage.setItem('ember-crypt-slot-2-profile', JSON.stringify({ version: 2, migrated: true, embers: 51, total: 51, upgrades: {} }));
    localStorage.setItem('ember-crypt-rpg-preview', '1');
    localStorage.setItem('ember-crypt-muted', muted ? '1' : '0');
  }, muted);
}
async function loaded(page) {
  await page.waitForFunction(() => gameTest.art['gravecaller-cast'] && gameTest.art['bloodknight-cast']);
}
async function start(page, kind, floor = 1) {
  await page.evaluate(({kind, floor}) => {
    const g = gameTest;
    g.selectSlot(0); g.selectedHero = kind; g.selectedMode = 'descent'; g.begin();
    if (floor !== 1) g.floorEntry(floor);
    g.spawn = 999; g.enemies = []; g.dungeon.title = 0; g.hero.inv = 0; g.draw();
  }, {kind, floor});
}
function summary(values) {
  values = [...values].sort((a, b) => a - b);
  return { frames: values.length, medianMs: +values[Math.floor(values.length / 2)].toFixed(2),
    p95Ms: +values[Math.min(values.length - 1, Math.floor(values.length * .95))].toFixed(2), maxMs: +values.at(-1).toFixed(2) };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    const page = await browser.newPage({ viewport: sizes[0], hasTouch: true });
    await initialize(page); await page.goto(url); await loaded(page);
    await page.waitForFunction(() => EmberHeroAnimation.ready('gravecaller') && EmberHeroAnimation.ready('bloodknight'));
    report.animation = await page.evaluate(heroes => {
      const result = [], a = EmberHeroAnimation;
      function check(value, message) { if (!value) throw Error(message); }
      for (const kind of heroes) {
        const hashes = [], baseline = [], extents = [], directions = [];
        for (const [row, direction] of [[0, {x:0,y:1}], [1, {x:1,y:0}], [2, {x:0,y:-1}]]) {
          const rowHashes = [];
          for (let col = 0; col < 6; col++) {
            const options = {kind, height:192, moving:true, phase:(col + .1)*Math.PI/3, direction};
            const selected = a.choose(options);
            check(selected.row === row && selected.col === col, kind + ' walk selector');
            let tile;
            a.draw({save(){},restore(){},scale(){},drawImage(img){tile=img;}}, options);
            const bytes = tile.getContext('2d').getImageData(0,0,tile.width,tile.height).data;
            let hash=2166136261, bottom=-1, x0=999, x1=0, y0=999;
            for (let i=0;i<bytes.length;i++) hash=Math.imul(hash^bytes[i],16777619);
            for (let y=0;y<tile.height;y++) for(let x=0;x<tile.width;x++) if(bytes[(y*tile.width+x)*4+3]>90){bottom=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);}
            rowHashes.push(hash>>>0); baseline.push(bottom); extents.push({row,col,left:x0,right:x1,top:y0,bottom});
            check(bottom>=180 && bottom<tile.height-1, kind+' foot/base grounding');
            check(x0>0 && x1<tile.width-1 && y0>0, kind+' frame cropped at sprite cache edge');
          }
          check(new Set(rowHashes).size===6, kind+' requires six distinct walk frames');
          hashes.push(rowHashes); directions.push({row,frames:6});
        }
        check(Math.max(...baseline)-Math.min(...baseline)<=2, kind+' foot anchor jitter');
        check(a.choose({kind,direction:{x:-1,y:0}}).flip,kind+' left-facing mirrored');
        const duration=kind==='bloodknight'?.24:.18, cast=[],poseExtents=[];
        function inspectPose(options,expected){
          let tile;a.draw({save(){},restore(){},scale(){},drawImage(img){tile=img;}},options);
          const actual=a.diagnostics().lastDraw[kind];check(actual.index===expected,kind+' pose selector draw mismatch');
          const px=tile.getContext('2d').getImageData(0,0,tile.width,tile.height).data;
          let left=999,right=0,top=999,bottom=0;
          for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++)if(px[(y*tile.width+x)*4+3]>90){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          check(left>0&&right<tile.width-1&&top>0&&bottom<tile.height-1,kind+' clipped attack/hit/death frame '+expected);
          if(expected>=27)check(bottom>=187&&bottom<=188,kind+' death frame not grounded: '+expected+' bottom='+bottom);
          poseExtents.push({index:expected,left,right,top,bottom});
        }
        for(let col=0;col<6;col++){
          const selected=a.choose({kind,cast:duration*(1-(col+.1)/6)});
          check(selected.row===3&&selected.col===col,kind+' attack sequence');cast.push(selected.index);
          inspectPose({kind,height:192,cast:duration*(1-(col+.1)/6)},selected.index);
        }
        const hits=[.99,.55,.1].map(hit=>a.choose({kind,hit}));
        check(hits.every((f,i)=>f.row===4&&f.col===i),kind+' hit sequence');
        for(const [i,hit]of [.99,.55,.1].entries())inspectPose({kind,height:192,hit},24+i);
        const deaths=[0,.4,.9].map(deathProgress=>a.choose({kind,dead:true,deathProgress}));
        check(deaths.every((f,i)=>f.row===4&&f.col===i+3),kind+' death sequence');
        const realNow=performance.now;let now=1000;performance.now=()=>now;
        try{a.draw({save(){},restore(){},scale(){},drawImage(){}},{kind,height:192});for(const [i,progress]of [0,.4,.9].entries()){now=1000+progress*650;inspectPose({kind,height:192,dead:true},27+i);}}
        finally{performance.now=realNow;a.draw({save(){},restore(){},scale(){},drawImage(){}},{kind,height:192});}
        result.push({kind,walk:directions,distinctFrameHashes:hashes,footBaseline:[Math.min(...baseline),Math.max(...baseline)],spriteExtents:extents,poseExtents,attackFrames:cast,hitFrames:hits.map(f=>f.index),deathFrames:deaths.map(f=>f.index)});
      }
      check(a.diagnostics().frames===60,'Expected two bounded 30-frame caches');
      return result;
    }, heroes);
    console.log('PASS: six distinct frames in each direction, attack/hit/death selectors, grounded uncropped sprites');

    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const kind of heroes) {
        await start(page, kind);
        const scene = await page.evaluate(({kind,size}) => {
          const g=gameTest; function check(v,m){if(!v)throw Error(kind+': '+m);}
          const start={x:g.hero.x,y:g.hero.y};g.joy.dx=1;g.joy.dy=0;
          for(let i=0;i<18;i++)g.update(1/60);
          g.joy.dx=g.joy.dy=0;g.draw();
          const movement=g.projectVector(g.hero.x-start.x,g.hero.y-start.y);
          check(movement.x>10&&Math.abs(movement.y)<.01,'Projected controls changed');
          check(!g.wallAt(g.hero.x,g.hero.y,g.hero.r),'Hero moved inside collision wall');
          g.spawnBoss('warden');const boss=g.enemies.find(e=>e.type==='boss');boss.x=g.hero.x+85;boss.y=g.hero.y;boss.hp=boss.max*.75;
          g.draw();
          function snapshot(){return JSON.stringify({hero:g.hero,enemies:g.enemies,dungeon:g.dungeon},(key,value)=>value instanceof Set?[...value]:value instanceof Map?[...value]:value);}
          const before=snapshot(), oldRandom=Math.random;
          Math.random=()=>{throw Error('Visual renderer consumed combat RNG');};
          try{for(let i=0;i<6;i++)g.draw();}finally{Math.random=oldRandom;}
          check(snapshot()===before,'Drawing changed gameplay world/state');
          const state=EmberHeroAnimation.diagnostics().lastDraw[kind];
          check(state&&state.row<3,'Authored hero frames not used by game');
          const activeButtons=[...document.querySelectorAll('button')].filter(b=>{
            const s=getComputedStyle(b),r=b.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width&&r.height&&!b.closest('#menuShell.hidden,#panel.hidden');
          }).map(b=>b.id).sort();
          check(activeButtons.join(',')==='dashButton,pauseControl,ultimateButton','Unexpected extra game buttons: '+activeButtons);
          g.enemies=[];g.hero.ultimateCharge=100;check(g.useUltimate(),'Ultimate stopped working');
          const life=g.effects[0]?.life;g.pauseRun();const paused=snapshot();g.update(1);check(snapshot()===paused&&g.effects[0]?.life===life,'Paused world/cosmetic timers advanced');g.resumePaused();
          check(g.mode==='play','Pause resume failed');g.draw();
          return {kind,...size,movement:movement.x,renderPurity:'hero/enemies/dungeon and combat RNG unchanged',controls:activeButtons,paused:'game and cosmetic clocks stop'};
        }, {kind,size});
        report.scenes.push(scene);
        // Capture the walking hero itself, without the Ultimate's crowd of minions.
        await start(page,kind);
        await page.evaluate(()=>{gameTest.joy.dx=1;for(let i=0;i<18;i++)gameTest.update(1/60);gameTest.joy.dx=0;gameTest.draw();});
        await page.screenshot({path:`/tmp/animated-catacombs-${kind}-${size.width}.png`});
        if(process.env.CAPTURE_GIF==='1'&&size.width>size.height){
          const directory=`/tmp/animated-catacombs-${kind}-motion`;fs.mkdirSync(directory,{recursive:true});
          await start(page,kind);
          for(let frame=0;frame<40;frame++){
            await page.evaluate(frame=>{const g=gameTest,dirs=[[1,0],[0,-1],[-1,0],[0,1]],d=dirs[Math.floor(frame/10)];g.joy.dx=d[0];g.joy.dy=d[1];g.update(.05);g.draw();},frame);
            await page.screenshot({path:path.join(directory,String(frame).padStart(3,'0')+'.png')});
          }
        }
      }
    }
    console.log('PASS: both target heroes/orientations, projected controls, boss health, renderer purity, existing controls, pause/Ultimate');

    report.compatibility = await page.evaluate(() => {
      const g=gameTest;function check(v,m){if(!v)throw Error(m);}
      g.selectSlot(0);g.selectedHero='bloodknight';g.selectedMode='descent';g.begin();g.floorEntry(2);g.dungeon.title=0;g.hero.relics=['obsidian'];g.hero.depth=3;g.saveRun(true);
      const saved=g.readRun(), code=g.makeSaveCode(), parsed=g.loadSaveCode(code);
      check(saved.version===11&&saved.balanceVersion===11&&parsed.version===1&&parsed.profile.version===2,'Save versions changed');
      check(parsed.run.hero.class==='bloodknight'&&parsed.run.floor===2&&parsed.run.hero.depth===3,'Save code lost hero/floor/depth');
      check(!/EmberHeroAnimation|deathStarted|renderProbe|sceneQueue|ashScene/.test(JSON.stringify(saved)),'Presentation cache serialized');
      const slot1=localStorage.getItem('ember-crypt-slot-1-run-v11');
      g.selectSlot(1);check(g.profile.embers===51&&!g.readRun(),'Slot isolation failed');
      g.selectedHero='gravecaller';g.selectedMode='endless';g.begin();g.hero.ultimateCharge=72;g.saveRun(true);
      check(localStorage.getItem('ember-crypt-slot-1-run-v11')===slot1,'Another slot run overwritten');
      g.restoreRun();check(g.hero.class==='gravecaller'&&g.hero.ultimateCharge===72,'Endless resume state lost');
      g.selectSlot(0);check(g.profile.embers===127,'Original profile currency overwritten');g.restoreRun();
      check(g.hero.class==='bloodknight'&&g.dungeon.floor===2&&g.dungeon.elapsed===0,'Floor checkpoint resume changed');
      let calls=0;const c=document.createElement('canvas');c.width=c.height=160;const ctx=c.getContext('2d');
      const original=ctx.drawImage.bind(ctx);ctx.drawImage=(...a)=>{calls++;original(...a);};
      for(const floor of [2,3,4,5]){g.floorEntry(floor);EmberAsh.ground(ctx,{isDescent:true,isometric:true,dungeon:g.dungeon,hero:g.hero});}
      check(calls===0,'Ash decoration leaked onto other floors');
      EmberAsh.ground(ctx,{isDescent:false,isometric:true,floor:1,hero:g.hero});
      EmberAsh.ground(ctx,{isDescent:true,isometric:false,floor:1,hero:g.hero});check(calls===0,'Ash decoration leaked into Endless/Classic');
      return {formats:'v2 profile / v11 run / EC1 code preserved',slots:'independent profiles, run, currencies',resumes:'Descent entry checkpoint and Endless charge preserved',ashScoping:'Floor 1 Isometric Descent only'};
    });
    console.log('PASS: versioned saves/code, independent slots/currency, both resume modes, Floor 1-only decoration');

    // Real browser media fallback, including helper scripts disappearing entirely.
    for (const fallback of ['webp', 'media', 'helpers']) {
      const p=await browser.newPage({viewport:sizes[1],hasTouch:true});await initialize(p,false);
      const png=[];
      p.on('request',r=>{if(/(?:animation|ash-props)\.png/.test(r.url()))png.push(new URL(r.url()).pathname);});
      await p.route('**/assets/**',route=>{
        const file=new URL(route.request().url()).pathname;
        const isMedia=/-animation\.(webp|png)$|\/ash-props\.(webp|png)$|\/audio\/.*\.wav$/.test(file);
        const isHelper=/\/(hero-animation|ash-environment|combat-audio)\.js$/.test(file);
        if(fallback==='webp'&&/-animation\.webp$|\/ash-props\.webp$/.test(file)||fallback==='media'&&isMedia||fallback==='helpers'&&(isMedia||isHelper))return route.fulfill({status:404,body:''});
        return route.continue();
      });
      await p.goto(url);await loaded(p);await start(p,'bloodknight');
      if(fallback==='webp')await p.waitForFunction(()=>EmberHeroAnimation.ready('gravecaller')&&EmberHeroAnimation.ready('bloodknight'));
      else if(fallback==='media')await p.waitForTimeout(150);
      await p.mouse.click(170,220);
      const result=await p.evaluate(async fallback=>{
        const g=gameTest;if(g.audioCtx)await window.EmberAudio?.ensure(g.audioCtx);
        let legacyNodes=0;const ctx=g.audioCtx;if(ctx){const old=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{legacyNodes++;return old();};}
        g.sfx('hurt');const legacyHurtNodes=legacyNodes;g.draw();g.joy.dx=1;g.update(.025);g.joy.dx=0;g.draw();
        if(g.mode!=='play'||g.wallAt(g.hero.x,g.hero.y,g.hero.r))throw Error('Fallback play failed');
        if(fallback==='webp'&&!EmberHeroAnimation.ready('bloodknight'))throw Error('PNG animation unavailable');
        if(fallback!=='webp'&&window.EmberHeroAnimation?.ready('bloodknight'))throw Error('Missing media unexpectedly ready');
        if(fallback!=='webp'&&legacyHurtNodes!==1)throw Error('Legacy oscillator fallback missing: '+JSON.stringify({fallback,legacyHurtNodes,contextState:ctx?.state,audioStats:window.EmberAudio?.stats(ctx)}));
        return {fallback,animationReady:!!window.EmberHeroAnimation?.ready('bloodknight'),legacyAudioNodes:legacyHurtNodes,mode:g.mode};
      },fallback);
      if(fallback==='webp')assert(png.some(p=>p.includes('gravecaller'))&&png.some(p=>p.includes('bloodknight'))&&png.some(p=>p.includes('ash-props')),'PNG fallback requests missing');
      report.fallbacks.push({...result,pngRequests:png});await p.close();
    }
    console.log('PASS: WebP → PNG, all new media unavailable, all helper scripts unavailable; existing sprite/audio fallback playable');

    // Native RAF diagnostics, high-density canvas, actual joystick, Dash and Ultimate.
    // These numbers describe Chromium in this workspace, not Android sustained FPS.
    for(const size of sizes)for(const kind of heroes){
      const p=await browser.newPage({viewport:size,deviceScaleFactor:3,hasTouch:true});await initialize(p);await p.goto(url+'/live');await loaded(p);
      await p.waitForFunction(kind=>EmberHeroAnimation.ready(kind),kind);await start(p,kind);
      const joystick=size.width<size.height?await p.locator('#joystick').boundingBox():{x:100,y:260,width:20,height:20};
      const origin={x:joystick.x+joystick.width/2,y:joystick.y+joystick.height/2};
      await p.mouse.move(origin.x,origin.y);await p.mouse.down();await p.mouse.move(origin.x+49,origin.y);
      await p.waitForTimeout(450);
      const actualJoystick=await p.evaluate(()=>({joy:gameTest.joy,mode:gameTest.mode}));
      assert(actualJoystick.joy.id!==null&&actualJoystick.joy.dx>.9,'Actual joystick did not engage: '+JSON.stringify({kind,size,origin,...actualJoystick}));
      await p.mouse.up();assert(await p.evaluate(()=>gameTest.joy.id===null&&gameTest.joy.dx===0),'Joystick release failed');
      await p.locator('#dashButton').tap();await p.evaluate(()=>gameTest.hero.ultimateCharge=100);await p.locator('#ultimateButton').tap();
      assert(await p.evaluate(()=>gameTest.hero.ultimateCharge<100&&gameTest.mode==='play'),'Actual skill buttons failed');
      await p.evaluate(()=>{window.renderProbe=[];});await p.waitForFunction(()=>renderProbe.length>=60);
      const timings=await p.evaluate(()=>renderProbe.slice(0,60));report.native.push({kind,...size,deviceScaleFactor:3,...summary(timings),pixels:await p.locator('#view').evaluate(c=>c.width*c.height)});
      await p.screenshot({path:`/tmp/animated-catacombs-native-${kind}-${size.width}.png`});await p.close();
    }
    const high=await browser.newPage({viewport:{width:1440,height:3200},deviceScaleFactor:3});await initialize(high);await high.goto(url);await loaded(high);await start(high,'bloodknight');
    const pixels=await high.locator('#view').evaluate(c=>c.width*c.height);assert(pixels<=1800000,'High-resolution render budget exceeded');
    report.pixelBudget={cssWidth:1440,cssHeight:3200,deviceScaleFactor:3,pixels};await high.close();
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(root,'tests/animated-catacombs-results.json'),JSON.stringify(report,null,2)+'\n');
    console.log('PASS: native frame loop and joystick/skill controls, high-density mobile render diagnostics, bounded high-resolution pixels, no browser errors');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
