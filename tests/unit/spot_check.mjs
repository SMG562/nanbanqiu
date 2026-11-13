// tools/spot_check.mjs（#214 阶段 1d）：抽查的选择与渲染，纯函数，不联网。
import { pick, render, isoWeek, OWNER } from '../../tools/spot_check.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const P = (number, user, o = {}) => ({ number, title: 't' + number, user, merged_at: '2026-11-10T00:00:00Z', reviewed: false, ...o });
const pulls = [...Array.from({ length: 10 }, (_, i) => P(i + 1, OWNER)), ...Array.from({ length: 6 }, (_, i) => P(i + 20, 'MDD1102')), P(40, 'dependabot[bot]'), P(41, OWNER, { reviewed: true }), P(42, 'MDD1102', { reviewed: true })];
const a = pick(pulls, '2026-W46', 3);
T('抽 3 个、同样输入同样结果（可复现）', a.length === 3 && JSON.stringify(a) === JSON.stringify(pick(pulls, '2026-W46', 3)), a.map(x => x.number));
T('换一周结果不同（不是永远抽同几个）', JSON.stringify(a.map(x => x.number)) !== JSON.stringify(pick(pulls, '2026-W47', 3).map(x => x.number)));
T('不含机器人、不含已有独立复核的', a.every(x => ![40, 41, 42].includes(x.number)));
T('两边都抽：协作者的 PR 由所有者侧回看、所有者的由协作者侧回看', a.some(x => x.user === OWNER && x.reviewer === '协作者侧') && a.some(x => x.user !== OWNER && x.reviewer === '所有者侧'), a);
const only = pick(pulls.filter(p => p.user === OWNER), '2026-W46', 3);
T('只有一边有 PR：用这边补满', only.length === 3 && only.every(x => x.user === OWNER));
T('池子不够：有几个给几个；空池不报错', pick([P(1, OWNER)], 'w', 3).length === 1 && pick([], 'w', 3).length === 0);
const md = render(a, '2026-W46');
T('渲染：带周号、每个 PR 一行、说明怎么回复', /2026-W46/.test(md) && a.every(x => md.includes('#' + x.number)) && /已回看/.test(md) && /逃逸缺陷/.test(md));
T('空池渲染：说明本周没有', /本周没有符合条件/.test(render([], 'w')));
T('isoWeek：2026-11-12 是 W46；年初跨周 2027-01-01 属于 2026-W53', isoWeek('2026-11-12T00:00:00Z') === '2026-W46' && isoWeek('2027-01-01T00:00:00Z') === '2026-W53', [isoWeek('2026-11-12T00:00:00Z'), isoWeek('2027-01-01T00:00:00Z')]);
console.log(`spot_check: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
