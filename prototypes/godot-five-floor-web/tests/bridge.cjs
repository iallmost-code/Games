const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const project=path.resolve(__dirname,'..'),repo=path.resolve(project,'../..'),raw=fs.readFileSync(path.join(project,'source/index.html'),'utf8');
const original=fs.readFileSync(path.join(repo,'index.html'),'utf8');
function body(source,name){source=source.slice(source.indexOf('const GAME_VERSION'));const match=new RegExp('function '+name+'\\s*\\(').exec(source);if(!match)return null;let start=source.indexOf('{',match.index),depth=1,i=start+1,quote=null,escape=false;for(;depth&&i<source.length;i++){const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;}else if(c==='"'||c==="'"||c==='`')quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}return source.slice(match.index,i);}
for(const name of ['update','damageEnemy','takeHit','begin','saveRun','applyProfile','makeSaveCode','loadSaveCode','moveAroundWalls','segmentBlocked','spawnEnemy','spawnBoss','floorEntry','buildFloor','useDash','useUltimate','fire','levelUp','newBloodAttack','shieldBash','updatePrototypeHeroes','updateNewBlood','updateSpells','updateSites'])assert.equal(body(raw,name),body(original,name),'Model function changed: '+name);
for(const m of raw.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
const hooks=fs.readFileSync(path.join(repo,'tests/deeper-crypt.cjs'),'utf8').match(/const hooks = `([\s\S]*?)`;/)[1];
const pos=raw.lastIndexOf('      })();');
const source=(raw.slice(0,pos)+hooks+'\n'+raw.slice(pos)).replace('function sfx(kind) {','function sfx(kind) { return;').replace('function music(kind) {','function music(kind) { return;').replaceAll('requestAnimationFrame(frame);','');
const files=JSON.parse(fs.readFileSync(path.join(project,'source/files.json')));
const host=fs.readFileSync(path.join(project,'scripts/web_host.js'),'utf8');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<div id="tab-game" style="position:relative;width:100vw;height:100vh"></div><script>'+host+'</script><script>emberGodotHost.urls='+JSON.stringify(Object.fromEntries(files.map(f=>[f.path,'http://127.0.0.1:'+server.address().port+'/raw/'+f.path])))+';fetch("/source").then(r=>r.text()).then(s=>emberGodotHost.start(s));</script>');}
 if(url.pathname==='/source'){res.setHeader('Content-Type','text/html');return res.end(source);}
 const logical=url.pathname.replace(/^\/raw\//,'');const f=files.find(f=>f.path===logical);if(!f){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',f.mime);res.end(fs.readFileSync(path.join(project,f.file.replace('res://',''))));
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:844,height:390},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));const report={heroes:[],saves:[],errors};try{
 await p.goto('http://127.0.0.1:'+server.address().port);const frame=await p.waitForSelector('#ember-godot-ui').then(e=>e.contentFrame());await frame.waitForFunction(()=>window.deepTest);await frame.getByRole('button',{name:'TAP TO START'}).click({force:true});await frame.getByRole('button',{name:'SLOT 1 · + NEW CHARACTER',exact:true}).click();await frame.locator('input').fill('Godot');await frame.getByRole('button',{name:'CREATE & PLAY',exact:true}).click();await frame.waitForFunction(()=>Object.keys(deepTest.art).length>30);
 await frame.evaluate(()=>{deepTest.mode='play';});
 for(const hero of ['gravecaller','ranger','ember','bloodknight','sunwarden','rogue','frostwarden']){
  const result=await frame.evaluate(kind=>{const g=deepTest;g.selectedHero=kind;g.selectedMode='descent';g.begin();const base={hp:g.hero.maxHp,damage:g.hero.damage};const unlocks=Object.fromEntries(['ranger','ember','bloodknight','sunwarden','rogue','frostwarden'].map(k=>[k,g.profile[k]]));const floors=[];
   for(let n=1;n<=5;n++){
    if(g.dungeon.floor!==n)g.floorEntry(n);g.hero.hp=g.hero.maxHp;g.hero.inv=999;g.spawn=999;g.dungeon.eventAt=99999;g.dungeon.elapsed=181;g.updateDungeon(.025);if(!g.dungeon.open)throw Error('Door '+n);
    g.hero.x=26*80;g.hero.y=800;g.updateDungeon(.025);const boss=g.boss;if(!boss||boss.variant!==g.floorSpec().boss)throw Error('Boss '+n);
    const snapshot=JSON.parse(emberGodot.snapshot());if(snapshot.hero.class!==kind||snapshot.dungeon.floor!==n||snapshot.dungeon.cells.length<100)throw Error('Snapshot');
    g.damageEnemy(boss,1e9,'neutral',0,false,false,false);
    if(n===5){g.hero.x=27*80;g.hero.y=10*80;g.mode='play';g.update(.025);if(g.mode!=='victory'||!g.profile.descentCleared||document.getElementById('descendDeeper'))throw Error('Floor5 victory '+JSON.stringify({mode:g.mode,clear:g.profile.descentCleared,deep:!!document.getElementById('descendDeeper'),enemies:g.enemies.length,hp:g.hero.hp,paid:g.hero.victoryPaid}));}
    else {if(!g.dungeon.stairs)throw Error('Stairs');g.hero.x=g.dungeon.stairs.x;g.hero.y=g.dungeon.stairs.y;g.updateDungeon(.025);if(g.dungeon.floor!==n+1)throw Error('Advance');}
    floors.push({floor:n,boss:boss.variant});
   }
   return {hero:kind,base,floors,unlocks,snapshotBytes:emberGodot.snapshot().length};
  },hero);report.heroes.push(result);
 }
 const saves=await frame.evaluate(()=>{const g=deepTest;g.selectedHero='rogue';g.selectedMode='descent';g.begin();g.floorEntry(3);g.hero.hp-=5;g.saveRun(true);const saved=g.readRun();if(saved.v!==12&&saved.version!==12)throw Error('Run version '+JSON.stringify(saved).slice(0,90));g.restoreRun();if(g.dungeon.floor!==3||g.hero.class!=='rogue')throw Error('Restore');const code=g.makeSaveCode(),decoded=g.loadSaveCode(code);if(decoded.run.floor!==3||decoded.profile.mastery.rogue.xp!==g.profile.mastery.rogue.xp)throw Error('EC1');const embers=g.profile.embers;g.slots[1]={name:'Other',playTime:0};g.selectSlot(1);if(g.profile.embers!==0)throw Error('Slot leak');g.selectSlot(0);if(g.profile.embers!==embers)throw Error('Slot restore');return {run:saved.v??saved.version,floor:saved.floor,codePrefix:code.slice(0,4),slots:'PASS',profile:g.profile.v??g.profile.version};});report.saves.push(saves);
 const migrations=await frame.evaluate(()=>{const g=deepTest;g.selectedHero='gravecaller';g.begin();g.saveRun(true);const template=g.readRun(),key='ember-crypt-slot-1-run-v12',old={...structuredClone(template),version:9,balanceVersion:9};delete old.runMode;delete old.floor;delete old.floorCheckpoint;old.hero.class='mage';const embers=g.profile.embers;localStorage.removeItem(key);localStorage.setItem(key.replace('-v12','-v9'),JSON.stringify(old));const migrated=g.readRun();if(migrated.version!==12||migrated.runMode!=='endless'||migrated.hero.class!=='gravecaller'||g.profile.embers!==embers)throw Error('v9 migration');g.restoreRun();if(g.hero.class!=='gravecaller'||g.mode!=='play')throw Error('Migrated restore');
  const deep=structuredClone(template);deep.floor=6;deep.floorCheckpoint.floor=6;localStorage.setItem(key,JSON.stringify(deep));g.readRun();const before=localStorage.getItem(key),hero=g.hero;g.restoreRun();if(before!==localStorage.getItem(key)||g.hero!==hero)throw Error('Deeper save was changed');return {v9:'v12 / Endless / Gravecaller',deeperRun:'preserved; unsupported Continue blocked'};
 });report.migrations=migrations;
 const isolation=await p.evaluate(()=>({prefixed:Object.keys(localStorage).filter(k=>k.startsWith('godot-ec-five-v1:')).length,unprefixed:Object.keys(localStorage).filter(k=>k.startsWith('ember-crypt-')).length}));assert(isolation.prefixed>0);assert.equal(isolation.unprefixed,0);report.isolation=isolation;assert.deepEqual(errors,[]);
 console.log(JSON.stringify(report,null,2));fs.writeFileSync('/tmp/godot-five-bridge.json',JSON.stringify(report,null,2));
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
