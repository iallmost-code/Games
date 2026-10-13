// Authored movement must remain presentation-only, with grounded cached frames.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),file=path.join(root,'assets/cinematic/enemy-animation.js');
assert(fs.existsSync(file),'Living Crypt enemy animation renderer is missing');
const window={},math=Object.create(Math);math.random=()=>{throw Error('Animation consumed gameplay RNG')};
vm.runInNewContext(fs.readFileSync(file,'utf8'),{window,Math:math});
const a=window.EmberEnemyAnimation;
for(const [x,y,row,flip] of [[0,1,0,false],[1,1,1,false],[1,0,1,false],[1,-1,1,false],[0,-1,2,false],[-1,-1,1,true],[-1,0,1,true],[-1,1,1,true]]){
  const d=a.direction({x,y});assert.equal(d.row,row);assert.equal(d.flip,flip);
}
const e={type:'ghoul',x:0,y:0,r:16,faceX:0,faceY:1,attack:0,hp:100};
const snap=()=>JSON.stringify(e),before=snap();
let s=a.observe(e,{clock:0});const phase=s.phase;
s=a.observe(e,{clock:.1});assert.equal(s.phase,phase,'Blocked feet kept walking');
e.x=10;s=a.observe(e,{clock:.2});assert(s.phase>phase,'Actual displacement did not drive feet');
const p=s.phase;e.x=1010;s=a.observe(e,{clock:.3});assert.equal(s.phase,p,'Teleport was animated as a huge stride');
e.attack=.8;s=a.observe(e,{clock:.4});assert.equal(s.pose,'attack','Actual contact cooldown reset failed to animate');
assert.equal(a.observe(e,{clock:.8}).pose,'idle');
assert.notEqual(a.observe({type:'ghoul',x:0,y:0,attack:0},{clock:0}).phase,phase,'Crowd phase was synchronized');
const current=snap();a.observe(e,{clock:1});assert.equal(snap(),current,'Cosmetic state entered enemy/save fields');
assert.equal(a.frame('unsupported',0),null);assert.equal(a.sample(e,{clock:1}),null,'Missing atlas failed to use still fallback');
assert.equal(a.choose({row:0,phase:0,moving:true},{maxAtmosphere:32}).index,0);
for(let i=0;i<24;i++)assert.equal(a.choose({row:0,phase:i/24,moving:true},{maxAtmosphere:8}).col%2,0,'Low quality did not halve walk frames');
assert.equal(a.diagnostics().decodedFrames,0,'Enemy sheets loaded eagerly');
for(const [type,field] of [['caster','cast'],['sporeSpitter','cast'],['wraith','blinkCd']]){
  const enemy={type,x:0,y:0,attack:0,[field]:.02};a.observe(enemy,{clock:1});enemy[field]=3;
  assert.equal(a.observe(enemy,{clock:1.1}).pose,'attack',type+' did not animate its projectile release');
}
const burrow={type:'burrower',x:0,y:0,attack:0,burrow:.02};a.observe(burrow,{clock:1});burrow.burrow=0;burrow.x=200;
assert.equal(a.observe(burrow,{clock:1.1}).pose,'attack','Burrow emergence did not animate');
const blind={type:'caster',x:0,y:0,attack:0,cast:.02,solarBlindUntil:5};a.observe(blind,{clock:1});blind.cast=4;blind.attack=4;
assert.equal(a.observe(blind,{clock:1.1}).pose,'idle','Solar Flare cooldown suppression looked like an attack');
const walker={type:'runner',x:0,y:0,attack:0};a.observe(walker,{clock:1});walker.x=5;const moving=a.observe(walker,{clock:1.1});
const frozen=moving.phase;assert.equal(a.observe(walker,{clock:1.1}).phase,frozen,'Paused draw advanced movement');
console.log('PASS enemy direction, distance-driven stride, teleports, actual attack observation, unsynced crowds, Low frame cap and cosmetic purity');

