"""Build simple root-level ZIP packages for the Godot Web Editor's preload input."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED
import json,hashlib
root=Path(__file__).resolve().parent
out=root/'downloads';out.mkdir(exist_ok=True)
report=[]
for folder,name in [('ImportTest','EmberCrypt-Import-Test.zip'),('EmberCryptWebEditor','EmberCrypt-Frost-Vault.zip')]:
 source=root/folder;target=out/name
 with ZipFile(target,'w',compression=ZIP_STORED,allowZip64=False) as z:
  # Godot's project installer expects explicit directory records before files.
  # Generic unzip tools create implicit parents; the Web Editor does not.
  for d in sorted((d for d in source.rglob('*') if d.is_dir() and '.godot' not in d.relative_to(source).parts),key=lambda d:(len(d.relative_to(source).parts),d.as_posix())):
   info=ZipInfo(d.relative_to(source).as_posix()+'/',date_time=(2026,10,12,0,0,0));info.create_system=0;info.external_attr=0x10;info.compress_type=ZIP_STORED
   z.writestr(info,b'')
  for f in sorted(source.rglob('*')):
   rel=f.relative_to(source)
   if not f.is_file() or f.is_symlink() or '.godot' in rel.parts or f.suffix in ['.import','.uid'] or f.name=='validation.json':continue
   info=ZipInfo(rel.as_posix(),date_time=(2026,10,12,0,0,0));info.create_system=0;info.external_attr=0;info.compress_type=ZIP_STORED
   z.writestr(info,f.read_bytes())
 with ZipFile(target) as z:
  names=set(z.namelist())
  assert all(str(parent)+'/' in names for n in names for parent in Path(n).parents if str(parent)!='.'), 'Missing explicit parent directory'
  assert z.testzip() is None and 'project.godot' in z.namelist()
  assert all(not n.startswith('/') and '..' not in Path(n).parts and '\\' not in n for n in z.namelist())
 report.append({'file':name,'bytes':target.stat().st_size,'entries':len(z.namelist()),'crc':'PASS','root_project':True,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(out/'package-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
