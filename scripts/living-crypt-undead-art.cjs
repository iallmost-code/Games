const sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
// Rebuild from original generated paintings retained by the art session.
// node scripts/living-crypt-undead-art.cjs <directory containing source PNGs>
sharp.concurrency(1); sharp.cache(false);
const sourceDir=process.argv[2]||'/workspace/generated_images';
const root=path.resolve(__dirname,'../assets/cinematic/living-crypt/enemies');
fs.mkdirSync(path.join(root,'provenance'),{recursive:true});
const sources={runner:path.join(sourceDir,'exec-bef2fe6b-c75d-4736-911f-50a83fd21f43.png'),ghoul:path.join(sourceDir,'exec-fa50019f-be8d-4c42-b6f1-92df85facedb.png'),brute:path.join(sourceDir,'exec-63353bde-63cc-402f-8a96-a66bacaca8d7.png'),caster:path.join(sourceDir,'exec-3c3c07e8-4679-4010-9568-aac8de502499.png')};
async function silhouettes(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),stack=new Int32Array(w*h),out=[];let id=0;
 for(let i=0;i<w*h;i++){
  if(labels[i]||data[i*4+3]<24)continue;let n=1,area=0,x0=w,y0=h,x1=0,y1=0;stack[0]=i;labels[i]=++id;
  while(n){const j=stack[--n],x=j%w,y=Math.floor(j/w);area++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const k of [j-1,j+1,j-w,j+w]){if(k<0||k>=w*h||labels[k]||data[k*4+3]<24||((k===j-1||k===j+1)&&Math.floor(k/w)!==y))continue;labels[k]=id;stack[n++]=k;}}
  if(area>300)out.push({id,area,box:[x0,y0,x1+1,y1+1],source:path.basename(file)});
 }
 function isolate(c){const [x0,y0,x1,y1]=c.box,bw=x1-x0,bh=y1-y0,buf=Buffer.alloc(bw*bh*4);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x;let keep=labels[i]===c.id;if(!keep&&data[i*4+3]<24){for(const k of [i-1,i+1,i-w,i+w])if(k>=0&&k<w*h&&labels[k]===c.id)keep=true;}if(keep)data.copy(buf,((y-y0)*bw+x-x0)*4,i*4,i*4+4);}
  return {buffer:buf,width:bw,height:bh};
 }
 return {out,isolate};
}
(async()=>{
 for(const [kind,file] of Object.entries(sources)){
  const src=await silhouettes(file),rows=Array.from({length:6},()=>[]),centers=[115,325,535,750,955,1160];
  for(const c of src.out){const center=(c.box[1]+c.box[3])/2;let row=0;for(let k=1;k<6;k++)if(Math.abs(center-centers[k])<Math.abs(center-centers[row]))row=k;rows[row].push({...c,extract:src.isolate});}
  if(kind==='runner'){const attack=await silhouettes(path.join(sourceDir,'exec-9490e748-a432-4f0a-b933-f8ae9bce947e.png'));console.log('runner attack components',attack.out.map(c=>c.box));if(attack.out.length!==6)throw Error('runner attack count '+attack.out.length);rows[3]=attack.out.map(c=>({...c,extract:attack.isolate}));}
  rows.forEach(r=>r.sort((a,b)=>(a.box[0]+a.box[2])-(b.box[0]+b.box[2])));
  if(rows.some((r,i)=>r.length!==(i===4?2:6)))throw Error(kind+' counts '+rows.map(r=>r.length));
  const walk=rows.slice(0,3).flat(),maxH=Math.max(...walk.map(c=>c.box[3]-c.box[1])),maxW=Math.max(...walk.map(c=>c.box[2]-c.box[0]));
  const scaleY=148/maxH,scaleX=Math.min(scaleY,140/maxW),neutralAttack=rows[3][0];let attackFactor=1;
  if(kind==='runner')attackFactor=(rows[0][0].box[3]-rows[0][0].box[1])/(neutralAttack.box[3]-neutralAttack.box[1]);
  const layers=[],frames=[];
  for(let row=0;row<6;row++)for(let col=0;col<rows[row].length;col++){
   const c=rows[row][col],cut=c.extract(c),factor=row===3?attackFactor:1;
   let width=Math.round(cut.width*scaleX*factor),height=Math.round(cut.height*scaleY*factor);
   const fit=Math.min(1,140/width,152/height);width=Math.max(1,Math.round(width*fit));height=Math.max(1,Math.round(height*fit));
   const image=await sharp(cut.buffer,{raw:{width:cut.width,height:cut.height,channels:4}}).resize(width,height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
   const left=Math.round(72-width/2),top=156-height;
   layers.push({input:image,left:col*144+left,top:row*160+top});
   frames.push({index:row*6+col,row,col,source:c.source,cut:c.box,alphaBounds:[left,top,left+width,top+height],fit:+fit.toFixed(5)});
  }
  const atlas=sharp({create:{width:864,height:960,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers);
  const png=await atlas.png({compressionLevel:9,effort:7}).toBuffer();fs.writeFileSync(path.join(root,kind+'.png'),png);
  const webp=await sharp(png).webp({quality:83,alphaQuality:100,effort:4}).toBuffer();fs.writeFileSync(path.join(root,kind+'.webp'),webp);
  const manifest={kind,format:1,source:'OpenAI image generation; original authored poses referenced to Ember Crypt cinematic monsters',columns:6,rows:6,cell:{width:144,height:160,anchorX:72,anchorY:156},activeFrames:32,blankIndices:[26,27,28,29],rowLabels:['walk-down','walk-side','walk-up','attack','hit','death'],standingScale:{x:scaleX,y:scaleY},webpBytes:webp.length,pngBytes:png.length,frames};
  fs.writeFileSync(path.join(root,'provenance',kind+'.json'),JSON.stringify(manifest,null,2)+'\n');console.log(kind,'WebP',webp.length,'PNG',png.length,'scales',scaleX,scaleY,'walk alpha height',Math.min(...frames.filter(f=>f.row<3).map(f=>f.alphaBounds[3]-f.alphaBounds[1])),Math.max(...frames.filter(f=>f.row<3).map(f=>f.alphaBounds[3]-f.alphaBounds[1])));
 }
})();
