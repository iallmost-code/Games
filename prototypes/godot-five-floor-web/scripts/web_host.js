(function(){
  const old=window.emberGodotHost;if(old)old.close();
  const host=window.emberGodotHost={urls:{},frame:null,addFile(path,base64,mime){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));this.urls[path]=URL.createObjectURL(new Blob([bytes],{type:mime}));},start(html){
    const frame=document.createElement('iframe');frame.id='ember-godot-ui';frame.title='Ember Crypt gameplay controls and menus';frame.allow='fullscreen; autoplay; clipboard-write';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:3;';
    const container=document.getElementById('tab-game')||document.getElementById('game-canvas')?.parentElement||document.body;
    container.style.position='relative';container.appendChild(frame);this.frame=frame;
    const canvas=document.getElementById('game-canvas');
    const align=()=>{if(!canvas)return;const a=canvas.getBoundingClientRect(),b=container.getBoundingClientRect();if(a.width&&a.height){frame.style.inset='auto';frame.style.left=(a.left-b.left)+'px';frame.style.top=(a.top-b.top)+'px';frame.style.width=a.width+'px';frame.style.height=a.height+'px';}};
    this.align=align;this.observer=new ResizeObserver(align);this.observer.observe(canvas||container);addEventListener('resize',align);align();frame.srcdoc=html;
    frame.addEventListener('load',()=>{frame.contentWindow.focus();console.log('EMBER_GODOT_UI_LOADED');});
  },presented(hero,floor,pose){const previous=this.nativeFrame?.frames||0;this.nativeFrame={hero,floor,pose,frames:previous+1};},getSnapshot(){try{return this.frame?.contentWindow.emberGodot?.snapshot()||'';}catch(e){console.error('Ember snapshot',e);return '';}},close(){this.observer?.disconnect();if(this.align)removeEventListener('resize',this.align);this.frame?.remove();Object.values(this.urls).forEach(URL.revokeObjectURL);}};
})();
