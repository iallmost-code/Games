// v74 deep floors: real browser progression, saves, new foes and seeded geometry.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(raw.includes('trackQuality(interval);\n              draw();'),'Auto-quality resize must happen before native painting');
const hooks = `window.deepTest={adventureState,updateAdventure,adventureHit,equipAdventureLegend,adventureDash,adventureFloor,restoreAdventure,prepareAdventureBoss,adventureChoice,renderAdventureMenu,recordEndgameResult,get pads(){return adventurePads},get seals(){return adventureBossPads},get burns(){return adventureBurns},get arenaHazards(){return adventureHazards},get footprints(){return adventureFootprints},get companions(){return companions},begin,applyProfile,selectSlot,saveProfile,saveRun,readRun,restoreRun,makeSaveCode,loadSaveCode,renderHeroScreen,renderMenu,levelUp,draw,update,floorEntry,floorSpec,updateDungeon,wallAt,moveAroundWalls,nearbyAlly,newBloodAttack,updateNewBlood,shieldBash,useDash,useUltimate,takeHit,newBloodCards,newBloodEvolutions,newBloodDeath,prototypeCardAllowed,prototypeEvolutionAllowed,evolutionReady,icePlacementAllowed,awardHeroMastery,enhanceEndgameEnemy,damageEnemy,spawnBoss,continueEndless,showVictory,recordEndgameResult,updateEndgame,collectEndgameDrop,setQualityTier,fx,ensureAudio,pauseRun,resumePaused,spawnEnemy,deepWater,updateDeepEnemy,deepEnemyType,deepSlow,descendDeeper,descentFloors,segmentBlocked,updateZoneHazards,visualScene,icePlacementAllowed,drawDeepMarks,
get boss(){return boss},get hazards(){return hazards},get spawn(){return spawn},set spawn(v){spawn=v},get hero(){return hero},get profile(){return profile},get run(){return endgameRun},get wave(){return wave},set wave(v){wave=v},get clock(){return clock},set clock(v){clock=v},get dungeon(){return dungeon},get checkpoint(){return floorCheckpoint},get enemies(){return enemies},set enemies(v){enemies=v},get daggers(){return bloodDaggers},get iceWalls(){return iceWalls},set iceWalls(v){iceWalls=v},get shots(){return shots},get drops(){return drops},get joy(){return joy},get mode(){return mode},set mode(v){mode=v},get kills(){return kills},set kills(v){kills=v},get runStats(){return runStats},set selectedHero(v){selectedHero=v},get selectedHero(){return selectedHero},set selectedMode(v){selectedMode=v},set pendingDaily(v){pendingDaily=v},get art(){return art},get slots(){return slots}};`;
const source = raw
  .replace("function sfx(kind) {", "function sfx(kind) { return;")
  .replace("function music(kind) {", "function music(kind) { return;")
  .replaceAll("requestAnimationFrame(frame);", "")
  .replace("      })();", hooks + "\n      })();");
