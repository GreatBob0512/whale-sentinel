from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1]
pkg=json.loads((R/'package.json').read_text(encoding='utf8'))
included={R/'package.json'}
for pattern in pkg['files']:included.update(p for p in R.glob(pattern) if p.is_file())
problems=[];count=0
for f in sorted(p for p in included if p.suffix=='.md'):
 for target in re.findall(r'\]\(<?([^)>]+)>?\)',f.read_text(encoding='utf8')):
  if target.startswith(('https:','http:','#','mailto:')):continue
  dest=(f.parent/target.split('#')[0]).resolve();count+=1
  if not dest.exists():problems.append(f'broken: {f.name} -> {target}')
  elif dest not in {p.resolve() for p in included}:problems.append(f'unpackaged: {f.name} -> {target}')
manifest=json.loads((R/'assets/artwork.json').read_text(encoding='utf8'))
assert manifest['id']=='whale-it-seated-v1' and manifest['forms']==['child']
assert manifest['approvedSource']=='outputs/whale-relock/mini-three-views.png'
assert all('frames-seated/' in s['source'] for s in manifest['states'].values())
assert not any('gen' in p.parts for p in included),'exploratory art must not ship'
print('packaged files:',len(included),'| markdown links checked:',count)
print('problems:',problems if problems else 'none')
