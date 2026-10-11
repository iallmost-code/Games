/* World presence: cached, bounded presentation. Never changes a cell, collider,
   actor, clock, save, targeting rule or gameplay RNG. */
(() => {
  'use strict';
  const names=['ash','frost','venom','cathedral','forge'];
  const colors=['#987b59','#83afbd','#819368','#709aa3','#ad7947'];
  const edgeCache=new Map();let beamTile=null;
  const diagnostics={obstacles:0,landmarks:0,rescues:0};
  const hash=(x,y)=>((Math.imul(x+137,73856093)^Math.imul(y+97,19349663))>>>0)/4294967296;
  function variant(zone,x,y){return Math.floor(hash(Math.floor(x/80)+zone*53,Math.floor(y/80))*4);}
  function limits(q){const n=q?.maxAtmosphere??32;return {landmarks:n>=32?3:n>=16?2:1,numbers:n>=32?24:n>=16?18:12};}
  function labels(list,q){const priority=f=>!/^[-−]?\d/.test(f.text);const urgent=list.filter(priority);const ordinary=list.filter(f=>!priority(f));const available=Math.max(0,limits(q).numbers-urgent.length);return urgent.concat(available?ordinary.slice(-available):[]);}
  function occluded(hero,actors,project){return actors.some(e=>{const d=project(e.x-hero.x,e.y-hero.y);return Math.abs(d.x)<(e.r||20)*1.45+23&&d.y>5&&d.y<(e.r||20)*3.5+20;});}
  function heroEdge(ctx,img,x,y,w,h){
    if(!img)return;
    let edge=edgeCache.get(img);
    if(!edge){
      const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      if(!iw||!ih)return;
      edge=document.createElement('canvas');edge.width=iw+8;edge.height=ih+8;
      const g=edge.getContext('2d');
      for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]])g.drawImage(img,4+dx,4+dy);
      g.globalCompositeOperation='source-in';g.fillStyle='#11151b';g.fillRect(0,0,edge.width,edge.height);
      // A narrow light rim sits above the dark edge; the body stays untouched.
      g.globalCompositeOperation='source-over';
      const rim=document.createElement('canvas');rim.width=edge.width;rim.height=edge.height;
      const r=rim.getContext('2d');r.drawImage(img,4,2);r.globalCompositeOperation='source-in';r.fillStyle='#d6c39e';r.fillRect(0,0,rim.width,rim.height);r.globalCompositeOperation='destination-out';r.drawImage(img,4,4);
      g.drawImage(rim,0,0);g.globalCompositeOperation='destination-out';g.drawImage(img,4,4);
      if(edgeCache.size>=32)edgeCache.delete(edgeCache.keys().next().value);edgeCache.set(img,edge);
    }
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    ctx.drawImage(edge,x-4*w/iw,y-4*h/ih,w*(iw+8)/iw,h*(ih+8)/ih);
  }
  function beam(ctx,b,width){
    if(!beamTile){
      beamTile=document.createElement('canvas');beamTile.width=256;beamTile.height=96;
      const g=beamTile.getContext('2d'),side=g.createLinearGradient(0,0,0,96);
      side.addColorStop(0,'#ffe4a000');side.addColorStop(.25,'#ffe4a00b');side.addColorStop(.5,'#fff0c42e');side.addColorStop(.75,'#ffe4a00b');side.addColorStop(1,'#ffe4a000');g.fillStyle=side;g.fillRect(0,0,256,96);
      const ends=g.createLinearGradient(0,0,256,0);ends.addColorStop(0,'#ffffff00');ends.addColorStop(.12,'#fff');ends.addColorStop(.72,'#fff');ends.addColorStop(1,'#ffffff00');g.globalCompositeOperation='destination-in';g.fillStyle=ends;g.fillRect(0,0,256,96);
    }
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.drawImage(beamTile,0,-width,b.length,width*2);ctx.restore();
  }
  function drawObstacle(ctx,s,x,y,w,h){
    if(!s.isometric)return false;
    const zone=s.zone%3,style=variant(zone,x,y),footX=x+w/2,footY=y+h+9;
    const tomb=s.art['prop-tomb-'+zone];if(!tomb)return false;
    s.sceneItem(footX,footY,()=>{
      const d=s.projectVector(footX-s.hero.x,footY-s.hero.y);
      const fade=Math.abs(d.x)<w*.8+20&&d.y>-15&&d.y<145;
      ctx.save();
      // The whole original collision footprint always remains visible.
      ctx.fillStyle='#080e14b8';ctx.fillRect(x,y,w,h);ctx.strokeStyle=colors[zone]+'8c';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
      ctx.globalAlpha=fade?.28:.76;
      if(style===0)s.drawProp('prop-tomb-'+zone,footX,footY,w+13,h+47);
      else {
        const lift=s.inputVector(0,-22),top=[[x+lift.x,y+lift.y],[x+w+lift.x,y+lift.y],[x+w+lift.x,y+h+lift.y],[x+lift.x,y+h+lift.y]];
        ctx.fillStyle=['#302d29','#26343a','#2b3327'][zone];ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(top[2][0],top[2][1]);ctx.lineTo(top[3][0],top[3][1]);ctx.closePath();ctx.fill();
        ctx.fillStyle=['#484139','#3d4e56','#424a37'][zone];ctx.beginPath();top.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill();ctx.strokeStyle=colors[zone]+'99';ctx.lineWidth=1.5;ctx.stroke();
        const prefix='prop-'+names[zone]+'-';
        if(style===1){s.drawProp(prefix+'statue',footX,footY-12,w*.7,108);s.drawProp(prefix+'bones',footX-w*.23,footY-4,48,30);}
        else if(style===2){s.drawProp(prefix+'column',footX-w*.27,footY-12,43,98);s.drawProp(prefix+'column',footX+w*.27,footY-12,43,74);s.drawProp(prefix+'seal',footX,footY-20,55,35);}
        else {s.drawProp(prefix+'bones',footX,footY-16,w*.8,52);ctx.strokeStyle=colors[zone]+'aa';ctx.beginPath();ctx.moveTo(x+15,y+18);ctx.lineTo(x+w*.53,y+h*.46);ctx.lineTo(x+w-14,y+h-15);ctx.stroke();s.drawProp(prefix+'coffin',footX+w*.16,footY-8,w*.65,64);}
      }
      ctx.restore();
    });diagnostics.obstacles++;return true;
  }
  function begin(){diagnostics.obstacles=0;diagnostics.landmarks=0;diagnostics.rescues=0;}
  function landmarks(ctx,s){
    if(!s.isometric)return;
    const cap=limits(s.quality).landmarks,zone=s.zone??0,prefix='prop-'+names[zone]+'-';
    const positions=s.isDescent?s.rooms.map(([x,y,w,h])=>({x:(x+w*.5)*80,y:(y+.5)*80})):Array.from({length:9},(_,i)=>({x:(Math.floor(s.hero.x/960)+i%3-1)*960+460,y:(Math.floor(s.hero.y/960)+Math.floor(i/3)-1)*960+165}));
    for(const p of positions){if(diagnostics.landmarks>=cap)break;if(!s.visiblePoint(p.x,p.y,170))continue;
      const arch=s.art[prefix+'arch'];if(!arch)continue;
      diagnostics.landmarks++;const d=s.projectVector(p.x-s.hero.x,p.y-s.hero.y),alpha=Math.abs(d.x)<115&&d.y>-30&&d.y<160?.16:.63;
      // Engravings and architectural accents are decoration, never pits or blockers.
      const seal=s.art[prefix+'seal'];if(seal){ctx.save();ctx.globalAlpha=.11;ctx.drawImage(seal,p.x-82,p.y-42,164,84);ctx.restore();}
      s.sceneItem(p.x,p.y,()=>{ctx.save();ctx.globalAlpha=alpha;s.drawProp(prefix+'arch',p.x,p.y,150,132);s.drawProp(prefix+'column',p.x-81,p.y,46,100);s.drawProp(prefix+'column',p.x+81,p.y,46,100);ctx.restore();});
    }
  }
  function rescue(ctx,o){diagnostics.rescues++;ctx.save();ctx.globalAlpha=o.alpha;sprite(ctx,o);ctx.restore();}
  function sprite(ctx,o){const selected=window.EmberHeroAnimation?.choose(o),img=window.EmberHeroAnimation?.frame(o.kind,selected?.index,o.variant||0);if(!img)return;const recoil=window.EmberCombatFeel?.pose(o);if(recoil){ctx.translate(recoil.x,recoil.y);ctx.rotate(recoil.rotation);ctx.scale(recoil.scaleX,recoil.scaleY);}if(selected.flip)ctx.scale(-1,1);const z=o.height/192;heroEdge(ctx,img,-112*z,-188*z,224*z,192*z);ctx.globalAlpha*=.8;ctx.drawImage(img,-112*z,-188*z,224*z,192*z);}
  window.EmberPresence=Object.freeze({begin,variant,limits,labels,occluded,heroEdge,beam,drawObstacle,landmarks,rescue,stats:()=>({...diagnostics,edgeCache:edgeCache.size})});
})();
