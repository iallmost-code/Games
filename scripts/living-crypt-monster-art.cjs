// Reproducible normalization of original, image-generated keyframe paintings.
// Usage: node scripts/living-crypt-monster-art.cjs <original source directory>
// Original sources are retained under /workspace/generated_images in the art session.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '../assets/cinematic/living-crypt/enemies');
const sources = {
  skeleton: {file: 'exec-c1a9195c-13a7-4544-b400-db5c5c9205fa.png'},
  sentinel: {file: 'exec-91be3f6d-df8b-49dd-aeb1-11547384054b.png'},
  wraith: {file: 'exec-613fac52-3b5f-42de-94eb-a20be82c90d0.png'},
  burrower: {file: 'exec-a162820c-e7e1-440e-b7c1-b5e6d286d6bc.png'}
};
function occupied(data,w,h) {
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>12){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0)throw Error('Blank authored frame');
  return {x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
}
async function bake(kind,sourceDir) {
  const source=sources[kind],file=path.join(sourceDir,source.file);
  const original=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=original.info.width,h=original.info.height,pixels=original.data;
  const visited=new Uint8Array(w*h),labels=new Int16Array(w*h),components=[];
  // The authored frames have variable gutters. Identify full poses globally,
  // rather than rectangular grid cuts that could truncate a sword or cape.
  for(let i=0;i<w*h;i++) {
    if(visited[i]||pixels[i*4+3]<100)continue;
    const members=[i];visited[i]=1;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let cursor=0;cursor<members.length;cursor++) {
      const v=members[cursor],x=v%w,y=Math.floor(v/w);
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [v-1,v+1,v-w,v+w])if(n>=0&&n<w*h&&!visited[n]&&pixels[n*4+3]>=100&&Math.abs(n%w-x)<=1){visited[n]=1;members.push(n);}
    }
    if(members.length>300)components.push({members,b:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},cx:(x0+x1)/2,cy:(y0+y1)/2});
  }
  if(components.length!==32)throw Error(kind+' needs 32 full authored poses; found '+components.length);
  const centers=[110,315,520,725,925,1125];
  const rows=Array.from({length:6},()=>[]);
  for(const c of components){let row=0;for(let r=1;r<6;r++)if(Math.abs(c.cy-centers[r])<Math.abs(c.cy-centers[row]))row=r;rows[row].push(c);}
  const ordered=[];
  rows.forEach((row,r)=>{if(row.length!==(r===4?2:6))throw Error(kind+' authored row '+r+' has '+row.length+' poses');row.sort((a,b)=>a.cx-b.cx);row.forEach((c,col)=>{c.row=r;c.col=col;c.index=r*6+col;c.label=ordered.length+1;ordered.push(c);for(const p of c.members)labels[p]=c.label;});});
  // Multi-source alpha growth retains soft edge pixels without stealing the
  // adjacent pose's painted anatomy where faint spectral glows touch.
  const queue=ordered.flatMap(c=>c.members);
  for(let cursor=0;cursor<queue.length;cursor++) {
    const v=queue[cursor],x=v%w;
    for(const n of [v-1,v+1,v-w,v+w])if(n>=0&&n<w*h&&!labels[n]&&pixels[n*4+3]>8&&Math.abs(n%w-x)<=1){labels[n]=labels[v];queue.push(n);}
  }
  const frameData=[];
  for(let row=0;row<6;row++)for(let col=0;col<6;col++) {
    if(row===4&&col>1){frameData.push(null);continue;}
    const component=ordered.find(c=>c.row===row&&c.col===col);
    const isolated=Buffer.alloc(w*h*4);
    for(let i=0;i<w*h;i++)if(labels[i]===component.label)pixels.copy(isolated,i*4,i*4,i*4+4);
    const full=occupied(isolated,w,h);
    if(full.x<1||full.y<1||full.x+full.width>w-1||full.y+full.height>h-1)throw Error(kind+' frame '+component.index+' touches source edge');
    const cut={left:full.x-1,top:full.y-1,width:full.width+2,height:full.height+2};
    const extracted=await sharp(isolated,{raw:{width:w,height:h,channels:4}}).extract(cut).raw().toBuffer({resolveWithObject:true});
    const {data,info}=extracted,b=occupied(data,info.width,info.height);
    let sum=0,total=0;
    for(let y=Math.max(b.y,b.y+b.height-Math.round(b.height*.12));y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++){
      const a=data[(y*info.width+x)*4+3];if(a>96){sum+=x*a;total+=a;}
    }
    // A skitterer's broad claw footprint and a floating shroud have no single
    // planted boot; their base is the full silhouette's center, not one claw.
    const foot=(kind==='burrower'||kind==='wraith')?b.x+b.width/2:(total?sum/total:b.x+b.width/2);
    const cropped=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:b.x,top:b.y,width:b.width,height:b.height}).png().toBuffer();
    frameData.push({row,col,cut,b,foot:foot-b.x,cropped,componentPixels:component.members.length});
  }
  const standing=frameData.slice(0,18),yScale=148/Math.max(...standing.map(f=>f.b.height));
  const xScale=Math.min(yScale,...standing.map(f=>70/Math.max(f.foot,f.b.width-f.foot)));
  const composites=[],metadata=[];
  for(let index=0;index<36;index++) {
    const f=frameData[index];if(!f){metadata.push({index,blank:true});continue;}
    const sx=Math.min(xScale,70/Math.max(f.foot,f.b.width-f.foot));
    const sy=Math.min(yScale,148/f.b.height);
    const width=Math.max(1,Math.round(f.b.width*sx)),height=Math.max(1,Math.round(f.b.height*sy));
    const foot=Math.round(f.foot*width/f.b.width);
    const left=72-foot,top=156-height;
    if(left<2||left+width>142||top<6)throw Error(kind+' frame '+index+' touches gutter');
    const input=await sharp(f.cropped).resize(width,height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
    composites.push({input,left:(index%6)*144+left,top:Math.floor(index/6)*160+top});
    metadata.push({index,sourceCut:f.cut,sourceBounds:f.b,sourceComponentPixels:f.componentPixels,bounds:{x:left,y:top,width,height},foot:{x:72,y:156}});
  }
  const png=await sharp({create:{width:864,height:960,channels:4,background:'#00000000'}}).composite(composites).png({compressionLevel:9,palette:false}).toBuffer();
  fs.writeFileSync(path.join(root,kind+'.png'),png);
  await sharp(png).webp({quality:82,alphaQuality:95,effort:6}).toFile(path.join(root,kind+'.webp'));
  const provenance={kind,authoring:'Original image-generated painted keyframes matched to existing monsters.png. Entire authored pose alpha-components extracted globally with antialias edge ownership; no source-edge truncation or still-sprite transform animation.',source:source.file,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sheet:{width:864,height:960,columns:6,rows:6,cellWidth:144,cellHeight:160,anchor:{x:72,y:156},rows:['walk-down-6','walk-side-6','walk-up-6','attack-6','hit-2-plus-4-empty','death-6']},standingScale:{x:xScale,y:yScale},frames:metadata};
  fs.writeFileSync(path.join(root,kind+'.art.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(kind,fs.statSync(path.join(root,kind+'.webp')).size,'bytes WebP',standing.map(f=>Math.round(f.b.height*yScale)));
}
(async()=>{const sourceDir=process.argv[2]||'/workspace/generated_images';for(const kind of Object.keys(sources))await bake(kind,sourceDir);})().catch(e=>{console.error(e);process.exitCode=1;});
