import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// The shipped client stays a single browser artifact, but its source is split
// into parts and its artwork is generated from assets/. Regenerate with
// `node scripts/build-client.mjs`; `--check` fails when they disagree.
const dir=fileURLToPath(new URL('..',import.meta.url));
const read=name=>readFileSync(join(dir,'src',name),'utf8').replace(/\r\n/g,'\n');
const phases=['idle','running','waiting','done','error'];
const base64=rel=>readFileSync(join(dir,rel)).toString('base64');
const block=(name,mime,fileOf)=>`    const ${name} = {\n${
 phases.map(p=>`      ${p}: 'data:image/${mime};base64,${base64(fileOf(p))}',`).join('\n')
}\n    };\n`;
const art=[
 '    /** Generated from assets/ by scripts/build-client.mjs. Do not edit by hand. */',
 block('BUDDY','webp',p=>`assets/buddy-${p}.webp`),
 block('SPRITES','png',p=>`assets/fish-${p}.png`),
 block('NOTIFY_FACES','png',p=>`assets/fish-${p}-icon.png`)
].join('\n');
const header=[
 'window.__ModuleLoader__.load({',
 "  id: '@local/whale-sentinel',",
 '  factory(require) {',
 "    const React = require('react');",
 '    const h = React.createElement;',
 '',
 ''
].join('\n');
const footer='  }\n});\n';
const built=header
 + read('client-core.js')
 + read('client-text.js')
 + art
 + '\n'
 + read('client-panel.js')
 + footer;
const target=join(dir,'client.js');
const current=readFileSync(target,'utf8').replace(/\r\n/g,'\n');
if(process.argv.includes('--check')){
 if(current!==built){console.error('client.js is out of date: run node scripts/build-client.mjs');process.exit(1);}
 console.log('PASS client build: parts and generated artwork agree');
} else {
 writeFileSync(target,built);
 console.log(`built client.js (${built.length} bytes) from 3 parts + generated artwork`);
}
