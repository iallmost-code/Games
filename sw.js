// Versioned offline shell and bounded, same-origin asset cache. No save data is cached.
const CACHE = 'ember-crypt-v76', LIMIT = 96;
const CORE=['./','./index.html','./assets/cinematic/hero-animation.js','./assets/cinematic/ash-environment.js','./assets/cinematic/zone-environment.js','./assets/cinematic/motion.js','./assets/cinematic/combat-feel.js','./assets/adventure/combat-loot.js','./assets/audio/combat-audio.js','./assets/audio/music.js','./assets/endgame/endless-nights.js','./assets/heroes/mastery.js'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(k => k.startsWith('ember-crypt-') && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async () => {
    const cache=await caches.open(CACHE),cached=await cache.match(request),asset=url.pathname.includes('/assets/');
    // Art and audio are cache-first; game code always tries the network so a
    // new index.html never runs against an older cached module.
    if(asset&&cached&&!url.pathname.endsWith('.js'))return cached;
    try {
      const response=await fetch(request);
      if(response.ok&&(asset||request.mode==='navigate')){
        await cache.put(request,response.clone());
        const keys=await cache.keys();
        const assets=keys.filter(k=>new URL(k.url).pathname.includes('/assets/')&&!k.url.endsWith('.js'));
        for(const key of assets.slice(0,Math.max(0,keys.length-LIMIT)))await cache.delete(key);
      }
      return response;
    } catch(error) {
      if(cached)return cached;
      if(request.mode==='navigate'){const shell=await cache.match(new URL('index.html',self.registration.scope));if(shell)return shell;}
      throw error;
    }
  })());
});
