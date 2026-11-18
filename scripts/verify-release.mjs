import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

/** One gate for the version that is actually shipped: entry, exports, docs. */
const dir=fileURLToPath(new URL('..',import.meta.url));
const pkg=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));
const version=String(pkg.version??'');
const problems=[];
const must=(ok,message)=>{if(!ok)problems.push(message);};

must(/^\d+\.\d+\.\d+$/.test(version),`package version must be semver, got "${version}"`);
const entry=`release-${version}.js`;
must(existsSync(join(dir,entry)),`missing ${entry}`);
must(pkg.exports?.['.']===`./${entry}`,`exports["."] must be ./${entry}`);
must(pkg.files?.includes(entry),`files must include ${entry}`);
const releases=readdirSync(dir).filter(name=>/^release-\d+\.\d+\.\d+\.js$/.test(name));
must(releases.length===1&&releases[0]===entry,`only ${entry} may remain, found: ${releases.join(', ')||'none'}`);
must(readFileSync(join(dir,'index.js'),'utf8').includes(entry),`index.js must import ${entry}`);
must(readFileSync(join(dir,'host.js'),'utf8').includes(`version:'${version}'`),`host.js snapshot version must be ${version}`);

const docs=['README.md','README.en.md','docs/ACCEPTANCE.md','docs/ARTWORK.md','docs/MAINTAINING.md','ATTRIBUTION.md','docs/build-diagrams.py'];
for(const rel of docs){
 const text=readFileSync(join(dir,rel),'utf8');
 must(text.includes(version),`${rel} must mention ${version}`);
}
for(const locale of ['locale/zh.json','locale/en.json']){
 const meta=JSON.parse(readFileSync(join(dir,locale),'utf8'));
 must(typeof meta.meta?.title==='string'&&meta.meta.title.length>0,`${locale} needs a title`);
 must(typeof meta.meta?.description==='string'&&meta.meta.description.length>20,`${locale} needs a description`);
 must(meta.meta?.detail==='README.md',`${locale} detail must point at README.md`);
}
must(pkg.dsh?.bundle?.patch&&existsSync(join(dir,pkg.dsh.bundle.patch)),'dsh.bundle.patch must exist');
must(pkg.dsh?.client?.platform==='web','dsh.client.platform must be web');

const artwork=JSON.parse(readFileSync(join(dir,'assets/artwork.json'),'utf8'));
if(artwork.buddy){
 must(pkg.files?.includes('assets/*.webp'),'artwork has WebP but the package does not ship assets/*.webp');
 for(const name of ['idle','running','waiting','done','error'])must(existsSync(join(dir,`assets/buddy-${name}.webp`)),`missing assets/buddy-${name}.webp`);
}

if(problems.length){console.error(`FAIL release ${version}:\n- ${problems.join('\n- ')}`);process.exit(1);}
console.log(`PASS release ${version}: entry, exports, files, index, host, docs and artwork agree`);