const heroes=['gravecaller','bloodknight','ranger','sunwarden','ember','rogue','frostwarden'],enemies=Array.from(a.kinds);
const bytes=[...enemies.map(k=>'enemies/'+k),...heroes.map(k=>'heroes/'+k)].reduce((n,k)=>{
  for(const ext of ['webp','png'])assert(fs.existsSync(path.join(root,'assets/cinematic/living-crypt',k+'.'+ext)),'Missing authored '+k+'.'+ext);
  return n+fs.statSync(path.join(root,'assets/cinematic/living-crypt',k+'.webp')).size;
},0);
assert(bytes<=8000000,'New WebP download exceeds 8 MB');
require('./hero-directions-unit.cjs').unit();
const http=require('node:http'),cp=require('node:child_process'),{chromium}=require('playwright');
const raw=fs.readFileSync(path.join(root,'index.html'),'utf8'),baseline='22d2b51b567a6c33789febd5b556c65d1d97a178',oldFiles=new Map();
assert(raw.includes('v80 · LIVING CRYPT'));assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes("const CACHE = 'ember-crypt-v80'"));
function old(name){if(!oldFiles.has(name))oldFiles.set(name,cp.execFileSync('git',['show',baseline+':'+name],{cwd:root,maxBuffer:24*1024*1024}));return oldFiles.get(name)}
const hooks=`window.livingTest={begin,draw,update,updateHud,selectSlot,applyProfile,floorEntry,wallAt,spawnEnemy,spawnBoss,saveRun,readRun,makeSaveCode,loadSaveCode,projectVector,inputVector,setQualityTier,fx,get hero(){return hero},get profile(){return profile},get enemies(){return enemies},set enemies(v){enemies=v},get dungeon(){return dungeon},get art(){return art},get clock(){return clock},set clock(v){clock=v},get mode(){return mode},set spawn(v){spawn=v},set wave(v){wave=v},set pools(v){pools=v},set arcs(v){arcs=v},set floaters(v){floaters=v},set drops(v){drops=v},set selectedHero(v){selectedHero=v},set selectedMode(v){selectedMode=v}};`;
function source(s){return s.replace('function sfx(kind) {','function sfx(kind) { return;').replace('function music(kind) {','function music(kind) { return;').replaceAll('requestAnimationFrame(frame);','').replace('      })();',hooks+'\n      })();')}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),before=url.pathname.startsWith('/before/'),name=before?'/'+url.pathname.slice(8):url.pathname;
  if(name==='/'||name===''){res.setHeader('Content-Type','text/html');return res.end(source(before?old('index.html').toString():raw));}
  const f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':'application/octet-stream');
  try{res.end(before?old(name.slice(1)):fs.readFileSync(f));}catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;
  const out=process.env.ARTIFACT_DIR||'/tmp/living-crypt-artifacts';fs.mkdirSync(out,{recursive:true});
  const report={webpBytes:bytes,sheets:[],scenes:[],errors:[],performance:[]};
  try{
    const p=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,deviceScaleFactor:3});
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.addInitScript(()=>{localStorage.setItem('ember-crypt-character-slots-v1',JSON.stringify([{name:'Living Crypt',lastPlayed:1,playTime:60},null,null]));localStorage.setItem('ember-crypt-active-slot-v1','0');localStorage.setItem('ember-crypt-muted','1');localStorage.setItem('ember-crypt-rpg-preview','1');});
    async function scene(page,mode='endless',kind='gravecaller'){
      return page.evaluate(({mode,kind})=>{
        const g=livingTest;g.selectSlot(0);g.applyProfile({ranger:true,ember:true,bloodknight:true,sunwarden:true,rogue:true,frostwarden:true});g.selectedHero=kind;g.selectedMode=mode;g.begin();
        if(mode==='descent')g.floorEntry(1);else{g.hero.x=220;g.hero.y=215;g.wave=24;}
        if(g.dungeon)g.dungeon.title=0;g.clock=745.05;g.spawn=999;g.enemies=[];
        g.hero.cast=0;g.hero.moving=true;g.hero.faceX=1;g.hero.faceY=0;g.hero.stepPhase=1.4;
        for(let i=0;i<38;i++){g.spawnEnemy(mode==='endless'?(i%5===0?'frostGolem':i%3===0?'wraith':'skeleton'):(i%7===0?'cinderImp':i%4===0?'brute':'ghoul'));const e=g.enemies.at(-1),a=i*2.399,r=45+i*5;e.x=g.hero.x+Math.cos(a)*r;e.y=g.hero.y+Math.sin(a)*r;e.arriving=0;e.hp=e.max*.7;e.faceX=-Math.cos(a);e.faceY=-Math.sin(a);}
        g.drops=Array.from({length:60},(_,i)=>({type:'xp',x:g.hero.x+Math.cos(i*2.4)*(45+i*3),y:g.hero.y+Math.sin(i*2.4)*(45+i*3),value:1}));
        g.floaters=Array.from({length:12},(_,i)=>({x:g.hero.x+(i%5-2)*28,y:g.hero.y+Math.floor(i/5)*20,text:i%6===0?'CRIT 339!':'-'+(12+i),color:'#ffe4a0',life:.7,scale:1}));
        g.pools=[{x:g.hero.x+85,y:g.hero.y+60,r:55,life:3,kind:mode==='endless'?'frozen':'poison',power:1,tick:.5}];g.arcs=[];
        g.draw();g.clock+=.1;for(const e of g.enemies){e.x+=e.faceX*5;e.y+=e.faceY*5;}
        const snapshot=()=>JSON.stringify({hero:g.hero,enemies:g.enemies,cells:g.dungeon?[...g.dungeon.cells]:[],profile:g.profile});const b=snapshot(),walls=[[80,80],[300,300]].map(([x,y])=>g.wallAt(x,y,10));
        g.draw();if(snapshot()!==b)throw Error('Animation entered gameplay/save state');if(JSON.stringify(walls)!==JSON.stringify([[80,80],[300,300]].map(([x,y])=>g.wallAt(x,y,10))))throw Error('Animation changed collision');
        g.saveRun();const saved=g.readRun();if(saved.version!==12)throw Error('Run format changed');g.updateHud();
        return {kind,mode,pixels:document.getElementById('view').width*document.getElementById('view').height,profileVersion:g.profile.version,runVersion:saved.version,enemyAtlases:window.EmberEnemyAnimation?.diagnostics()};
      },{mode,kind});
    }
    // Pin before images to v79 code AND v79 modules, even after this worktree changes.
    await p.goto(url+'/before/');await p.waitForFunction(()=>window.livingTest&&EmberHeroAnimation.diagnostics().frames===210&&livingTest.art['prop-frost-statue']);
    for(const mode of ['endless','descent']){await scene(p,mode);await p.screenshot({path:path.join(out,'before-'+mode+'.png'),scale:'css'});}
    await p.goto(url);await p.waitForFunction(()=>window.livingTest&&EmberHeroAnimation.diagnostics().frames===210);
    assert.equal(await p.evaluate(()=>EmberEnemyAnimation.diagnostics().decodedFrames),0,'Enemy atlases eagerly loaded on the menu');
    // Real decoded WebP + PNG pixels: blank gutters, required poses, distinct strides.
    report.sheets=await p.evaluate(async({heroes,enemies})=>{
      const result=[];
      for(const family of ['enemies','heroes'])for(const kind of family==='enemies'?enemies:heroes)for(const ext of ['webp','png']){
        const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error(kind+'.'+ext+' failed to decode'));i.src='assets/cinematic/living-crypt/'+family+'/'+kind+'.'+ext;});
        const cw=family==='heroes'?224:144,ch=family==='heroes'?192:160,rows=family==='heroes'?7:6;
        if(img.naturalWidth!==cw*6||img.naturalHeight!==ch*rows)throw Error('Wrong dimensions '+kind);
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const px=ctx.getImageData(0,0,c.width,c.height).data;
        const hashes=[],bounds=[];
        for(let row=0;row<rows;row++)for(let col=0;col<6;col++){
          const active=family==='enemies'?row!==4||col<2:row<2||col<4;let count=0,hash=2166136261,minX=cw,minY=ch,maxX=0,maxY=0;
          for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const at=((row*ch+y)*c.width+col*cw+x)*4,a=px[at+3];if(a>8){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);hash=Math.imul(hash^px[at]^px[at+1]^px[at+2]^a,16777619);}}
          if(active&&count<100)throw Error('Blank required pose '+kind+':'+row+','+col);
          if(!active&&count>0)throw Error('Nonblank reserved pose '+kind+':'+row+','+col);
          if(active&&(minX<2||minY<2||maxX>cw-3||maxY>ch-3))throw Error('Clipped pose '+kind+':'+row+','+col+' '+[minX,minY,maxX,maxY]);
          hashes.push(hash);bounds.push([minX,minY,maxX,maxY]);
        }
        for(let row=0;row<(family==='enemies'?3:2);row++)if(new Set(hashes.slice(row*6,row*6+6)).size<6)throw Error('Duplicate walk pose '+kind);
        for(let row=0;row<(family==='enemies'?3:2);row++){
          const feet=bounds.slice(row*6,row*6+6).map(b=>b[3]);
          if(Math.max(...feet)-Math.min(...feet)>2)throw Error('Unstable grounded walk feet '+kind+':'+row);
        }
        if(family==='heroes')for(let row=2;row<7;row++)if(new Set(hashes.slice(row*6,row*6+4)).size<4)throw Error('Frozen idle loop '+kind+':'+row);
        result.push({family,kind,ext,frames:32,bounds});
      }
      return result;
    },{heroes,enemies});
    await p.evaluate(enemies=>{for(const k of enemies)EmberEnemyAnimation.load(k);},enemies);
    await p.waitForFunction(()=>EmberEnemyAnimation.diagnostics().decodedFrames===384);
    for(const kind of heroes){
      await p.evaluate(kind=>EmberHeroAnimation.ensure(kind),kind);
      await p.waitForFunction(kind=>EmberHeroAnimation.extensionReady(kind),kind);
      await p.evaluate(kind=>{
        const a=EmberHeroAnimation;
        for(const [x,y,name,flip] of [[0,1,'down',false],[1,1,'down-diagonal',false],[1,0,'side',false],[1,-1,'up-diagonal',false],[0,-1,'up',false],[-1,-1,'up-diagonal',true],[-1,0,'side',true],[-1,1,'down-diagonal',true]]){
          const d=a.directions({x,y});if(d.name!==name||d.flip!==flip)throw Error('Wrong eight-way facing '+kind);
          for(const moving of [true,false])for(const variant of [0,1,2]){const pose=a.choose({kind,direction:{x,y},isometric:true,moving,phase:1.4,clock:.5});if(!a.frame(kind,pose.index,variant))throw Error('Missing directional/mastery frame '+kind);}
        }
        if(a.diagnostics().extensionFrames>64||a.diagnostics().variantSets>2)throw Error('Hero decoded/palette cache grew beyond two sets');
      },kind);
    }
    for(const size of [{width:844,height:390},{width:390,height:844}]){await p.setViewportSize(size);for(const kind of heroes){await p.evaluate(kind=>EmberHeroAnimation.ensure(kind),kind);await p.waitForFunction(kind=>EmberHeroAnimation.extensionReady(kind),kind);for(const mode of ['endless','descent']){const r=await scene(p,mode,kind);assert(r.pixels<=1800000);report.scenes.push({...size,...r});if(size.width===844&&kind==='gravecaller')await p.screenshot({path:path.join(out,'after-'+mode+'.png'),scale:'css'});}}}
    await p.evaluate(()=>EmberHeroAnimation.ensure('gravecaller'));await p.waitForFunction(()=>EmberHeroAnimation.extensionReady('gravecaller'));
    for(const tier of ['high','medium','low']){await p.evaluate(t=>livingTest.setQualityTier(t),tier);await scene(p);const perf=await p.evaluate(()=>{for(let i=0;i<5;i++)livingTest.draw();const ms=[];for(let i=0;i<40;i++){const t=performance.now();livingTest.draw();ms.push(performance.now()-t);}ms.sort((a,b)=>a-b);return {median:ms[20],p95:ms[38]};});report.performance.push({tier,...perf});}
    const death=await p.evaluate(()=>{const g=livingTest,e=g.enemies[0],capture=EmberEnemyAnimation.captureDeath(e,{clock:g.clock,projectVector:g.projectVector});const hashes=new Set();for(let i=0;i<6;i++)hashes.add(EmberEnemyAnimation.deathFrame(capture,i/6,{maxAtmosphere:32}));const snap=JSON.stringify(e);g.fx('enemyDeath',e);g.draw();return {frames:hashes.size,pure:snap===JSON.stringify(e)};});assert.equal(death.frames,6);assert(death.pure);
    await p.evaluate(()=>{const m=window.EmberMotion,e=livingTest.enemies[0],hit=e.hitFlash;e.hitFlash=.1;window.EmberMotion=undefined;try{livingTest.draw();}finally{window.EmberMotion=m;e.hitFlash=hit;}});
    // Block WebP: decoded PNG follows. Block both: old authored/painted sprites still render.
    for(const missing of ['webp','both']){
      const q=await browser.newPage({viewport:{width:844,height:390}});await q.route('**/assets/cinematic/living-crypt/**',r=>r.request().url().endsWith('.webp')||missing==='both'?r.abort():r.continue());
      await q.goto(url);await q.waitForFunction(()=>window.livingTest&&EmberHeroAnimation.diagnostics().frames===210);await scene(q);
      if(missing==='webp')await q.waitForFunction(()=>EmberEnemyAnimation.diagnostics().loaded.length>0&&EmberHeroAnimation.diagnostics().extensionFrames>0);
      else{await q.waitForFunction(()=>EmberEnemyAnimation.diagnostics().failed.length>0);const fall=await q.evaluate(()=>{const b=JSON.stringify(livingTest.hero);livingTest.draw();return b===JSON.stringify(livingTest.hero)&&EmberHeroAnimation.ready('gravecaller');});assert(fall);}
      await q.close();
    }
    assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'living-crypt-results.json'),JSON.stringify(report,null,2));
    console.log('PASS 38 WebP/PNG atlases, 608 grounded active poses, 28 hero/mode/phone scenes, v12 saves/physics, PNG and still fallbacks, lazy loading, death fade; new WebP bytes:',bytes,'screenshots:',out);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
