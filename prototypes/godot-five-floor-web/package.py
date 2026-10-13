from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_STORED
import json,hashlib
root=Path(__file__).resolve().parent;out=root/'downloads';out.mkdir(exist_ok=True)
def included(p):
 rel=p.relative_to(root)
 return not any(n in ['.godot','downloads','tests','__pycache__'] for n in rel.parts) and p.suffix not in ['.import','.uid','.py'] and p.name!='verification.json'
files=sorted(p for p in root.rglob('*') if p.is_file() and not p.is_symlink() and included(p))
dirs=set(parent for f in files for parent in f.relative_to(root).parents if str(parent)!='.')
target=out/'EmberCrypt-25D-Polish.zip'
with ZipFile(target,'w',allowZip64=False) as z:
 for d in sorted(dirs,key=lambda p:(len(p.parts),str(p))):
  info=ZipInfo(d.as_posix()+'/',(2026,10,12,0,0,0));info.create_system=0;info.external_attr=0x10;info.compress_type=ZIP_STORED;z.writestr(info,b'')
 for f in files:
  name=f.relative_to(root).as_posix()+('.bin' if f.suffix=='.webp' else '')
  info=ZipInfo(name,(2026,10,12,0,0,0));info.create_system=0;info.external_attr=0;info.compress_type=ZIP_STORED;z.writestr(info,f.read_bytes())
with ZipFile(target) as z:
 names=set(z.namelist());assert 'project.godot' in names and z.testzip() is None
 for name in names:
  assert not name.startswith('/') and '..' not in Path(name).parts and '\\' not in name
  assert all(p.as_posix()+'/' in names for p in Path(name).parents if str(p)!='.')
report={'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'entries':len(names),'crc':'PASS','explicitParentDirectories':True,'rootProject':True}
(out/'package-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
