// Guard against accidental changes to combat, AI, saves and progression.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const base=cp.execFileSync('git',['show','c588c3f:index.html'],{encoding:'utf8'}),current=fs.readFileSync('index.html','utf8');
const names=['update','damageEnemy','takeHit','begin','saveRun','restoreRun','applyProfile','makeSaveCode','loadSaveCode','moveAroundWalls','segmentBlocked','spawnEnemy','spawnBoss','floorEntry','buildFloor','useDash','useUltimate','updateHeroActors','fire','attack','levelUp'];
function body(source,name){const match=new RegExp('function '+name+'\\s*\\(').exec(source);if(!match)return null;let start=source.indexOf('{',match.index),depth=1,i=start+1,quote=null,escape=false;for(;depth&&i<source.length;i++){const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;}else if(c==='"'||c==="'"||c==='`')quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}return source.slice(match.index,i);}
// Deliberate v72 endgame, v73 new-hero/mastery and v74 deep-floor and v75 optional loot/encounter extension points only; compare the remaining original bodies byte-for-byte.
const adventureHooks=["applyAdventureProfile(prior);","startAdventure();","restoreAdventure();","adventureFloor();","if(updateAdventure(dt))return;","adventureHit(e,dealt,element,fromHeroBolt);","adventureDash();","adventureChoice(b,p);","adventurePick(p);"];
const deepHooks=[
'allowed.push("ghostChoir","drownedKnight","machineGolem","slagSpitter","furnaceImp","bishop","foundry","cryptHeart");',
'const deepRequested=variantOverride;variantOverride=deepBossTemplate(variantOverride);',
'prepareDeepBoss(boss,deepRequested);',
'if(deepRequested!==variant&&typeof deepRequested==="string")noteEnemy(deepRequested);',
'type=deepEnemyType(type,forcedType);',
'prepareDeepEnemy(newcomer);',
'deepEnemyDeath(e);',
'[vx,vy]=deepSlow(o,vx,vy,guide);',
'if(updateDeepEnemy(e,dt)){if(mode!=="play")return;continue;}'
];
const hooks = [
'Object.assign(profile, EmberEndgame.profile(prior || {}));',
'if (endgameRun && isDescent()) endgameRun.floor = dungeon.floor;',
'endgameRun,',
'endgameRun=EmberEndgame.run(saved.endgameRun || {});',
'startEndgameRun();',
'if(checkpoint.endgameRun)endgameRun=EmberEndgame.run(checkpoint.endgameRun);',
'prepareEndgameFloor(number);',
'floorCheckpoint.endgameRun=structuredClone(endgameRun);',
'const assembled=endgameFloorSpec(number,spec);',
'dungeon.spec=assembled;',
'enhanceEndgameEnemy(newcomer, !forcedType);',
'enhanceEndgameEnemy(boss, false);',
'amount *= endgameFactors().damage;endgameHitSource();',
'amount = endgameDamage(e, amount);',
'endgameEnemyKilled(e);',
'spawn /= endgameFactors().density;',
'updateEndgame(dt);',
'if (collectEndgameDrop(o)) { if(mode!=="play")break;continue; }' ,

  "applyNewBloodProfile(prior);",
  "if(newHeroKeys.includes(prior?.selectedHero)&&profile[prior.selectedHero])selectedHero=prior.selectedHero;",
  "ensureNewBloodFields();resetNewBloodActors();ensureMasteryRun();",
  "initializeNewBloodRun();",
  "if(isNewBloodHero())tipOnce(hero.class+\"-tactics\",hero.class===\"rogue\"?\"Your Dash leaves a decoy. Night Veil makes every dagger a critical hit.\":\"Your ice walls stop enemies, never you. Stay inside Glacier Fortress for protection.\");",
  "if(isNewBloodHero())allowedElements.splice(0,allowedElements.length,...newHeroElements());",
  "if(isNewBloodHero())fairyChoices.length=0;",
  "if(isNewBloodHero())describeNewBloodShared(options);",
  "resetNewBloodActors();",
  "const frostOrigin=hero?.class===\"frostwarden\"&&guide?{x:o.x,y:o.y}:null;",
  "resolveIceCollision(o,frostOrigin);",
  "newBloodDeath(e);",
  "newBloodDash();",
  "useNewBloodUltimate();",
  "amount *= newBloodHitScale();",
  "updateNewBlood(dt);",
  "if(attack<=0)newBloodAttack();"
];
function normalize(source){
 source=source.replaceAll('/* cosmetic-v76-periodic */ fx("periodicHit", e);','');
 source=source.split('\n').filter(line=>!adventureHooks.some(h=>line.trim()==='/* combat-loot-v75 */ '+h)&&!deepHooks.some(h=>line.trim()==='/* deeper-crypt-v74 */ '+h)&&!hooks.some(h=>(line.trim()==='/* endgame-v72 */ '+h||line.trim()==='/* new-blood-v73 */ '+h))&&line.trim()!=='/* cosmetic-v76-pool */ fx("periodicHit", pool.kind === "frozen" ? null : e);'&&line.trim()!=='/* cosmetic-v69 */ fx("enemyDeath", e);'&&line.trim()!=='/* cosmetic-v76 */ fx("combatHit", e, {element,isCrit:isCrit||kind==="crit",kind,fromHeroBolt});').join('\n');
 return source.replace('[.75,.85,.95,1,1.05,1.10,1.15,1.20,1.25,1.30]','[.75,.85,.95,1,1.05]').replace('Math.min(10,Number(prior.bestFloor)||0)','Math.min(5,Number(prior.bestFloor)||0)').replace('e.variant!==\"heart\"&&e.variant!==\"cryptHeart\"','e.variant!==\"heart\"').replace('showToast(matchupToast(boss, bossNames[boss.variant]));','showToast(matchupToast(boss, bossNames[variant]));').replaceAll('gameRandom()', 'Math.random()').replaceAll('assembled.rooms','spec.rooms').replaceAll('assembled.links','spec.links')
 .replace('version: 12,\n                balanceVersion: 12,','version: 11,\n                balanceVersion: 11,')
 .replace('          if(data.run)data.run=migrateEndgameRun(data.run);\n','')
 .replace('[9,10,11,12].includes','[9,10,11].includes').replace('data.run.version<11','data.run.version!==11');
}

let checked=0;for(const name of names){const old=body(base,name);if(old){assert.equal(normalize(body(current,name)),old,'Gameplay changed: '+name);checked++;}}
assert(current.includes('1000 / visualQuality.fps - 0.5'));assert(current.includes('high:{maxLights:10,maxAtmosphere:32,pixelBudget:1800000,dprCap:1.5,fps:60}'));assert(/low:\{[^}]*fps:40\}/.test(current));console.log('PASS original gameplay/save bodies preserved around listed v72/v73/v74/v75 hooks:',checked,'; 60 FPS target (40 FPS low tier), bounded pixels/lights');

