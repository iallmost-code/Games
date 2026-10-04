// Run with Playwright installed: node tests/bloodknight.cjs
// BROWSER_PATH may select a local Chromium. Game code is instrumented only in-memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const http = require('node:http');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Function(m[1]);
const hooks = `window.gameTest={begin,set selectedMode(v){selectedMode=v},selectSlot,applyProfile,saveProfile,restoreRun,readRun,saveRun,makeSaveCode,loadSaveCode,levelUp,renderMenu,renderHeroScreen,damageEnemy,swingBlade,updateBloodknight,update,draw,spawnEnemy,evolutionReady,juggernautActive,showBestiary,facingArt,wallAt,
get hero(){return hero},get profile(){return profile},get enemies(){return enemies},set enemies(v){enemies=v},get shots(){return shots},get art(){return art},get effects(){return bloodEffects},get keys(){return keys},get joy(){return joy},get clock(){return clock},set clock(v){clock=v},get mode(){return mode},set mode(v){mode=v},get level(){return level},set level(v){level=v},get kills(){return kills},get runStats(){return runStats},get attack(){return attack},set attack(v){attack=v},get selectedHero(){return selectedHero},set selectedHero(v){selectedHero=v},set spawn(v){spawn=v},get slots(){return slots}};`;
const testSource = source.replace('function sfx(kind) {', 'function sfx(kind) { return;').replaceAll('requestAnimationFrame(frame);', '').replace('      })();', hooks+'\n      })();');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]);
  if (name === '/') { res.setHeader('Content-Type','text/html'); res.end(testSource); return; }
  const file = path.join(root,name);
  if (!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) { res.writeHead(404);res.end();return; }
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{let state=101;Math.random=()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.getByRole('button',{name:'TAP TO START'}).click({force:true});
  await page.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();
  await page.locator('input').fill('Knight');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
  const result=await page.evaluate(()=>{
    const g=gameTest;function check(condition,message){if(!condition)throw Error(message);}
    function reset(kind='bloodknight'){g.selectedMode='endless';g.selectedHero=kind;g.begin();g.enemies=[];g.spawn=999;g.hero.critChance=0;}
    function enemy(x,y,type='runner',hp=1000){const e={x,y,type,hp,max:hp,r:10,speed:0,attack:99,faceX:0,faceY:1};g.enemies.push(e);return e;}
    // Pre-existing profiles retain progress and unlock from the existing cumulative boss count.
    g.applyProfile({embers:117,total:400,bosses:3,storm:true,upgrades:{power:2},bestDepth:{mage:4,storm:2}});
    check(g.profile.bloodknight&&g.profile.embers===117&&g.profile.bestDepth.mage===4&&g.profile.bestDepth.bloodknight===0,'Legacy profile migration');
    g.applyProfile({bosses:2,bestDepth:{mage:3}});g.selectedHero='bloodknight';g.renderHeroScreen();
    check(document.querySelector('#menuPage').textContent.includes('Defeat 3 bosses total · 2/3'),'Locked condition');
    check(document.querySelector('.menu-actions button').disabled,'Locked hero can start');
    reset('mage');const boss=enemy(30,0,'boss',1);boss.variant='warden';g.damageEnemy(boss,10,'blood');check(g.profile.bloodknight&&g.profile.bosses===3,'Third boss unlock');
    g.profile.upgrades={};reset();check(g.hero.hp===140&&g.hero.armor===45&&g.hero.speed===207&&g.hero.damage>24&&g.hero.range===95&&g.hero.baseRate===.55,'Base stats');
    g.hero.moving=1;g.hero.faceX=1;g.hero.faceY=0;
    const front=enemy(70,0),edge=enemy(22,72),behind=enemy(-70,0),far=enemy(130,0);
    g.swingBlade();check(front.hp<1000&&edge.hp<1000&&behind.hp===1000&&far.hp===1000,'Arc geometry');check(!g.shots.length,'Blade produced a projectile');
    g.hero.projectiles=2;g.swingBlade();check(behind.hp<1000,'Twin Flame rear sweep');
    reset();const left=enemy(-50,0);g.swingBlade();check(left.hp<1000&&g.hero.faceX<0,'Standing autoaim');
    reset();g.hero.crimsonThirst=1;g.hero.bloodletting=1;g.hero.hp=50;g.hero.moving=1;g.hero.faceX=1;g.hero.faceY=0;
    for(let i=0;i<8;i++)enemy(60,i*2);g.swingBlade();check(g.hero.hp===54,'Heal cap per swing');check(g.enemies.every(e=>e.bleedUntil===3),'Bleed application');
    function pick(name){for(let i=0;i<150;i++){g.level=5;g.levelUp();const button=[...document.querySelectorAll('#choices .choice')].find(b=>b.querySelector('span')?.textContent===name);if(button){button.click();return;}}throw Error('Card not offered: '+name);}
    reset();pick('Quick Hands');pick('Long Reach');pick('Twin Flame');check(Math.abs(g.hero.rate-.55/1.1)<.0001&&g.hero.range===120&&g.hero.projectiles===2,'Shared melee card effects');
    pick('Stone Skin');pick('Stone Skin');pick('Stone Skin');check(g.hero.stoneSkin===3&&g.hero.maxArmor===105&&g.hero.armorBonus===60,'Stone Skin ranks');
    reset();g.hero.crimsonThirst=1;g.hero.bloodletting=1;g.hero.hp=50;g.hero.moving=1;g.hero.faceX=1;g.hero.faceY=0;for(let i=0;i<8;i++)enemy(60,i*2);g.swingBlade();
    const hpBefore=g.enemies[0].hp;g.update(.5);check(g.enemies[0].hp<hpBefore,'Bleed tick');
    reset();g.hero.berserk=true;g.hero.hp=70;const berserk=enemy(50,0);g.damageEnemy(berserk,40,'blood');check(berserk.hp===950,'Missing-health damage scaling');
    reset();g.hero.bloodPact=true;g.hero.hp=100;g.clock=20;g.updateBloodknight(.025);check(g.hero.hp===90&&g.hero.pactUntil===26&&g.hero.pactNext===40,'Pact trigger and cooldown');
    g.attack=0;g.update(.025);check(Math.abs(g.attack-.55/1.4)<.0001,'Pact swing speed');g.clock=26;g.attack=0;g.update(.025);check(Math.abs(g.attack-.55)<.0001,'Pact expires');
    reset();g.hero.shockwave=true;g.hero.swingCount=3;g.hero.moving=1;g.hero.faceX=1;g.hero.faceY=0;const wave=enemy(150,0);g.swingBlade();check(wave.hp<1000&&g.effects.some(e=>e.kind==='wave'),'Fourth-swing shockwave');
    reset();g.hero.earthSpikes=2;const cluster=[enemy(110,0),enemy(115,8),enemy(118,-8)];g.updateBloodknight(.025);check(cluster.every(e=>e.hp<1000),'Cluster spikes');
    reset();g.hero.quakeStep=1;const tremble=enemy(40,0);g.updateBloodknight(1);check(tremble.hp===1000,'Idle Quake Step');g.hero.moving=1;g.updateBloodknight(1);check(tremble.hp<1000,'Moving Quake Step');
    reset();g.hero.bloodletting=1;g.hero.fairies=['blood'];check(g.evolutionReady('crimson'),'Crimson requirements');g.hero.evolutions=['crimson'];g.hero.hp=70;const victim=enemy(40,0,'runner',1),neighbor=enemy(60,0);g.damageEnemy(victim,2,'blood');check(g.hero.hp===72&&neighbor.hp<1000,'Crimson kill wave and heal');
    reset();g.hero.evolutions=['crimson'];g.hero.hp=50;g.attack=999;const bleeding=enemy(40,0,'runner',1);bleeding.bleedUntil=3;bleeding.bleedPower=2;bleeding.bleedTick=0;const bloodNeighbor=enemy(0,-30);g.update(.025);check(g.hero.hp===52&&bloodNeighbor.hp<1000,'Bleed kills trigger Crimson Tide');
    reset();g.hero.shockwave=true;g.hero.earthSpikes=1;check(!g.evolutionReady('tremor'),'Tremor too early');g.hero.earthSpikes=2;check(g.evolutionReady('tremor'),'Tremor requirements');g.hero.evolutions=['tremor'];g.hero.swingCount=4;const stunned=enemy(-120,0);g.swingBlade();check(stunned.hp<1000&&stunned.stunUntil===.7,'Fifth-swing earthquake');
    reset();g.hero.stoneSkin=2;g.hero.berserk=true;check(!g.evolutionReady('juggernaut'),'Juggernaut too early');g.hero.stoneSkin=3;check(g.evolutionReady('juggernaut'),'Juggernaut requirements');g.hero.hp=69;g.hero.armor=0;g.hero.lastHit=-99;g.hero.evolutions=['juggernaut'];g.hero.eventSlowUntil=10;g.hero.stunUntil=10;g.joy.dx=1;g.update(.025);check(g.juggernautActive()&&g.hero.eventSlowUntil===0&&g.hero.stunUntil===0&&g.hero.x>0,'Juggernaut immunity');const repaired=g.hero.armor;
    reset();g.hero.stoneSkin=3;g.hero.hp=69;g.hero.armor=0;g.hero.lastHit=-99;g.update(.025);check(Math.abs(repaired/g.hero.armor-3)<.0001,'Juggernaut triple repair');
    // Additive matchups keep old elemental weaknesses.
    reset();let target=enemy(40,0,'ghoul');g.damageEnemy(target,20,'blood');check(target.hp===970,'Blood weakness');target=enemy(40,0,'ghoul');g.damageEnemy(target,20,'fire');check(target.hp===970,'Old fire weakness');target=enemy(40,0,'wraith');g.damageEnemy(target,20,'blood');check(target.hp===990,'Blood resistance');target=enemy(40,0,'wraith');g.damageEnemy(target,20,'earth');check(target.hp===970,'Earth weakness');
    g.showBestiary();check(document.querySelector('#bestiary').textContent.includes('BLOOD')&&document.querySelector('#bestiary').textContent.includes('EARTH'),'Bestiary elements');
    const cards=new Set();for(const kind of ['mage','storm','ember','bloodknight']){reset(kind);for(let n=0;n<100;n++){g.level=5;g.levelUp();for(const button of document.querySelectorAll('#choices .choice')){if(kind==='bloodknight'){check(!/\b(fire|poison|frost|lightning|arcane|shadow)\b/.test(button.className),'Wrong element offered');cards.add(button.querySelector('span')?.textContent);}else check(!/\b(blood|earth)\b/.test(button.className),'Knight card leaked');}}}
    for(const name of ['Bloodletting','Crimson Thirst','Berserk','Blood Pact','Blood Fairy','Stone Skin','Shockwave','Earth Spikes I','Quake Step','Earth Fairy'])check(cards.has(name),'Missing '+name);
    reset();g.hero.earthSpikes=2;g.hero.bloodletting=1;g.hero.swingCount=13;g.clock=44;g.saveRun(true);g.hero.hp=1;g.restoreRun();check(g.hero.hp===140&&g.hero.swingCount===13&&g.hero.earthSpikes===2,'Knight save roundtrip');
    const code=g.makeSaveCode();const imported=g.loadSaveCode(code);check(imported.run.hero.class==='bloodknight'&&imported.run.hero.earthSpikes===2&&imported.profile.bloodknight,'Save-code roundtrip');
    const saved=g.readRun();saved.version=8;saved.balanceVersion=8;localStorage.setItem('ember-crypt-slot-1-run-v10',JSON.stringify(saved));g.restoreRun();check(g.readRun().version===10,'Old run migration');
    reset();g.hero.fairies=['blood','earth'];enemy(70,0);g.update(.025);check(!g.shots.length,'Knight fairies produced projectiles');g.draw();
    return {cards:[...cards],canvas:document.querySelector('canvas').width,repairRatio:repaired/g.hero.armor};
  });
  assert.equal(errors.length,0,errors.join('\n'));
  await page.waitForFunction(()=>gameTest.art['bloodknight-cast']?.cinematic,{timeout:15000});
  await page.evaluate(()=>{gameTest.hero.moving=1;gameTest.hero.faceX=1;gameTest.hero.faceY=0;gameTest.swingBlade();gameTest.draw();});
  const artifact=process.env.ARTIFACT_DIR||'/tmp';fs.mkdirSync(artifact,{recursive:true});await page.screenshot({path:path.join(artifact,'bloodknight-combat.png')});
  assert(await page.evaluate(()=>gameTest.facingArt('bloodknight',-1,0,true)===gameTest.art['bloodknight-cast']));
  // Independent profiles retain their own cumulative unlock progress.
  await page.evaluate(()=>{const g=gameTest;g.hero.bloodletting=1;g.hero.fairies=['blood'];g.level=5;g.levelUp();});
  await page.screenshot({path:path.join(artifact,'bloodknight-upgrades.png')});
  assert(await page.locator('#choices').textContent().then(t=>t.includes('EVOLUTION · CRIMSON TIDE')));
  await page.evaluate(()=>gameTest.renderMenu('slots'));await page.getByRole('button',{name:'SLOT 2 · + NEW CHARACTER',exact:true}).click();await page.locator('input').fill('Mage');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
  assert.equal(await page.evaluate(()=>gameTest.profile.bloodknight),false);
  await page.evaluate(()=>gameTest.selectSlot(0));assert.equal(await page.evaluate(()=>gameTest.profile.bloodknight),true);
  console.log('PASS: melee geometry, heal cap, bleed, Pact, Earth spells, evolutions, matchups, card isolation, legacy saves, slot isolation and real mobile render');
  console.log('Bloodknight cards:',result.cards.join(', '));
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.route('**/bloodknight.webp',route=>route.abort());
  await fallback.goto(`http://localhost:${server.address().port}/`);
  await fallback.waitForFunction(()=>gameTest.art['bloodknight-cast']?.cinematic,null,{timeout:15000});
  console.log('PASS: Bloodknight PNG fallback');await fallback.close();
  if(process.env.BALANCE) {
    const results=[];
    for(const style of ['circle','aggressive']) for(const kind of ['mage','storm','ember','bloodknight']) for(const seed of [17,37,71,113,151]) {
      results.push(await page.evaluate(({style,kind,seed})=>{
        let state=seed;Math.random=()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
        const g=gameTest;g.applyProfile({bosses:3,storm:true,ember:true});g.selectedMode='endless';g.selectedHero=kind;g.begin();
        // Both policies start in the same open corridor and use only movement + offered cards.
        g.hero.x=210;g.hero.y=200;
        const priorities=kind==='bloodknight'?['EVOLUTION','Crimson Thirst','Bloodletting','Stone Skin','Blood Fairy','Shockwave','Earth Spikes','Berserk','Twin Flame','Long Reach','Quake Step','Earth Fairy','Quick Hands','Iron Heart']:['EVOLUTION','Twin Flame','Quick Hands','ARCANE LANCE','Chain Spark','METEOR SIGIL','GRAVE NOVA','Firebrand','Venom Bolts','Fairy','Iron Heart'];
        let decisions=0;
        for(let step=0;step<40*360;step++) {
          if(g.mode==='over'||g.mode==='victory'||g.mode==='error')break;
          if(g.mode!=='play') {
            const buttons=[...document.querySelectorAll('#choices .choice')].filter(b=>!b.disabled);
            if(!buttons.length)break;
            let pick=buttons[0];
            if(g.mode==='upgrade'){
              const rank=b=>priorities.findIndex(p=>b.textContent.toUpperCase().startsWith(p.toUpperCase()));
              pick=buttons.sort((a,b)=>(rank(a)<0?99:rank(a))-(rank(b)<0?99:rank(b)))[0];
            }
            if(g.mode==='trial')pick=buttons.find(b=>b.textContent.startsWith('SANCTUARY'))||pick;
            pick.click();decisions++;continue;
          }
          if(style==='circle'){
            const angle=g.clock*.24;g.joy.dx=Math.cos(angle);g.joy.dy=Math.sin(angle);
          }else{
            let target=null,best=Infinity;
            for(const e of g.enemies){const d=Math.hypot(e.x-g.hero.x,e.y-g.hero.y);if(d<best){best=d;target=e;}}
            if(target){const dx=target.x-g.hero.x,dy=target.y-g.hero.y,d=Math.hypot(dx,dy)||1;
              const close=g.enemies.filter(e=>Math.hypot(e.x-g.hero.x,e.y-g.hero.y)<e.r+50);
              if(close.length&&g.attack>.08){let ax=0,ay=0;for(const e of close){const ex=g.hero.x-e.x,ey=g.hero.y-e.y,ed=Math.hypot(ex,ey)||1;ax+=ex/ed;ay+=ey/ed;}const ad=Math.hypot(ax,ay)||1;g.joy.dx=ax/ad;g.joy.dy=ay/ad;}
              else if(d>65){g.joy.dx=dx/d;g.joy.dy=dy/d;}
              else if(g.attack<.08){g.joy.dx=0;g.joy.dy=0;}
              else {g.joy.dx=-dy/d;g.joy.dy=dx/d;}
            }else {g.joy.dx=Math.cos(g.clock);g.joy.dy=Math.sin(g.clock);}
          }
          if(Math.hypot(g.joy.dx,g.joy.dy)>.1){
            const desired=Math.atan2(g.joy.dy,g.joy.dx);
            for(const offset of [0,.4,-.4,.8,-.8,1.2,-1.2,1.6,-1.6,2,-2,Math.PI]){
              const a=desired+offset,dx=Math.cos(a),dy=Math.sin(a);
              if(!g.wallAt(g.hero.x+dx*30,g.hero.y+dy*30,g.hero.r)){g.joy.dx=dx;g.joy.dy=dy;break;}
            }
          }
          g.update(.025);
        }
        return {style,kind,seed,seconds:Math.round(g.clock),kills:g.kills,level:g.level,bosses:g.runStats.bosses,mode:g.mode,decisions};
      },{style,kind,seed}));
      console.log('Balance',JSON.stringify(results.at(-1)));
    }
    fs.writeFileSync(path.join(artifact,'bloodknight-balance.json'),JSON.stringify(results,null,2));
  }
  await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
