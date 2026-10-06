// Optional v75 presentation/catalogue. No renderer, combat loop or persistence ownership.
(() => {
  'use strict';
  const gear = Object.freeze({
    gravecaller:{name:'Lantern of the Lost',text:'A killing shadow hit raises one extra skeleton, at most once every 6s. Existing minion cap applies.',color:'#c89cff'},
    ranger:{name:'Howling Fang',text:'Your wolves charge a visible nearby foe every 5s for one extra bite.',color:'#9ee5ff'},
    ember:{name:'Cinderwake',text:'Fire hits leave a small burning patch, at most once every 4s.',color:'#ffa06b'},
    bloodknight:{name:'Crimson Hook',text:'Blade hits pull bleeding foes toward you. Bosses resist the pull; walls stop it.',color:'#e46178'},
    sunwarden:{name:'Pilgrim’s Halo',text:'While moving, leave a healing footprint every 4s. Standing on it restores 2 HP/s for 3s.',color:'#ffe6a2'},
    rogue:{name:'Widow’s Return',text:'Dagger hits ricochet into one other visible foe for 35% damage. 2s cooldown.',color:'#b0ee97'},
    frostwarden:{name:'Winter’s Oath',text:'Dashing releases a chilling pulse within 95px for 35% base damage. Walls block it.',color:'#b5edff'}
  });
  const finite = (v,max=1e12) => Math.max(0,Math.min(max,Number(v)||0));
  function profile(prior={}) {prior=prior&&typeof prior==='object'?prior:{};const collection=Array.isArray(prior.collection)?prior.collection:[],equipped=Array.isArray(prior.equipped)?prior.equipped:[];return {collection:Object.keys(gear).filter(k=>collection.includes(k)),equipped:Object.keys(gear).filter(k=>collection.includes(k)&&equipped.includes(k)),provision:Math.floor(finite(prior.provision,1))};}
  function state(prior={},hero) {
    prior=prior&&typeof prior==='object'?prior:{};
    return {legend:prior.legend===hero&&gear[hero]?hero:'',procAt:finite(prior.procAt),
      sources:Object.fromEntries(['automatic','legendary','other'].map(k=>[k,finite(prior.sources?.[k])])),
      damage:Object.fromEntries(Object.entries(prior.damage||{}).filter(([k])=>/^(neutral|fire|poison|frost|ice|earth|blood|light|wind|shadow|arcane|lightning)$/.test(k)).map(([k,v])=>[k,finite(v)])),
      picks:Array.isArray(prior.picks)?prior.picks.filter(s=>typeof s==='string').slice(-50).map(s=>s.slice(0,90)):[],
      rescued:Array.isArray(prior.rescued)?[...new Set(prior.rescued.filter(n=>Number.isInteger(n)&&n>=2&&n<=10))].slice(0,9):[]};
  }
  function breakdown(damage={}) {return Object.entries(damage).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k.toUpperCase()+' '+Math.round(v).toLocaleString()).join(' · ')||'No damage recorded yet.';}
  window.EmberAdventure=Object.freeze({gear,profile,state,breakdown});
})();
