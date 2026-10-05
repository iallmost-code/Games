// v74 deep floors: real browser progression, saves, new foes and seeded geometry.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(raw.includes('trackQuality(interval);\n              draw();'),'Auto-quality resize must happen before native painting');
const hooks = `window.deepTest={begin,applyProfile,selectSlot,saveProfile,saveRun,readRun,restoreRun,makeSaveCode,loadSaveCode,renderHeroScreen,renderMenu,levelUp,draw,update,floorEntry,floorSpec,updateDungeon,wallAt,moveAroundWalls,nearbyAlly,newBloodAttack,updateNewBlood,shieldBash,useDash,useUltimate,takeHit,newBloodCards,newBloodEvolutions,newBloodDeath,prototypeCardAllowed,prototypeEvolutionAllowed,evolutionReady,icePlacementAllowed,awardHeroMastery,enhanceEndgameEnemy,damageEnemy,spawnBoss,continueEndless,showVictory,recordEndgameResult,updateEndgame,collectEndgameDrop,setQualityTier,fx,ensureAudio,pauseRun,resumePaused,spawnEnemy,deepWater,updateDeepEnemy,deepEnemyType,deepSlow,descendDeeper,descentFloors,segmentBlocked,updateZoneHazards,visualScene,icePlacementAllowed,drawDeepMarks,
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
    name.endsWith(".js")
      ? "application/javascript"
      : "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const report={maps:0,playthroughs:[],saves:null,mechanics:null,scenes:[],errors:[]},url='http://127.0.0.1:'+server.address().port;
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.getByRole('button',{name:'TAP TO START'}).click({force:true});await page.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();await page.locator('input').fill('Deeper');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
 await page.waitForFunction(()=>deepTest.art.cryptHeart&&deepTest.art['prop-cathedral-column']&&deepTest.art['prop-forge-column']);
 const base=cp.execFileSync('git',['show','dad0e8b:index.html'],{encoding:'utf8'});
 const oldMaps=new Function(base.match(/const descentFloors = (\[[\s\S]*?\n        \]);/)[1].replace(/^/,'return '))();
 assert.deepEqual(await page.evaluate(()=>deepTest.descentFloors.slice(0,5)),oldMaps,'Floors 1–5 authored specs changed');
 report.maps=await page.evaluate(()=>{
   const g=deepTest;let count=0;
   function connected(spec){const cells=new Set();for(const [x,y,w,h]of [...spec.rooms,...spec.links])for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)cells.add(i+','+j);let queue=['5,10'],seen=new Set(queue);for(let k=0;k<queue.length;k++){const [x,y]=queue[k].split(',').map(Number);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(x+dx)+','+(y+dy);if(cells.has(key)&&!seen.has(key)){seen.add(key);queue.push(key);}}}if(seen.size!==cells.size||!seen.has('28,10')||!cells.has('24,9')||!cells.has('24,10'))throw Error('Disconnected floor '+spec.name);}
   for(let floor=6;floor<=10;floor++){connected(g.descentFloors[floor-1]);count++;for(let seed=0;seed<1000;seed++){connected(EmberEndgame.layout(g.descentFloors[floor-1],seed,floor));count++;}}
   return count;
 });
 for(const layouts of [false,true])for(const kind of ['gravecaller','ranger','ember','bloodknight','sunwarden','rogue','frostwarden']){
   await page.evaluate(({kind,layouts})=>{const g=deepTest;g.applyProfile({version:2,migrated:true,embers:400,total:1000,bosses:8,bestFloor:5,ranger:true,ember:true,bloodknight:true,sunwarden:true,rogue:true,frostwarden:true,descentCleared:true,randomLayouts:layouts,selectedTorment:2});g.selectedHero=kind;g.selectedMode='descent';g.begin();g.hero.inv=999;g.spawn=999;},{kind,layouts});
   const floors=[];
   for(let floor=1;floor<=10;floor++){
     const row=await page.evaluate(floor=>{
       const g=deepTest;function check(v,m){if(!v)throw Error(m)};
       check(g.dungeon.floor===floor,'Wrong entry '+floor);check(g.dungeon.elapsed===0,'Entry not fresh');g.dungeon.eventAt=99999;g.hero.inv=999;g.spawn=999;
       check(g.wallAt(24.5*80,10*80,5),'Boss door initially open');g.dungeon.elapsed=180;g.updateDungeon(.025);check(g.dungeon.open&&!g.wallAt(24.5*80,10*80,5),'Timed door');
       g.hero.x=26*80;g.hero.y=800;g.updateDungeon(.025);const boss=g.boss;check(boss&&boss.variant===g.floorSpec().boss,'Wrong boss '+floor);
       let phases=[];if(floor>5){for(const hp of [1,.6,.3]){boss.hp=boss.max*hp;g.updateDeepEnemy(boss,.025);phases.push(boss.deepPhase);}check(phases.join(',')==='1,2,3','Boss phases');}
       const before=g.profile.embers;g.damageEnemy(boss,1e9,'neutral',0,false,false,false);
       if(floor===5||floor===10){g.update(.025);check(g.mode==='victory','Victory missing');check(g.profile.descentCleared,'Clear unlock lost');check(g.profile.bestTorment[g.hero.class]===2,'Torment record');}
       else {check(g.dungeon.stairs,'No stairs '+floor);g.hero.x=g.dungeon.stairs.x;g.hero.y=g.dungeon.stairs.y;g.updateDungeon(.025);check(g.dungeon.floor===floor+1,'Stairs failed');}
       return {floor,boss:boss.variant,phases,reward:g.profile.embers-before};
     },floor);floors.push(row);
     if(floor===5){assert(await page.locator('#descendDeeper').isVisible());await page.locator('#descendDeeper').click();}
   }
   assert(await page.getByText('THE CRYPT IS CLEARED',{exact:true}).isVisible());assert(await page.getByText('CREDITS',{exact:true}).isVisible());
   const record=await page.evaluate(()=>{const g=deepTest;if(g.profile.runHistory[0].floor!==10)throw Error('History capped below 10');const xp=g.profile.mastery[g.hero.class].xp;if(xp!==EmberMastery.earned(10,g.runStats.bosses,g.kills,2))throw Error('Wrong total mastery after both victories');g.awardHeroMastery(true);if(xp!==g.profile.mastery[g.hero.class].xp)throw Error('Double mastery');return{floor:g.profile.runHistory[0].floor,masteryXP:xp,bestFloor:g.profile.bestFloor};});
   report.playthroughs.push({hero:kind,layout:layouts?'random':'classic',torment:2,assistance:'Instant boss damage / arrival teleport / invulnerability; progression and stairs use real game code',floors,...record});
 }
 report.mechanics=await page.evaluate(()=>{
   const g=deepTest;function check(v,m){if(!v)throw Error(m)};
   g.applyProfile({bosses:8,bestFloor:5,ranger:true,ember:true,bloodknight:true,sunwarden:true,descentCleared:true});g.selectedHero='frostwarden';g.selectedMode='descent';g.begin();g.floorEntry(6);g.dungeon.title=0;g.dungeon.eventAt=99999;g.spawn=999;g.enemies=[];
   let water;for(const key of g.dungeon.cells){const [x,y]=key.split(',').map(Number);if(g.deepWater(x*80+40,y*80+40)&&!g.wallAt(x*80+40,y*80+40,16)){water={x:x*80+40,y:y*80+40};break;}}check(water,'No shallow water');
   const enemy={...water,r:10},hero={...water,r:10};g.moveAroundWalls(enemy,10,0,.025,true);g.moveAroundWalls(hero,10,0,.025,false);check(Math.abs(enemy.x-water.x-6.5)<.001&&hero.x-water.x===10,'Enemy-only slow');
   check(!g.icePlacementAllowed(24.5*80,800,0),'Ice blocks boss door');g.dungeon.stairs={x:2280,y:800};check(!g.icePlacementAllowed(2280,800,0),'Ice blocks stairs');
   let kinds=['ghostChoir','drownedKnight','machineGolem','slagSpitter','furnaceImp'];for(const type of kinds){const e=g.spawnEnemy(type);check(e&&e.hp>0&&Number.isFinite(e.hp)&&e.arrivingUntil>g.clock,'Invalid arrival '+type);check(!g.wallAt(e.x,e.y,e.r),'Spawn in wall');check(g.art[type],'Missing art');}
   g.enemies=[];const choir=g.spawnEnemy('ghostChoir');choir.x=500;choir.y=800;choir.arrivingUntil=0;g.hero.x=400;g.hero.y=800;choir.deepCast=0;g.updateDeepEnemy(choir,.025);check(choir.deepMark?.time===.9,'Choir lacks wind-up');
   const hp=g.hero.hp,armor=g.hero.armor;g.hero.inv=1;g.updateDeepEnemy(choir,1);check(g.hero.hp===hp&&g.hero.armor===armor,'Dash invulnerability ignored');
   g.floorEntry(10);g.hero.x=2280;g.hero.y=800;g.spawnBoss('cryptHeart');const heart=g.boss;heart.x=2330;heart.y=800;heart.hp=heart.max*.3;heart.deepCast=0;g.updateDeepEnemy(heart,.025);g.updateDeepEnemy(heart,.6);check(heart.deepPhase===3&&heart.deepMark.pattern==='volley','Final phase missing');g.hero.inv=1;g.updateDeepEnemy(heart,1);check(g.hazards.length>=5,'Final volley absent');
   g.applyProfile({...g.profile,met:[...kinds,'bishop','foundry','cryptHeart']});check(g.profile.met.length===8,'Bestiary discoveries lost on reload');return {bestiarySaved:true,enemyOnlyWater:true,arrivals:kinds,choirWindup:true,invulnerability:true,finalPhases:3,iceNavigationSafe:true};
 });
 report.saves=await page.evaluate(()=>{
   const g=deepTest;function check(v,m){if(!v)throw Error(m)};
   const rows=[];for(let floor=6;floor<=10;floor++){g.floorEntry(floor);const checkpointHP=g.hero.hp;g.dungeon.elapsed=123;g.hero.hp=7;g.saveRun(true);const saved=g.readRun();check(saved.version===12&&saved.floor===floor,'Save bounds');const decoded=g.loadSaveCode(g.makeSaveCode());check(decoded.run.floor===floor&&decoded.profile.version===2,'EC1');g.restoreRun();check(g.dungeon.floor===floor&&g.dungeon.elapsed===0&&g.hero.hp===checkpointHP,'Checkpoint resume '+floor);rows.push(floor);}
   const ember=g.profile.embers,code=g.makeSaveCode();const v11=JSON.parse(localStorage.getItem('ember-crypt-slot-1-run-v12'));v11.version=v11.balanceVersion=11;localStorage.removeItem('ember-crypt-slot-1-run-v12');localStorage.setItem('ember-crypt-slot-1-run-v11',JSON.stringify(v11));g.restoreRun();check(g.readRun().version===12&&g.dungeon.floor===10&&g.profile.embers===ember,'v11 migration');
   const profileA=structuredClone(g.profile);g.slots[1]={...g.slots[0],name:'Other Slot'};localStorage.setItem('ember-crypt-character-slots-v1',JSON.stringify(g.slots));g.selectSlot(1);g.applyProfile({embers:19,bestFloor:1});g.saveProfile();check(!g.readRun(),'Run leaked across slots');g.selectSlot(0);check(g.profile.bestFloor===10&&g.profile.embers===profileA.embers&&g.readRun().floor===10,'Slot0 lost');
   return{runVersion:12,profileVersion:2,checkpoints:rows,code:'EC1',v11Migration:true,slotIsolation:true};
 });

 report.compatibility=await page.evaluate(()=>{
   const g=deepTest;function check(v,m){if(!v)throw Error(m)};
   g.applyProfile({version:2,migrated:true,embers:800,bosses:8,bestFloor:10,ranger:true,ember:true,bloodknight:true,sunwarden:true,descentCleared:true,randomLayouts:true,selectedTorment:3});g.selectedHero='rogue';g.selectedMode='descent';g.begin();
   const results=[];
   for(const floor of [6,7,8,9,10]){
     g.floorEntry(floor);g.dungeon.title=0;g.dungeon.eventAt=99999;g.spawn=999;g.hero.inv=999;g.enemies=[];g.spawn=0;for(let k=0;k<80;k++)g.update(.025);check(Number.isFinite(g.spawn)&&g.enemies.length>1,'Deep autonomous spawn interval '+floor);g.enemies=[];
     g.kills=g.dungeon.startKills+g.floorSpec().goal;g.updateDungeon(.025);check(g.dungeon.open,'Kill-goal door '+floor);
     check(g.dungeon.shop&&g.dungeon.shop.pads.length===3,'No deep merchant');g.run.gold=100;g.hero.hp=g.hero.maxHp*.2;const pad=g.dungeon.shop.pads.find(p=>p.kind==='heal');g.hero.x=pad.x;g.hero.y=pad.y;g.hero.moving=0;for(let i=0;i<60;i++)g.updateEndgame(.025);check(pad.used&&g.run.gold===82,'Deep merchant heal');
     const e=g.spawnEnemy(floor<8?'drownedKnight':'machineGolem');check(e,'No foe for champion');g.enhanceEndgameEnemy(e,true);e.nightChampion='shielded';e.nightName='Deep Champion';g.damageEnemy(e,1e9);check(g.drops.some(d=>d.type==='nightRelic'),'No champion relic');
     if(g.dungeon.secret){const room=g.dungeon.secret;check(!room.revealed,'Secret already open');g.hero.x=room.mouth.x;g.hero.y=room.mouth.y;g.hero.moving=1;g.joy.dx=-1;g.joy.dy=0;g.updateEndgame(.025);check(room.revealed&&g.dungeon.cells.has('-1,9'),'Deep secret failed');g.joy.dx=0;}
     results.push({floor,merchant:true,champion:true,secret:!!g.dungeon.secret});
   }
   const daily=EmberEndgame.daily('2026-10-05');g.pendingDaily=daily;g.selectedHero=daily.hero;g.begin();g.floorEntry(10);check(g.run.daily.seed===daily.seed&&g.run.random,'Daily deep metadata');g.recordEndgameResult(true);check(g.profile.dailyBest[daily.date]>0&&g.profile.runHistory[0].floor===10,'Daily deep record');
   g.selectedHero='rogue';g.begin();g.floorEntry(6);g.hero.x=800;g.hero.y=800;g.hero.faceX=1;g.hero.faceY=0;g.useDash();const choir=g.spawnEnemy('ghostChoir');choir.x=810;choir.y=800;choir.arrivingUntil=0;choir.deepCast=0;g.updateDeepEnemy(choir,.025);check(Math.hypot(choir.deepMark.x-g.hero.decoy.x,choir.deepMark.y-g.hero.decoy.y)<1,'Deep pulse ignores decoy');
   g.hero.decoy=null;g.hero.hp=1;g.hero.armor=0;g.hero.inv=0;g.hero.dashTime=0;choir.deepMark={x:g.hero.x,y:g.hero.y,r:100,time:.01,total:.9,color:'#91e4e5',damage:10000,pattern:'pulse'};g.updateDeepEnemy(choir,.025);check(g.mode==='over','Deep lethal pulse fails game over');check(g.profile.runHistory[0].cause==='GHOST CHOIR','Deep death cause wrong');
   return{floors:results,daily:true,decoyTargeting:true,lethalPulse:true};
 });
 report.actualCodeImport=await page.evaluate(()=>{const g=deepTest;g.selectedHero='frostwarden';g.selectedMode='descent';g.begin();g.floorEntry(10);g.profile.embers=943;g.saveProfile();g.saveRun(true);return g.makeSaveCode();});
 await page.evaluate(()=>{const g=deepTest;g.selectSlot(1);g.renderMenu('settings');});
 await page.locator('textarea[aria-label="Paste save code"]').fill(report.actualCodeImport);await page.getByRole('button',{name:'LOAD',exact:true}).click();await page.getByRole('button',{name:'REPLACE THIS CHARACTER · CONFIRM',exact:true}).click();
 report.actualCodeImport=await page.evaluate(()=>{const g=deepTest;g.restoreRun();if(g.dungeon.floor!==10||g.hero.class!=='frostwarden'||g.profile.embers!==943)throw Error('Actual deep EC1 import');g.selectSlot(0);g.profile.embers++;g.saveProfile();g.selectSlot(1);if(g.profile.embers!==943)throw Error('Imported slots share data');g.restoreRun();return{floor:10,hero:g.hero.class,codes:'EC1',independentSlots:true};});
 for(const size of [{width:390,height:844},{width:844,height:390}])for(const floor of [6,7,8,9,10]){
   await page.setViewportSize(size);await page.evaluate(floor=>{const g=deepTest;g.selectedHero='ranger';g.selectedMode='descent';g.begin();g.mode='play';g.floorEntry(floor);g.dungeon.title=0;g.hero.x=1040;g.hero.y=800;g.hero.inv=0;g.dungeon.open=true;for(const type of floor<8?['ghostChoir','drownedKnight']:['machineGolem','slagSpitter','furnaceImp']){const e=g.spawnEnemy(type);if(e){e.x=g.hero.x+80;e.y=g.hero.y+60;}}g.draw();},floor);
   const pixels=await page.evaluate(()=>{deepTest.draw();const c=document.querySelector('canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let seen=new Set();for(let i=0;i<p.length;i+=400)seen.add(p[i]+','+p[i+1]+','+p[i+2]);return seen.size;});assert(pixels>50,'Blank deep floor');
   await page.screenshot({path:'/tmp/deeper-floor-'+floor+'-'+size.width+'.png'});report.scenes.push({floor,...size,pixels});
 }

 const fallbackContext=await browser.newContext({viewport:{width:390,height:844}}),fallback=await fallbackContext.newPage();
 await fallback.route(/(?:deep-enemies|cathedral-props|forge-props)\.webp/,r=>r.abort());
 await fallback.goto(url);await fallback.waitForFunction(()=>deepTest.art.cryptHeart&&deepTest.art['prop-cathedral-column']&&deepTest.art['prop-forge-column']);report.pngFallback=true;await fallbackContext.close();
 report.native=[];
 for(const size of [{width:390,height:844},{width:844,height:390}]){
   const live=await browser.newPage({viewport:size,deviceScaleFactor:3,hasTouch:true});live.on('pageerror',e=>report.errors.push(e.message));
   await live.addInitScript(()=>{localStorage.setItem('ember-crypt-character-slots-v1',JSON.stringify([{name:'Deep Native',lastPlayed:1,playTime:1},null,null]));localStorage.setItem('ember-crypt-active-slot-v1','0');localStorage.setItem('ember-crypt-slot-1-profile',JSON.stringify({version:2,migrated:true,selectedHero:'frostwarden',frostwarden:true,bosses:8,bestFloor:10,descentCleared:true,upgrades:{}}));});
   await live.goto(url+'/native');await live.getByRole('button',{name:'TAP TO START'}).click({force:true});await live.getByRole('button',{name:'PLAY',exact:true}).click();await live.getByRole('button',{name:/^THE DESCENT/}).click();await live.getByRole('button',{name:/^ENTER THE CRYPT/}).click();
   for(const floor of [6,8,10]){
     await live.evaluate(floor=>{deepTest.floorEntry(floor);deepTest.hero.inv=999;deepTest.hero.x=1040;deepTest.hero.y=800;deepTest.hero.ultimateCharge=100;deepTest.dungeon.title=0;deepTest.dungeon.eventAt=99999;},floor);
     await live.keyboard.down('d');await live.locator('#dashButton').tap();await live.waitForTimeout(300);await live.keyboard.up('d');await live.locator('#ultimateButton').tap();await live.waitForTimeout(400);
     const result=await live.evaluate(async()=>{let result;for(let attempt=0;attempt<120;attempt++){const c=document.querySelector('canvas'),g=c.getContext('2d'),pixels=g.getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=400)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);result={floor:deepTest.dungeon.floor,mode:deepTest.mode,pixels:c.width*c.height,colors:colors.size,dome:deepTest.hero.fortressUntil>deepTest.clock,clock:deepTest.clock};if(result.colors>50)return result;await new Promise(requestAnimationFrame);}return result;});assert(result.colors>50&&result.pixels<=1800000&&result.mode==='play'&&result.dome,JSON.stringify(result));report.native.push({...size,...result});
     await live.screenshot({path:'/tmp/deeper-native-'+floor+'-'+size.width+'.png'});
   }await live.close();
 }
 report.zoneMusic=await page.evaluate(async()=>{const ctx=new AudioContext();await ctx.resume();EmberMusic.unlock(ctx);const rows=[];for(const zone of [3,4,3,4]){EmberMusic.update(ctx,{scene:"play",zone,near:12,boss:true,enabled:true});const d=EmberMusic.stats(ctx);if(d.loops>6||d.zone!==zone)throw Error("Deep music bounds");rows.push({zone,loops:d.loops,buffers:d.buffers});}EmberMusic.update(ctx,{scene:"pause"});await ctx.close();return rows;});
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(root,'tests/deeper-crypt-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS v74:',report.maps,'maps,',report.playthroughs.length,'assisted ten-floor playthroughs, foes, phases, water, checkpoints/EC1/slots and',report.scenes.length,'phone scenes');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
