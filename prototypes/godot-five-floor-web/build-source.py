"""Bundle the unmodified game's model/modules for the Web-only Godot renderer."""
from pathlib import Path
import re,json,hashlib,shutil
root=Path(__file__).resolve().parents[2]; project=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
# Only presentation and preview availability differ; combat and saves remain original.
start=html.index('        function draw() {');end=html.index('        function frame(t)',start)
prefix=html[start:html.index('          ctx.clearRect',start)]
html=html[:start]+prefix+'          drawMinimap();\n        }\n'+html[end:]
start=html.index('        function descendDeeper(){');end=html.index('        function drawDeepGround',start)
html=html[:start]+'''        function descendDeeper(){showToast("This Web Editor preview contains the first five floors.");}
        function decorateDeepVictory(){
          if(isDescent()&&dungeon.floor===5)descEl.innerHTML+="<p>Five-floor Godot preview complete. Your victory rewards and cleared unlock are preserved.</p>";
        }
'''+html[end:]
html=html.replace('let unlocked=selectedHero==="gravecaller"||!!profile[selectedHero];','let unlocked=window.godotPreviewAllHeroes||selectedHero==="gravecaller"||!!profile[selectedHero];')
html=html.replace('let unlocked = key === "gravecaller" || !!profile[key];','let unlocked = window.godotPreviewAllHeroes || key === "gravecaller" || !!profile[key];')
html=html.replace('.filter(h=>profile[h])','.filter(h=>window.godotPreviewAllHeroes||profile[h])')
html=html.replace('let saved = readRun();\n          if (!saved)', 'let saved = readRun();\n          if(saved?.runMode==="descent"&&saved?.floor>5){showToast("This preview supports floors 1–5. Your deeper saved run is preserved.");return;}\n          if (!saved)')
html=html.replace('const GAME_VERSION = "v78 · ENDLESS OVERTIME";', 'const GAME_VERSION = "GODOT WEB · FIVE-FLOOR PREVIEW";')
# Add a menu-only availability toggle, never rewrite earned unlock flags.
needle='          renderMastery(body,selectedHero);'
html=html.replace(needle,needle+'''\n          body.append(menuButton("PLAYTEST ALL HEROES: "+(window.godotPreviewAllHeroes?"ON":"OFF"),()=>{window.godotPreviewAllHeroes=!window.godotPreviewAllHeroes;localStorage.setItem("godot-preview-all-heroes",window.godotPreviewAllHeroes?"1":"0");renderHeroScreen();}),menuText("p","Playtest access does not change earned unlocks or rewards.","menu-note"));''')
bridge=(project/'scripts/model_bridge.js').read_text()
html=html.replace('        requestAnimationFrame(frame);\n        document.addEventListener',bridge+'\n        requestAnimationFrame(frame);\n        document.addEventListener')
# Self-contained inline modules; audio keeps a deterministic base URL through <base>.
modules={}
def inline(m):
 path=m.group(1);code=(root/path).read_text();modules[path]=hashlib.sha256(code.encode()).hexdigest()
 return '<script>'+code.replace('</script>','<\\/script>')+'</script>'
html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
html=re.sub(r'<link rel="(?:manifest|apple-touch-icon)"[^>]*>', '',html)
html=re.sub(r'    <script>\s*if \("serviceWorker"[\s\S]*?</script>', '',html)
html=html.replace('<head>','<head><base href="https://ember-godot.invalid/">\n<script>'+ (project/'scripts/frame_bootstrap.js').read_text()+'</script>')
html=html.replace('</head>','<style>html,body,#game.game{background:transparent!important}#view{opacity:0!important}body{margin:0}.game{width:100%!important;height:100dvh!important;max-width:none!important}</style></head>')
source=project/'source';source.mkdir(exist_ok=True)
(source/'index.html').write_text(html)
files=[]
for f in sorted((root/'assets').rglob('*')):
 if not f.is_file() or f.suffix not in ['.webp','.wav']:continue
 # Raw .bin avoids importing the JS-model's textures a second time in Godot.
 path=f.relative_to(root).as_posix();target=source/(path+'.bin');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,target)
 files.append({'path':path,'file':'res://source/'+path+'.bin','mime':'image/webp' if f.suffix=='.webp' else 'audio/wav','sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(source/'files.json').write_text(json.dumps(files,separators=(',',':')))
(source/'provenance.json').write_text(json.dumps({'base':'ffa4c79f846a0e88218c549bea29e77afc8c35d8','indexSha256':hashlib.sha256((root/'index.html').read_bytes()).hexdigest(),'modules':modules,'changes':['native rendering replaces draw body','preview-only hero availability toggle','first-five-floor ceiling','isolated browser storage','snapshot export','Web preview version label']},indent=2)+'\n')
print('Bundled',len(files),'assets and',len(modules),'original modules')
