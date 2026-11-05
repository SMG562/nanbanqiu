// 前台输入框登记检查：src 里每个带 id 的文本输入框必须登记在 tests/spec/inputs.json（11-05：新输入框要先想好回车 / 键盘 / 草稿再写）
import fs from 'fs';import path from 'path';
const R=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const spec=JSON.parse(fs.readFileSync(path.join(R,'tests/spec/inputs.json'),'utf8'));delete spec['说明'];
const ids=new Set();
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory()){if(f.name!=='admin')w(p)}else if(f.name.endsWith('.js')){
 for(const m of fs.readFileSync(p,'utf8').matchAll(/<(input|textarea)[^>]*>/g)){if(/type="(checkbox|radio|hidden|range|file)"/.test(m[0]))continue;const i=m[0].match(/\bid="([^"$]+)"/);if(i)ids.add(i[1])}}}})(path.join(R,'src'));
let bad=0;
for(const i of ids)if(!spec[i]){console.log('未登记的输入框：#'+i+'（写进 tests/spec/inputs.json：enter + 覆盖）');bad++}
for(const k of Object.keys(spec))if(!ids.has(k)){console.log('登记了但源码里没有：#'+k);bad++}
for(const [k,v] of Object.entries(spec))if(!['done','send','none'].includes(v.enter)||!v.覆盖){console.log('登记不完整：#'+k);bad++}
console.log(`input_audit: ${ids.size} 个输入框, ${bad} 个问题`);process.exit(bad?1:0);
