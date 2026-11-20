// main 上的 tests 不被后续合并取消（#480，11-20 #472 事故）：cancel-in-progress 只对 PR / 非 main 分支生效；gate.sh 认「被后续 main 绿灯覆盖」。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/tests.yml'), 'utf8'), gate = fs.readFileSync(path.join(ROOT, 'tools/gate.sh'), 'utf8');
let pass = 0, fail = 0; const T = (n, ok) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n); else console.log('  ✓ ' + n) };
const line = (wf.match(/^  cancel-in-progress:[^\n]*/m) || [''])[0].replace(/#.*/, '');
T('cancel-in-progress 排除 refs/heads/main', /ref != 'refs\/heads\/main'/.test(line));
T('cancel-in-progress 仍对 pull_request 生效', /event_name == 'pull_request'/.test(line));
T('gate.sh 认被后续 main 提交覆盖', /covered_by\(\)/.test(gate) && /merge-base --is-ancestor/.test(gate) && /由后续 main 提交/.test(gate));
console.log(`tests_yml_cancel: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
