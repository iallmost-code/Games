// Original authored pose sequences. Presentation only; attack clocks and hitboxes stay in the game.
(()=>{'use strict';
const sheets=new Map(),pending=new Set(),lastDraw=new Map(),deathStarted=new Map();
function decode(kind,image){
 const cw=image.naturalWidth/6,ch=image.naturalHeight/5,probe=document.createElement('canvas');probe.width=image.naturalWidth;probe.height=image.naturalHeight;const g=probe.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);const px=g.getImageData(0,0,probe.width,probe.height).data,baseline=[];
 for(let row=0;row<5;row++)for(let col=0;col<6;col++){let foot=0;for(let y=0;y<Math.floor(ch);y++)for(let x=row===4&&col>=3?0:Math.floor(cw*.23);x<(row===4&&col>=3?cw:cw*.77);x++){const index=((Math.floor(row*ch+y)*probe.width)+Math.floor(col*cw+x))*4;if(px[index+3]>90)foot=y;}baseline.push(foot);}
 const standing=baseline.slice(0,18).sort((a,b)=>a-b)[9],scale=170/Math.max(1,standing),frames=[];
 for(let i=0;i<30;i++){const tile=document.createElement('canvas');tile.width=224;tile.height=192;const c=tile.getContext('2d'),row=Math.floor(i/6),col=i%6;const foot=baseline[i];c.drawImage(image,col*cw,row*ch,cw,ch,112-cw*scale/2,188-foot*scale,cw*scale,ch*scale);frames.push(tile);}
 probe.width=probe.height=1;sheets.set(kind,frames);pending.delete(kind);
}
function load(kind){if(sheets.has(kind)||pending.has(kind))return;pending.add(kind);let fallback=false;const image=new Image();image.onload=()=>{try{decode(kind,image);}catch{pending.delete(kind);}};image.onerror=()=>{if(!fallback){fallback=true;image.src='assets/cinematic/'+kind+'-animation.png';}else pending.delete(kind);};image.src='assets/cinematic/'+kind+'-animation.webp';}
function ensure(){load('gravecaller');load('bloodknight');}
function choose(o){const dir=o.direction||{x:0,y:1},side=Math.abs(dir.x)>Math.abs(dir.y)*.72;let row=side?1:dir.y<-.15?2:0,col=0,flip=side&&dir.x<0;
 if(o.dead){row=4;col=3+Math.min(2,Math.floor(Math.max(0,o.deathProgress||0)*3));flip=false;}
 else if(o.hit>0){row=4;col=Math.min(2,Math.floor((1-o.hit)*3));flip=false;}
 else if(o.cast>.025){row=3;const duration=o.kind==='bloodknight'?.24:.18;col=Math.min(5,Math.max(0,Math.floor((1-Math.min(1,o.cast/duration))*6)));flip=dir.x<0;}
 else if(o.moving)col=Math.floor((((o.phase||0)%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2/6));
 return {index:row*6+col,row,col,flip};}
function draw(ctx,o){const frames=sheets.get(o.kind);if(!frames)return false;if(o.dead){if(!deathStarted.has(o.kind))deathStarted.set(o.kind,performance.now());o={...o,deathProgress:Math.min(1,(performance.now()-deathStarted.get(o.kind))/650)};}else deathStarted.delete(o.kind);const selected=choose(o);ctx.save();if(selected.flip)ctx.scale(-1,1);const size=o.height/192;ctx.drawImage(frames[selected.index],-112*size,-188*size,224*size,192*size);ctx.restore();lastDraw.set(o.kind,selected);return true;}
window.EmberHeroAnimation={ensure,draw,choose,ready:kind=>sheets.has(kind),diagnostics:()=>({loaded:[...sheets.keys()],frames:[...sheets.values()].reduce((n,f)=>n+f.length,0),lastDraw:Object.fromEntries(lastDraw)})};
})();
