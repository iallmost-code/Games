(function(){
  const host=parent.emberGodotHost;
  // Fullscreen must include the native Godot canvas beneath this frame.
  Object.defineProperty(document,'fullscreenEnabled',{get:()=>parent.document.fullscreenEnabled});
  Object.defineProperty(document,'fullscreenElement',{get:()=>parent.document.fullscreenElement});
  document.documentElement.requestFullscreen=()=>parent.document.documentElement.requestFullscreen({navigationUI:'hide'});
  document.exitFullscreen=()=>parent.document.exitFullscreen();
  const nativeStorage=window.localStorage,prefix='godot-ec-five-v1:';
  const storage={getItem:k=>nativeStorage.getItem(prefix+k),setItem:(k,v)=>nativeStorage.setItem(prefix+k,v),removeItem:k=>nativeStorage.removeItem(prefix+k),clear:()=>{for(const k of Object.keys(nativeStorage))if(k.startsWith(prefix))nativeStorage.removeItem(k);},key:i=>Object.keys(nativeStorage).filter(k=>k.startsWith(prefix))[i]?.slice(prefix.length)??null};
  Object.defineProperty(storage,'length',{get:()=>Object.keys(nativeStorage).filter(k=>k.startsWith(prefix)).length});
  Object.defineProperty(window,'localStorage',{value:storage});
  window.godotPreviewAllHeroes=storage.getItem('godot-preview-all-heroes')!=='0';
  const urlFor=value=>{
    let p;try{p=new URL(String(value),document.baseURI).pathname.replace(/^\//,'');}catch{return value;}
    return host.urls[p]||host.urls[p.replace(/\.png$/,'.webp')]||value;
  };
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(v){descriptor.set.call(this,urlFor(v));}});
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,options)=>originalFetch(urlFor(typeof input==='string'?input:input.url),options);
  addEventListener('keydown',e=>{if(e.key==='F5'){e.preventDefault();parent.document.getElementById('editor-canvas')?.focus();}});
})();
