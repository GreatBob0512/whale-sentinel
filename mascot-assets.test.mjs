import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('.',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(new URL(p,root));
const client=read('client.js').toString('utf8');
let manifest=null;try{manifest=JSON.parse(read('assets/artwork.json'))}catch{}
const phases=['idle','running','waiting','done','error'];
function imageShape(b){assert.equal(b.readUInt32BE(0),0x89504e47);return[b.readUInt32BE(16),b.readUInt32BE(20)];}
function inline(name){const text=client.slice(client.indexOf('const '+name+' = {'));return text.slice(0,text.indexOf('    };'));}
test('runtime artwork records the actual user-approved source instead of an old candidate',()=>{
 assert.ok(manifest,'approved-artwork manifest must be distributed');
 assert.equal(manifest.id,'whale-it-seated-v1');
 assert.deepEqual(manifest.forms,['child']);
 assert.equal(manifest.approvedSource,'outputs/whale-relock/mini-three-views.png');
 assert.equal(manifest.approvedSha256,'cfd45958ad3b04ffe7eeadc65e1d436782eacc80427c9c9df63cbc5dc9b422a9');
 assert.equal(manifest.sheetSha256,'8c1c5513db3c7a454cb54c2adf01f7f8763077fa2fd9e255cf4a547026924f17');
 assert.deepEqual(Object.keys(manifest.states).sort(),[...phases].sort());
});
test('each IT state shows a distinct seated working pose, not five copies of one drawing',()=>{
 const seen=new Set();
 for(const phase of phases){const h=sha(read('assets/fish-'+phase+'.png'));assert.equal(seen.has(h),false,phase+' duplicates another state');seen.add(h);}
 assert.equal(seen.size,5);
});
test('each phase ships full-height artwork and pixel-identical inline copies',()=>{
 assert.ok(manifest,'manifest missing');const sprites=inline('SPRITES'),icons=inline('NOTIFY_FACES');
 for(const phase of phases){
  const row=manifest.states[phase];
  for(const[suffix,size]of [['',[384,576]],['-icon',[128,128]],['-side',[160,192]]]){
   const b=read('assets/fish-'+phase+suffix+'.png');assert.deepEqual(imageShape(b),size,phase+suffix+' geometry');
   assert.equal(sha(b),row.files[suffix||'sprite'].sha256,phase+suffix+' manifest hash');
  }
  for(const[block,suffix]of [[sprites,''],[icons,'-icon']]){
   const value=block.match(new RegExp('\\b'+phase+": 'data:image/png;base64,([^']+)'"));assert.ok(value,phase+' inline');
   assert.deepEqual(Buffer.from(value[1],'base64'),read('assets/fish-'+phase+suffix+'.png'),phase+' inline must equal shipped image');
  }
  assert.ok(row.normalizedBounds[0]>=8&&row.normalizedBounds[1]>=8&&row.normalizedBounds[2]<=376&&row.normalizedBounds[3]<=568,phase+' includes full body with safe margins');
 }
});
test('opening the panel swaps the seated mascot for the grab-and-point buddy',()=>{
 assert.ok(manifest.buddy,'expanded state artwork must be described');
 assert.equal(manifest.buddy.format,'webp');
 assert.equal(manifest.buddy.crop,'tight bounds, no transparent padding','padding would inflate the rendered size');
 for(const phase of phases){
  const b=read('assets/buddy-'+phase+'.webp');
  assert.equal(b.subarray(0,4).toString('latin1'),'RIFF',phase+' buddy riff');
  assert.equal(b.subarray(8,12).toString('latin1'),'WEBP',phase+' buddy webp');
  assert.equal(sha(b),manifest.buddy.states[phase].sha256,phase+' buddy hash');
  const value=inline('BUDDY').match(new RegExp('\\b'+phase+": 'data:image/webp;base64,([^']+)'"));
  assert.ok(value,phase+' buddy inline');
  assert.deepEqual(Buffer.from(value[1],'base64'),b,phase+' buddy inline must equal shipped image');
  assert.ok(manifest.buddy.states[phase].size[1]>=440,phase+' buddy must stay sharp when scaled');
 }
 assert.match(client,/open \? BUDDY\[phase\] : spriteUrl\(phase\)/,'open state must switch artwork');
});
test('icon wrappers and failure state never reveal the retired character',()=>{
 const svg=read('icon.svg').toString('utf8'),value=svg.match(/data:image\/png;base64,([^"']+)/);assert.ok(value);
 assert.deepEqual(Buffer.from(value[1],'base64'),read('icon.png'),'SVG wrapper uses the new icon');
 assert.doesNotMatch(client,/function SvgMascot/,'old drawn character must not reappear on image failure');
 const markers=[...client.matchAll(/'data-artwork':\s*'([^']+)'/g)].map(m=>m[1]);
 assert.ok(markers.length>=2,'live DOM must expose the artwork generation');
 for(const m of markers) assert.equal(m,manifest.id,'every data-artwork marker must match the manifest id');
 assert.match(client,/data-artwork/,'live DOM exposes the actual artwork generation for acceptance');
});
test('art upgrade stays small and contains only intended runtime resources',()=>{
 const pkg=JSON.parse(read('package.json'));assert.ok(pkg.files.includes('assets/*.png'),'do not ship exploratory gen/ images');
 assert.ok(pkg.files.includes('assets/*.webp'),'expanded-state WebP is a shipped asset, not only an inline copy');
 assert.ok(pkg.files.includes('assets/artwork.json'));
 // 2.0 adds narrow-viewport and dark-mode rules; the inline budget only grows
 // with documented UI work, never with extra embedded artwork.
 assert.ok(read('client.js').length<720000,'inline runtime budget 720KB');
});
