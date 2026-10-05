// Browser integration: real game update/draw, assisted health/damage and deterministic joystick paths.
// NODE_PATH=<Playwright installation> node tests/descent.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const source=require('./classic-camera-fixture.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('function music(kind) {','function music(kind) { return;'));
for(const m of source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);
const hooks=`window.gameTest={begin,continueEndless,endlessTier,selectSlot,applyProfile,saveProfile,restoreRun,readRun,saveRun,makeSaveCode,loadSaveCode,renderMenu,damageEnemy,swingBlade,update,draw,spawnEnemy,spawnBoss,spawnTreasureImp,spawnWaveSurprise,spawnCasterAmbush,spawnDungeonEvent,updateDungeon,wallAt,moveAroundWalls,segmentBlocked,tipOnce,floorEntry,
get hero(){return hero},get profile(){return profile},get enemies(){return enemies},set enemies(v){enemies=v},get shots(){return shots},set shots(v){shots=v},get hazards(){return hazards},set hazards(v){hazards=v},get dungeon(){return dungeon},get checkpoint(){return floorCheckpoint},get joy(){return joy},get clock(){return clock},set clock(v){clock=v},set waveClock(v){waveClock=v},get mode(){return mode},set mode(v){mode=v},get level(){return level},get kills(){return kills},set kills(v){kills=v},get selectedHero(){return selectedHero},set selectedHero(v){selectedHero=v},get runMode(){return runMode},set selectedMode(v){selectedMode=v},get slots(){return slots},set spawn(v){spawn=v}};`;
const instrumented=source.replace('function sfx(kind) {','function sfx(kind) { return;').replaceAll('requestAnimationFrame(frame);','').replace('      })();',hooks+'\n      })();');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);if(name==='/live'){res.setHeader('Content-Type','text/html');return res.end(source);}if(name==='/'){res.setHeader('Content-Type','text/html');return res.end(instrumented);}const file=path.join(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://localhost:${server.address().port}`);await page.getByRole('button',{name:'TAP TO START'}).click({force:true});await page.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();await page.locator('input').fill('Delver');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
 await page.waitForFunction(()=>gameTest.hero&&gameTest.dungeon);
 const mechanics=await page.evaluate(()=>{
  const g=gameTest;function check(v,m){if(!v)throw Error(m);}
  g.spawn=999;g.joy.dx=1;g.update(.05);g.update(.05);check(document.querySelector('#firstRunTip').textContent==='Drag the joystick to move. Attacks are automatic.'&&!document.querySelector('#firstRunTip').hidden,'Move tip');g.joy.dx=0;for(let i=0;i<82;i++)g.update(.05);check(document.querySelector('#firstRunTip').hidden&&g.clock>4,'Tip timer pauses game or fails to hide');
  check(g.runMode==='descent' &&g.dungeon.floor===1,'Default mode');
  check(g.wallAt(80,800,14)&&!g.wallAt(400,800,14),'Bounded map');
  g.hero.x=1880;g.hero.y=800;g.moveAroundWalls(g.hero,60,0,.05);check(g.hero.x===1880,'Locked boss door');
  g.hero.x=400;g.hero.y=800;
  for(let i=0;i<100;i++){const e=g.spawnEnemy();check(e&&!g.wallAt(e.x,e.y,e.r),'Spawn in wall');check(Math.abs(e.x-g.hero.x)>260||Math.abs(e.y-g.hero.y)>487,'Visible enemy spawn');}
  g.enemies=[];g.spawn=999;g.hero.x=220;g.hero.y=640;const enemy={x:220,y:540,r:10,hp:1000,max:1000,type:'ghoul',speed:0,attack:99};g.enemies=[enemy];g.hero.class='bloodknight';g.hero.range=120;g.hero.moving=1;g.hero.faceX=0;g.hero.faceY=-1;g.swingBlade();check(enemy.hp===1000,'Bloodknight hits through wall');
  g.shots=[{x:220,y:575,vx:0,vy:-500,life:1,damage:100}];g.hazards=[{x:220,y:575,vx:0,vy:-500,life:1,damage:100}];g.update(.05);check(!g.shots.length&&!g.hazards.length,'Projectile wall collision');
  g.begin();g.kills=g.dungeon.startKills+100;g.updateDungeon(.05);check(g.dungeon.open,'Kill goal door');
  g.begin();g.updateDungeon(179.9);check(!g.dungeon.open,'Door too early');g.updateDungeon(.1);check(g.dungeon.open,'Timer door');
  g.floorEntry(3);g.hero.hp=2;g.hero.x=1100;g.kills+=10;g.saveRun(true);const saved=g.readRun();check(saved.version===11&&saved.floor===3&&saved.floorCheckpoint.floor===3,'Floor v11 save');g.restoreRun();check(g.dungeon.floor===3&&g.dungeon.elapsed===0&&g.hero.x===400&&g.hero.hp!==2,'Continue floor entry');
  const code=g.makeSaveCode(),decoded=g.loadSaveCode(code);check(decoded.run.version===11&&decoded.run.floor===3,'v11 save code');
  g.selectedMode='endless';g.begin();g.hero.hp=73;g.hero.x=-500;g.saveRun(true);const legacy=g.readRun();legacy.version=9;legacy.balanceVersion=9;delete legacy.runMode;delete legacy.floor;delete legacy.floorCheckpoint;
  localStorage.removeItem('ember-crypt-slot-1-run-v11');localStorage.setItem('ember-crypt-slot-1-run-v9',JSON.stringify(legacy));g.restoreRun();check(g.runMode==='endless'&&!g.dungeon&&g.hero.hp===73&&g.hero.x===-500,'v9 migration changed run');check(g.readRun().version===11&&!localStorage.getItem('ember-crypt-slot-1-run-v9'),'Migration not persisted');
  // Construct a real old EC1 payload with the old run shape/checksum.
  const payload=JSON.parse(atob(code.split('.')[2].replace(/-/g,'+').replace(/_/g,'/')));payload.run=legacy;const json=JSON.stringify(payload);let h=2166136261;for(let i=0;i<json.length;i++){h^=json.charCodeAt(i);h=Math.imul(h,16777619);}const oldCode='EC1.'+(h>>>0).toString(36)+'.'+btoa(json).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  check(g.loadSaveCode(oldCode).run.runMode==='endless','v9 code migration');
  g.begin();g.hero.maxHp=g.hero.hp=1000000;g.clock=600;g.update(.05);const heart=g.enemies.find(e=>e.variant==='heart');check(heart,'Endless wave 20 Heart');g.damageEnemy(heart,1e9);g.update(.05);check(g.mode==='victory','Endless victory');g.continueEndless();g.waveClock=690;g.update(.05);check(g.hero.endless&&g.endlessTier()>=1,'Endless tiers');
  g.profile.records.descent.kills=456;g.profile.records.descent.bestDepth.gravecaller=2;g.saveProfile();g.selectedMode='descent';g.begin();check(g.profile.records.endless.kills!==456&&g.profile.records.endless.bestDepth.gravecaller!==2,'Mode records mixed');g.selectedMode='endless';g.begin();g.saveRun(true);
  g.profile.embers=123;g.profile.upgrades={vigor:2};g.profile.tips={move:true};g.saveProfile();
  return {code,oldCode,checks:12};
 });
 await page.evaluate(()=>gameTest.renderMenu('slots'));await page.getByRole('button',{name:'SLOT 2 · + NEW CHARACTER',exact:true}).click();await page.locator('input').fill('Other');await page.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();
 assert(await page.evaluate(()=>gameTest.profile.embers!==123&&!gameTest.profile.tips?.move&&gameTest.dungeon.floor===1));
 await page.evaluate(()=>{gameTest.profile.embers=77;gameTest.saveProfile();gameTest.saveRun(true);gameTest.selectSlot(0);});
 assert(await page.evaluate(()=>gameTest.profile.embers===123&&gameTest.profile.upgrades.vigor===2&&gameTest.profile.tips.move&&gameTest.readRun().runMode==='endless'));
 // Import into slot 2 through the actual Settings controls, leaving slot 1 alone.
 await page.evaluate(()=>{gameTest.selectSlot(1);gameTest.renderMenu('settings');});await page.getByLabel('Paste save code').fill(mechanics.code);await page.getByRole('button',{name:'LOAD',exact:true}).click();await page.getByRole('button',{name:'REPLACE THIS CHARACTER · CONFIRM',exact:true}).click();
 assert(await page.evaluate(()=>gameTest.readRun().floor===3));await page.evaluate(()=>{gameTest.selectSlot(0);gameTest.renderMenu('settings');});await page.getByRole('button',{name:/^RESET TIPS/}).click();assert(await page.evaluate(()=>Object.keys(gameTest.profile.tips).length===0));
 console.log('PASS: syntax, walls, swept projectiles, spawns, both door triggers, floor checkpoint, v9→v11, v9/v11 codes, UI import, slot isolation, Reset Tips');
 const runs=[];
 for(const kind of ['gravecaller','ranger','ember','bloodknight','sunwarden']){
  await page.evaluate(kind=>{const g=gameTest;g.applyProfile({bosses:3,storm:true,ember:true});g.selectedHero=kind;g.selectedMode='descent';g.begin();g.hero.maxHp=g.hero.hp=1000000;g.hero.damage=3000;},kind);
  for(let floor=1;floor<=5;floor++){
   const result=await page.evaluate(({floor,kind})=>{
    const g=gameTest;function check(v,m){if(!v)throw Error(kind+' floor '+floor+': '+m);}
    function tick(){if(g.mode!=='play'){const b=document.querySelector('#choices button.choice');if(b)b.click();else throw Error('Unexpected mode '+g.mode);}g.hero.hp=1000000;g.update(.05);}
    check(g.dungeon.floor===floor,'Floor number');
    // Play floor time with real spawns, attacks, hazards, surprises and level-up choices.
    for(let i=0;i<3650&&!g.dungeon.open;i++){g.joy.dx=Math.cos(i*.008)*.3;g.joy.dy=Math.sin(i*.008)*.3;tick();}
    check(g.dungeon.open,'Door did not open');
    // Walk via authored corridor, using the actual one-thumb movement/collision path.
    const start=Math.floor(g.hero.x/80)+','+Math.floor(g.hero.y/80),goal='26,10',queue=[start],previous=new Map([[start,null]]);
    for(let i=0;i<queue.length&&!previous.has(goal);i++){const [x,y]=queue[i].split(',').map(Number);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(x+dx)+','+(y+dy);if(g.dungeon.cells.has(key)&&!previous.has(key)){previous.set(key,queue[i]);queue.push(key);}}}
    check(previous.has(goal),'Disconnected dungeon');let route=[],cell=goal;while(cell){route.push(cell);cell=previous.get(cell);}route.reverse();
    const waypoints=route.map(key=>key.split(',').map(n=>(Number(n)+.5)*80));
    for(const [x,y]of waypoints){let steps=0;while(Math.hypot(g.hero.x-x,g.hero.y-y)>8&&g.mode!=='victory'&&steps++<1600){const d=Math.hypot(x-g.hero.x,y-g.hero.y);g.joy.dx=(x-g.hero.x)/d;g.joy.dy=(y-g.hero.y)/d;tick();}check(steps<1600,'Could not traverse corridor at '+g.hero.x+','+g.hero.y+' toward '+x+','+y+' door='+g.dungeon.open+' floor='+g.dungeon.floor+' radius='+g.hero.r+' wall='+g.wallAt(g.hero.x+20,g.hero.y,g.hero.r)+' mode='+g.mode);}
    g.joy.dx=g.joy.dy=0;
    for(let i=0;i<1200&&!g.dungeon.stairs&&g.mode!=='victory';i++){tick();if(g.enemies.some(e=>e.type==='boss')){const boss=g.enemies.find(e=>e.type==='boss'),d=Math.hypot(boss.x-g.hero.x,boss.y-g.hero.y);if(d>55){g.joy.dx=(boss.x-g.hero.x)/d;g.joy.dy=(boss.y-g.hero.y)/d;}else g.joy.dx=g.joy.dy=0;}}
    const bosses=g.profile.bosses;check(g.profile.met.includes(['warden','tyrant','colossus','oracle','heart'][floor-1]),'Wrong floor boss');g.draw();
    if(floor===5){check(g.mode==='victory','No final victory');check(g.profile.records.descent.bestDepth[kind]===0,'Missing mode record');return {kind,floor,bosses,victory:true};}
    check(g.dungeon.stairs,'No stairs');const stairs=g.dungeon.stairs;let steps=0;while(g.dungeon.floor===floor&&steps++<800){const d=Math.hypot(stairs.x-g.hero.x,stairs.y-g.hero.y)||1;g.joy.dx=(stairs.x-g.hero.x)/d;g.joy.dy=(stairs.y-g.hero.y)/d;tick();}check(g.dungeon.floor===floor+1,'Stairs did not descend');g.joy.dx=g.joy.dy=0;g.draw();return {kind,floor,bosses,next:g.dungeon.floor};
   },{floor,kind});runs.push(result);console.log('PASS',JSON.stringify(result));
   await page.screenshot({path:`/tmp/descent-${kind}-floor-${floor}.png`});
  }
 }
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync('/tmp/descent-results.json',JSON.stringify({mechanics:mechanics.checks,runs,browserErrors:errors,assistance:'Deterministic joystick, health kept high and 3000 base damage; actual game movement, attacks, spawns, doors, stairs, upgrades and draw.'},null,2));
 const live=await browser.newPage({viewport:{width:390,height:844}});live.on('pageerror',e=>errors.push(e.message));await live.goto(`http://localhost:${server.address().port}/live`);await live.getByRole('button',{name:'TAP TO START'}).click({force:true});await live.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();await live.locator('input').fill('Live');await live.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();await live.keyboard.down('ArrowRight');await live.waitForTimeout(1000);await live.keyboard.up('ArrowRight');await live.waitForTimeout(5000);
 assert(await live.evaluate(()=>{const hud=document.querySelector('.hud').getBoundingClientRect(),map=document.querySelector('#dungeonMap').getBoundingClientRect();return !document.querySelector('#dungeonMap').hidden&&map.top>hud.bottom&&document.querySelector('#firstRunTip').textContent!=='Drag the joystick to move. Attacks are automatic.';}));await live.screenshot({path:'/tmp/descent-live-mobile.png'});assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: live unmodified mobile frame loop, assets, tip auto-hide and HUD/minimap separation');
 console.log('PASS: all 25 floor/hero combinations in Chromium, no browser errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