const server = http.createServer((req, res) => {
  const name = new URL(req.url, "http://localhost").pathname;
  if (name === "/" || name === "/live" || name === "/native") {
    res.setHeader("Content-Type", "text/html");
    return res.end(name === "/live" ? raw : name==="/native"?raw.replace("      })();",hooks+"\n      })();"):source);
  }
  const file = path.resolve(root, "." + name);
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    name.endsWith(".html") ? "text/html" : name.endsWith(".js")
      ? "application/javascript"
      : "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const url='http://127.0.0.1:'+server.address().port,report={heroes:[],persistence:null,encounters:null,phones:[],errors:[]};
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.getByRole('button',{name:'TAP TO START'}).click({force:true});await page.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();await page.locator('input').fill('Combat');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
 const begin=async kind=>page.evaluate(kind=>{const g=deepTest;g.applyProfile({version:2,migrated:true,embers:500,total:1000,bosses:8,bestFloor:5,ranger:true,ember:true,bloodknight:true,sunwarden:true,rogue:true,frostwarden:true});g.selectedHero=kind;g.selectedMode='descent';g.begin();g.spawn=999;g.hero.inv=999;g.dungeon.eventAt=99999;},kind);
 for(const kind of Object.keys(await page.evaluate(()=>EmberAdventure.gear))){
  await begin(kind);
  report.heroes.push(await page.evaluate(kind=>{
   const g=deepTest,h=g.hero,check=(v,m)=>{if(!v)throw Error(kind+': '+m)},enemy=(x=450,y=800)=>({x,y,r:14,hp:200,max:200,type:'ghoul',speed:0,attack:999});
   check(g.pads.length===0,'Floor 1 content changed');const bare={damage:h.damage,speed:h.speed,rate:h.rate,maxHp:h.maxHp};g.equipAdventureLegend();check(h.adventure.legend===kind,'Wrong hero item');check(JSON.stringify(bare)===JSON.stringify({damage:h.damage,speed:h.speed,rate:h.rate,maxHp:h.maxHp}),'Gear changed base stats');
   g.clock=100;h.adventure.procAt=0;g.enemies=[];const e=enemy();g.enemies.push(e);
   if(kind==='bloodknight'){e.bleedUntil=120;g.damageEnemy(e,5,'blood',0,true);check(e.x<450,'Bleeding foe was not pulled');}
   if(kind==='ember'){g.damageEnemy(e,5,'fire',0,true);check(g.burns.length===1,'Fire patch absent');const hp=e.hp;g.updateAdventure(.5);check(e.hp<hp,'Patch did no damage');check(Number.isFinite(e.hp),'Patch damage invalid');}
   if(kind==='rogue'){const other=enemy(480);g.enemies.push(other);g.damageEnemy(e,5,'poison',0,true);g.updateAdventure(0);check(other.hp<200,'Returning dagger absent');const hp=other.hp;g.damageEnemy(e,5,'poison',0,true);g.updateAdventure(0);check(other.hp===hp,'Cooldown bypassed');
     h.evolutions.push('nightbloom');h.nightbloomAt=-99;h.adventure.procAt=0;e.hp=1;other.hp=1;const unrelated=enemy(700);g.enemies=[e,other,unrelated];const before=g.kills;g.damageEnemy(e,5,'poison',0,true);g.updateAdventure(0);check(g.kills===before+2&&g.enemies.includes(unrelated)&&unrelated.hp===200,'Ricochet/explosion double-paid death');}
   if(kind==='gravecaller'){e.hp=1;g.damageEnemy(e,2,'shadow',0,true);check(g.companions.some(p=>p.kind!=='wolf'),'Extra skeleton absent');}
   if(kind==='ranger'){g.update(.025);const wolf=g.companions.find(p=>p.kind==='wolf');check(wolf,'Wolf absent');wolf.x=430;wolf.y=800;h.adventure.procAt=0;g.enemies=[e];const hp=e.hp;g.updateAdventure(.025);check(e.hp<hp,'Wolf charge absent');}
   if(kind==='sunwarden'){h.hp=50;h.moving=1;g.updateAdventure(.025);check(g.footprints.length===1,'Healing trail absent');h.moving=0;g.updateAdventure(.5);check(h.hp>50,'Trail failed to heal');}
   if(kind==='frostwarden'){const hp=e.hp;g.adventureDash();check(e.hp<hp,'Dash pulse absent');check(e.frostTime>0,'Dash chill absent');h.x=220;h.y=600;const blocked=enemy(220,535);g.enemies=[blocked];g.adventureDash();check(blocked.hp===200,'Legend pulse hit through wall');}
   check(Object.values(h.adventure.damage).every(Number.isFinite),'Invalid damage ledger');check(Object.values(h.adventure.damage).reduce((a,b)=>a+b,0)<=g.runStats.damage+.001,'Damage ledger overcount');
   g.renderMenu('build');check(g.mode==='paused','Build unpaused');g.renderMenu('pause');
   return {hero:kind,item:EmberAdventure.gear[kind].name,baseStatsPreserved:true};
  },kind));
 }
 await begin('rogue');
 report.encounters=await page.evaluate(()=>{
  const g=deepTest,check=(v,m)=>{if(!v)throw Error(m)};
  g.floorEntry(2);let pad=g.pads[0];check(pad?.kind==='rescue','Rescue room absent');g.hero.hp=40;g.hero.x=pad.x;g.hero.y=pad.y;g.hero.moving=0;const rerolls=g.hero.rerolls;g.updateAdventure(1.3);check(g.hero.rerolls===rerolls+1&&g.hero.hp===60,'Rescue reward');g.updateAdventure(1.3);check(g.hero.rerolls===rerolls+1,'Duplicate rescue');
  g.floorEntry(3);pad=g.pads[0];g.hero.x=pad.x;g.hero.y=pad.y;g.updateAdventure(1.3);check(g.hero.adventure.legend==='rogue','Cache gear absent');
  for(const [floor,variant,kind]of [[6,'bishop','choir'],[8,'foundry','vent']]){g.floorEntry(floor);g.dungeon.open=true;g.spawnBoss(variant);g.boss.x=28*80;g.boss.y=800;g.prepareAdventureBoss();check(g.seals.length===2&&g.seals[0].kind===kind,'Boss seals absent');const p=g.seals[0],hp=g.boss.hp;g.hero.x=p.x;g.hero.y=p.y;g.hero.moving=0;g.updateAdventure(1.2);check(p.done&&g.boss.hp<hp,'Boss interaction failed');const after=g.boss.hp;g.updateAdventure(1.2);check(g.boss.hp===after,'Seal reused');}
  g.floorEntry(10);g.dungeon.open=true;g.spawnBoss('cryptHeart');g.boss.x=28*80;g.boss.y=800;g.hero.x=27*80;g.hero.y=800;g.hero.inv=10;g.updateAdventure(.1);check(g.arenaHazards.length===1,'Heart cue absent');const hp=g.hero.hp;g.updateAdventure(1.5);check(g.hero.hp===hp,'Dash invulnerability ignored');g.clock+=7;g.hero.inv=0;g.hero.armor=0;g.updateAdventure(.01);g.updateAdventure(1.5);check(g.hero.hp<hp,'Arena collapse absent');
  return {rescue:true,legendaryCache:true,bishop:true,foundry:true,heartTelegraph:true,invulnerability:true};
 });
 await begin('bloodknight');
 report.persistence=await page.evaluate(()=>{
  const g=deepTest,check=(v,m)=>{if(!v)throw Error(m)};
  g.equipAdventureLegend();g.hero.adventure.damage.blood=123;g.hero.adventure.picks=['Bloodletting'];g.floorEntry(3);g.saveRun(true);const code=g.makeSaveCode();check(typeof code==='string'&&code.startsWith('EC1.'),'Save code');g.hero.adventure.legend='';g.restoreRun();check(g.hero.adventure.legend==='bloodknight'&&g.hero.adventure.damage.blood===123,'Checkpoint lost gear/ledger');
  g.profile.adventure.provision=1;g.saveProfile();g.applyProfile(JSON.parse(localStorage.getItem('ember-crypt-slot-1-profile')));check(g.profile.adventure.provision===1&&g.profile.adventure.collection.includes('bloodknight'),'Profile lost collection');
  g.recordEndgameResult(false,'Test');const row=g.profile.runHistory[0];check(row.damage.blood===123&&row.legend==='bloodknight','History summary lost');g.applyProfile(g.profile);check(g.profile.runHistory[0].damage.blood===123,'Summary normalization lost');
  const imported=g.loadSaveCode(code);check(imported.profile.adventure.collection.includes('bloodknight')&&imported.run.hero.adventure.legend==='bloodknight','EC1 fields lost');
  g.slots[1]={name:'Isolated',lastPlayed:Date.now(),playTime:0};g.selectSlot(1);check(g.profile.adventure.collection.length===0&&g.profile.adventure.provision===0,'Slot 2 inherited rewards');g.selectSlot(0);check(g.profile.adventure.collection.includes('bloodknight'),'Slot 1 collection lost');
  const saved=g.profile.adventure;g.applyProfile({version:2,embers:73,upgrades:{vigor:2}});check(g.profile.embers===73&&g.profile.upgrades.vigor===2&&g.profile.adventure.collection.length===0,'Legacy defaults');
  check(EmberAdventure.profile({collection:5,equipped:{}}).collection.length===0,'Malformed additive profile');
  check(EmberAdventure.state(null,'rogue').legend==='','Null state');
  check(EmberAdventure.state({legend:'rogue',damage:{fire:-1,bogus:500}},'ember').legend==='','Cross-hero item accepted');
  g.applyProfile({version:2,adventure:{collection:['bloodknight'],equipped:['bloodknight'],provision:1}});g.selectedHero='bloodknight';g.selectedMode='endless';g.begin();check(g.hero.adventure.legend==='bloodknight'&&g.hero.rerolls===1&&g.profile.adventure.provision===0,'Packed item/provision not used in Endless');
  g.applyProfile({version:2,adventure:{collection:['bloodknight'],equipped:['bloodknight'],provision:1}});g.pendingDaily=EmberEndgame.daily();g.begin();check(!g.hero.adventure.legend&&g.profile.adventure.provision===1,'Daily fairness');
  return {checkpoint:true,profileV2:true,EC1:true,legacyDefaults:true,history:true,slotIsolation:true};
 });
 await page.evaluate(()=>deepTest.renderMenu('hub'));await page.screenshot({path:'/tmp/v75-camp.png'});assert(await page.getByText('THE LAST SAFE FIRE',{exact:true}).isVisible());await page.getByRole('button',{name:'CAMP QUARTERMASTER',exact:true}).click();assert(await page.getByText('CAMP QUARTERMASTER',{exact:true}).first().isVisible());
 // Real native canvas, projected controls, high-DPR budget, both orientations.
 for(const [width,height,dpr]of [[390,844,3],[844,390,3],[844,360,3],[1440,3200,3]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:true});const native=await context.newPage();native.on('pageerror',e=>report.errors.push(e.message));await native.goto(url+'/native');
  await native.evaluate(()=>{const g=deepTest;g.slots[0]={name:'Phone',lastPlayed:Date.now(),playTime:0};g.selectSlot(0);g.selectedHero='ember';g.begin();g.spawn=999;g.hero.inv=999;document.querySelector('.menu-shell')?.classList.add('hidden');});
  await native.waitForFunction(()=>{const c=document.querySelector('canvas');const px=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<px.length;i+=400)if(px[i]+px[i+1]+px[i+2]>110)n++;return n>80;});
  const result=await native.evaluate(()=>{const c=document.querySelector('canvas');return {pixels:c.width*c.height,rendered:true,extraButtons:!!document.querySelector('#legendButton')};});assert(result.pixels<=1800000);assert(!result.extraButtons);if(width===390||height===390)await native.screenshot({path:'/tmp/v75-phone-'+width+'.png'});report.phones.push({width,height,dpr,...result});await context.close();
 }
 const fallback=await browser.newPage();await fallback.route('**/assets/adventure/combat-loot.js',r=>r.abort());await fallback.goto(url);await fallback.evaluate(()=>{const g=deepTest;g.slots[0]={name:'Fallback',lastPlayed:Date.now(),playTime:0};g.selectSlot(0);g.begin();g.draw();if(!g.hero||!Number.isFinite(g.hero.hp))throw Error('Optional module failure broke gameplay');});await fallback.close();
 const offlineContext=await browser.newContext();const offline=await offlineContext.newPage();await offline.goto(url+'/live');await offline.evaluate(async()=>{await navigator.serviceWorker.register("/sw.js");const r=await navigator.serviceWorker.ready;if(!r.active)throw Error('Offline worker inactive');});await offline.reload();await offline.waitForFunction(()=>!!navigator.serviceWorker.controller);await offlineContext.setOffline(true);await offline.reload();assert(await offline.getByRole('button',{name:'TAP TO START'}).isVisible());await offlineContext.close();report.offlineShell=true;report.optionalModuleFallback=true;
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(root,'tests/combat-loot-results.json'),JSON.stringify(report,null,2));console.log('PASS v75 legends, boss seals, exploration, ledger, checkpoint/EC1/defaults, build/camp and four native phone views');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
