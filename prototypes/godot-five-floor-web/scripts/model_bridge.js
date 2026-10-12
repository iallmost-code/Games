        // Presentation-only export. Original update(), AI, collision and saves are unchanged.
        function godotPose(){
          if(!hero)return {};
          let fx=hero.class==="ranger"&&hero.cast>.025?(hero.aimX??hero.faceX??0):hero.faceX||0;
          let fy=hero.class==="ranger"&&hero.cast>.025?(hero.aimY??hero.faceY??1):hero.faceY??1;
          let cast=hero.cast;
          if(hero.class==="sunwarden"&&mode==="play"&&hero.hp>0&&enemies.some(e=>Math.hypot(e.x-hero.x,e.y-hero.y)<hero.range)){
            const pulse=clock%1.2;if(pulse<.18){cast=Math.max(cast,.18-pulse);if(sunPulse!==Math.floor(clock/1.2)){sunPulse=Math.floor(clock/1.2);sfx("shoot");}}
          }
          const pose=window.EmberHeroAnimation.choose({kind:hero.class,direction:projectVector(fx,fy),phase:hero.stepPhase,moving:hero.moving,cast,hit:Math.max(0,1-(clock-(hero.lastHit??-99))/.18),dead:hero.hp<=0});
          return {frame:pose.index,flip:pose.flip,variant:profile.mastery?.[hero.class]?.color||0,height:["bloodknight","frostwarden"].includes(hero.class)?90:80};
        }
        let arenaCacheKey="",arenaCache=[];
        function godotArena(){
          if(isDescent()||!hero)return [];
          const cx=Math.floor(hero.x/chamberSize),cy=Math.floor(hero.y/chamberSize),extent=Math.ceil(Math.max(worldW,worldH)/chamberSize)+1,key=[cx,cy,extent].join(":");
          if(key!==arenaCacheKey){const seen=new Set();arenaCache=[];
            for(let x=cx-extent;x<=cx+extent;x+=2)for(let y=cy-extent;y<=cy+extent;y+=2)eachNearbyWall(x*chamberSize,y*chamberSize,(x,y,w,h)=>{let k=x+","+y;if(!seen.has(k)){seen.add(k);arenaCache.push({x,y,w,h});}});
            arenaCacheKey=key;
          }return arenaCache;
        }
        window.emberGodot={
          snapshot(){
            const map=dungeon?{...dungeon,cells:[...dungeon.cells].map(k=>k.split(",").map(Number)),explored:[...dungeon.explored],rooms:floorSpec().rooms,links:floorSpec().links,name:floorSpec().name}:null;
            const heroTrapLinks=[];
            if(hero?.evolutions?.includes("blizzard"))for(let i=1;i<heroTraps.length;i++){let a=heroTraps[i-1],b=heroTraps[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(d>=1&&d<=700&&!segmentBlocked(a.x,a.y,b.x,b.y))heroTrapLinks.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y});}
            return JSON.stringify({camera:{w,h,zoom:1,viewZoom:viewZoom,tilt:cameraTilt,isometric:rpgPreview,focusY:cameraFocusY()},hero:hero||{},heroPose:godotPose(),enemies,companions,drops,sites,things:sites,dungeon:map,zone:currentZone(),clock,quality:visualQuality,arenaWalls:godotArena(),arrivals:arrivalGroups(),floaters,shots,hazards,arcs,meteors,rings,pools,bloodEffects,bloodDaggers,iceWalls,heroTraps,heroZones,heroSpirits,newBloodFx,zoneHazards,dungeonEvent,rpgFx,dashGhosts,adventurePads,adventureBossPads,adventureHazards,adventureBurns,heroTrapLinks,beamEnds:hero?.class==="sunwarden"?beamEnds():[],beamWidth:hero?.class==="sunwarden"?beamWidth():0,mode,runMode,level,kills,flash,shake:shakeEnabled?shake:0});
          },
          diagnostics(){return {mode,hero:hero?.class,floor:dungeon?.floor,errors:recentErrors,assets:Object.keys(art).length,profileVersion:profile?.v,slot:activeSlot};}
        };
        console.log("EMBER_GODOT_MODEL_READY");
