import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/**
 * The panel recolors itself from host theme tokens. These are the token values
 * published by the installed DSH theme (neutral-bluish palette); recopy them if
 * the host palette changes. The test guards the mix ratios, not the host.
 */
const TOKENS={
 light:{layer1:'#ffffff',overlay:'#e9ecf2',ink:'#0f1115',muted:'#61666b'},
 dark:{layer1:'#232324',overlay:'#61666b',ink:'#f9fafb',muted:'#cfd3d6'}
};
const PEACH=[255,223,192];
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,w)=>a.map((v,i)=>Math.round(v*w+b[i]*(1-w)));
const luminance=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};const[r,g,b]=c.map(f);return 0.2126*r+0.7152*g+0.0722*b};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const css=readFileSync(new URL('./src/client-panel.js',import.meta.url),'utf8');

test('panel surface and card mixes stay on the host tokens',()=>{
 assert.match(css,/--paper:color-mix\(in srgb,var\(--dsw-alias-bg-layer-1[^)]*\) 90%,#FFDFC0 10%\)/,'paper is 90% host surface + 10% warm tint');
 assert.match(css,/--card:color-mix\(in srgb,var\(--dsw-alias-bg-overlay[^)]*\) 55%,var\(--dsw-alias-bg-layer-1[^)]*\) 45%\)/,'cards mix overlay and surface');
 assert.match(css,/--ink:var\(--dsw-alias-label-primary/,'text uses the host label token');
 assert.match(css,/--muted:var\(--dsw-alias-label-secondary/,'secondary text uses the host token');
});

for(const[name,tokens]of Object.entries(TOKENS)){
 test(`${name} theme keeps readable contrast`,()=>{
  const paper=mix(hex(tokens.layer1),PEACH,0.9);
  const card=mix(hex(tokens.overlay),hex(tokens.layer1),0.55);
  const ink=hex(tokens.ink),muted=hex(tokens.muted);
  assert.ok(contrast(ink,paper)>=7,`${name} primary text on paper is ${contrast(ink,paper).toFixed(2)}:1`);
  assert.ok(contrast(ink,card)>=7,`${name} primary text on cards is ${contrast(ink,card).toFixed(2)}:1`);
  assert.ok(contrast(muted,paper)>=4.5,`${name} secondary text is ${contrast(muted,paper).toFixed(2)}:1`);
 });
}
