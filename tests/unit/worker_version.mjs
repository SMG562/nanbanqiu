// 发送程序代码指纹（tools/worker_version.mjs）：只看会被打包的文件内容；没有 git 也算得出；任何一个文件变了指纹就变；不相干的文件不影响
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { closure, senderVersion } = await import(pathToFileURL(path.join(DIR, 'tools/worker_version.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };

const files = closure(DIR);
T('包含发送程序的全部源文件（入口、规则、发送、推送、邮件、连库、wrangler 配置）', ['worker/notify.mjs', 'server/notify/run.mjs', 'server/notify/sender.mjs', 'server/notify/rules.mjs', 'server/notify/webpush.mjs', 'server/notify/resend.mjs', 'server/api/connect.mjs', 'notify-worker/wrangler.jsonc'].every(f => files.includes(f)), files);
T('不包含网页、测试、别的 Worker 代码', !files.some(f => /^(src|tests|functions)\//.test(f) || /Web\.html|handler\.mjs/.test(f)), files);
T('指纹是 10 位十六进制，同一份文件算两次一样', /^[0-9a-f]{10}$/.test(senderVersion(DIR)) && senderVersion(DIR) === senderVersion(DIR));

// 复制到临时目录（没有 .git）：同样的内容 → 同样的指纹；改一个字节 → 指纹变；改不相干的文件 → 不变
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wv-'));
for (const f of files) { fs.mkdirSync(path.join(tmp, path.dirname(f)), { recursive: true }); fs.copyFileSync(path.join(DIR, f), path.join(tmp, f)) }
const v0 = senderVersion(DIR);
T('没有 git 的副本里算出同样的指纹（你电脑上的文件夹就是这种）', senderVersion(tmp) === v0, [senderVersion(tmp), v0]);
fs.writeFileSync(path.join(tmp, 'sw.js'), 'x'); fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'tests/a.js'), 'x');
T('不相干的文件变了，指纹不变', senderVersion(tmp) === v0);
fs.appendFileSync(path.join(tmp, 'server/notify/rules.mjs'), '\n// x');
T('规则文件变一个字，指纹就变（旧版文件部署出去会被核对发现）', senderVersion(tmp) !== v0);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`worker_version: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
