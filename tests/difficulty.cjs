// Settings → DIFFICULTY: per-slot levels scale enemy HP, incoming damage, arrivals and
// embers through the shared endgame factors, apply mid-run, and never touch daily runs or saves.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of source.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
const marker='      })();\n    </script>';
assert.equal(source.split(marker).length,2,'Test hook marker missing');
const html=source.replaceAll('requestAnimationFrame(frame);','').replace('function sfx(kind) {','function sfx(kind) { return;')
  .replace('function music(kind) {','function music(kind) { return;')
  .replace(marker,'        window.__test=(code)=>eval(code);\n'+marker);
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);
  if(name==='/'||name==='/test'){res.writeHead(200,{'content-type':'text/html'});return res.end(html);}
  const file=path.join(root,name);if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
  const ext=path.extname(file);res.writeHead(200,{'content-type':{'.js':'text/javascript','.webp':'image/webp','.png':'image/png','.wav':'audio/wav','.json':'application/json'}[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:844,height:390}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.clear();
    localStorage.setItem('ember-crypt-character-slots-v1',JSON.stringify([{name:'One',lastPlayed:1,playTime:1},{name:'Two',lastPlayed:1,playTime:1},null]));
    localStorage.setItem('ember-crypt-active-slot-v1','0');
    localStorage.setItem('ember-crypt-slot-1-profile',JSON.stringify({version:2,selectedHero:'ember',migrated:true,upgrades:{},embers:0,total:0}));});
  await page.goto(url+'/test');
  const result=await page.evaluate(()=>__test(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    selectSlot(0);selectedMode="endless";begin();
    const probe=()=>{hero.hp=hero.maxHp=1000;hero.armor=0;hero.inv=0;takeHit(10);const taken=1000-hero.hp;const f=endgameFactors();return {taken,hp:f.hp,density:f.density,reward:f.reward};};
    const normal=probe();check(difficultyLevel().key==="normal","Default is not Normal");
    renderMenu("settings");const harder=[...document.querySelectorAll("#menuPage button")].find(b=>b.textContent==="HARDER");check(harder,"HARDER button missing");
    for(let i=0;i<4;i++)[...document.querySelectorAll("#menuPage button")].find(b=>b.textContent==="HARDER").click();
    check(difficultyLevel().key==="nightmare","HARDER did not reach Nightmare");
    check([...document.querySelectorAll("#menuPage button")].find(b=>b.textContent==="HARDER").disabled,"HARDER not capped");
    const nightmare=probe();
    check(nightmare.hp===3*normal.hp&&nightmare.density===1.45*normal.density&&nightmare.reward===2*normal.reward,"Nightmare factors wrong");
    check(Math.abs(nightmare.taken-2*normal.taken)<1e-9,"Nightmare damage is not doubled: "+normal.taken+" → "+nightmare.taken);
    for(let i=0;i<6;i++){const b=[...document.querySelectorAll("#menuPage button")].find(b=>b.textContent==="EASIER");if(!b.disabled)b.click();}
    check(difficultyLevel().key==="easy","EASIER did not reach Easy");
    const easy=probe();check(Math.abs(easy.taken-.6*normal.taken)<1e-9&&easy.hp===.7*normal.hp,"Easy factors wrong");
    check(localStorage.getItem("ember-crypt-difficulty-0")==="easy","Difficulty not stored for slot 1");
    const keep=endgameRun;endgameRun={...endgameRun,daily:{date:"2026-01-01",modifier:""}};
    check(difficultyLevel().key==="normal"&&endgameFactors().hp===1,"Daily challenge used the Settings difficulty");endgameRun=keep;
    saveRun(true);check(!JSON.stringify(readRun()).includes("difficulty")&&!JSON.stringify(profile).includes("difficulty"),"Difficulty leaked into saves");
    selectSlot(1);check(difficultyLevel().key==="normal","Slot 2 inherited slot 1 difficulty");
    selectSlot(0);check(difficultyLevel().key==="easy","Slot 1 difficulty not restored");
    return {normal:normal.taken,nightmare:nightmare.taken,easy:easy.taken};})()`));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS difficulty: Easy/Normal/Nightmare scaling, mid-run change, caps, per-slot storage, daily stays Normal, no save fields',JSON.stringify(result));
  await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
