import { spawnSync } from 'node:child_process';
import { readdirSync,readFileSync,statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const dir=fileURLToPath(new URL('.',import.meta.url));
const files=readdirSync(dir).filter(x=>x.endsWith('.test.mjs')).map(x=>join(dir,x));
const tests=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(tests.status!==0)process.exit(tests.status||1);
for(const file of ['index.js','release-2.0.0.js','activation-queue.js','win-activation.js','notification-format.js','host.js','task-state.js','native.js','client.js']){const r=spawnSync(process.execPath,['--check',join(dir,file)],{stdio:'inherit'});assert.equal(r.status,0,file+' syntax');}
const pkg=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));
for(const name of ['index.js','release-2.0.0.js','activation-queue.js','win-activation.js','win-activation.ps1','notification-format.js','host.js','task-state.js','native.js','native-wake.ps1','client.js'])assert.ok(pkg.files.includes(name),'distribution missing '+name);
// The expanded-state art is WebP; a PNG-only manifest silently drops it from the package.
for(const name of ['idle','running','waiting','done','error']){const b=readFileSync(join(dir,'assets',`buddy-${name}.webp`));assert.equal(b.subarray(0,4).toString('latin1'),'RIFF','buddy '+name+' riff');}
assert.ok(pkg.files.includes('assets/*.webp'),'distribution must include WebP artwork');
assert.ok(statSync(join(dir,'icon.png')).size<262144);
for(const name of ['idle','running','waiting','done','error']){for(const suffix of ['', '-icon']){const b=readFileSync(join(dir,'assets',`fish-${name}${suffix}.png`));assert.equal(b.readUInt32BE(0),0x89504e47);assert.ok(b.length>1000);}}
console.log('PASS syntax, manifest distribution, icon size, five whole-body PNG states and notification assets');
