// Guard against accidental changes to combat, AI, saves and progression.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const base=cp.execFileSync('git',['show','c588c3f:index.html'],{encoding:'utf8'}),current=fs.readFileSync('index.html','utf8');
const names=['update','damageEnemy','takeHit','begin','saveRun','restoreRun','applyProfile','makeSaveCode','loadSaveCode','moveAroundWalls','segmentBlocked','spawnEnemy','spawnBoss','floorEntry','buildFloor','useDash','useUltimate','updateHeroActors','fire','attack','levelUp'];
function body(source,name){const match=new RegExp('function '+name+'\\s*\\(').exec(source);if(!match)return null;let start=source.indexOf('{',match.index),depth=1,i=start+1,quote=null,escape=false;for(;depth&&i<source.length;i++){const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;}else if(c==='"'||c==="'"||c==='`')quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}return source.slice(match.index,i);}
// Deliberate v72 extension points only; compare the remaining original bodies byte-for-byte.
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
'if (collectEndgameDrop(o)) { if(mode!=="play")break;continue; }'
];
function normalize(source){
 source=source.split('\n').filter(line=>!hooks.some(h=>line.trim()==='/* endgame-v72 */ '+h)&&line.trim()!=='/* cosmetic-v69 */ fx("enemyDeath", e);').join('\n');
 return source.replaceAll('gameRandom()', 'Math.random()').replaceAll('assembled.rooms','spec.rooms').replaceAll('assembled.links','spec.links')
 .replace('version: 12,\n                balanceVersion: 12,','version: 11,\n                balanceVersion: 11,')
 .replace('          if(data.run)data.run=migrateEndgameRun(data.run);\n','')
 .replace('[9,10,11,12].includes','[9,10,11].includes').replace('data.run.version<11','data.run.version!==11');
}

let checked=0;for(const name of names){const old=body(base,name);if(old){assert.equal(normalize(body(current,name)),old,'Gameplay changed: '+name);checked++;}}
assert(current.includes('1000 / visualQuality.fps - 0.5'));assert(current.includes('high:{maxLights:10,maxAtmosphere:32,pixelBudget:1800000,dprCap:1.5,fps:60}'));assert(/low:\{[^}]*fps:40\}/.test(current));console.log('PASS original gameplay/save bodies preserved around listed v72 hooks:',checked,'; 60 FPS target (40 FPS low tier), bounded pixels/lights');
