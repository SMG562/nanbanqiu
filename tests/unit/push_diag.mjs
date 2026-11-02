// 推送自检（11-03）：页面里的纯函数 nrDiagHTML / nrDeliveryZh / nrAgo（从源码里取出来在 Node 里直接测，不开浏览器）
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0390-通知_v2.js'), 'utf8');
const i = src.indexOf('const NR_KIND_ZH='), j = src.indexOf('async function nrDiagLoad');
T('源码里找得到自检的纯函数', i > 0 && j > i);
const ctx = { esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }; vm.createContext(ctx);
vm.runInContext(src.slice(i, j) + ';this.f={nrDiagHTML,nrDeliveryZh,nrAgo}', ctx); const { nrDiagHTML, nrDeliveryZh, nrAgo } = ctx.f;
const NOW = '2026-11-03T10:00:00Z', ago = m => new Date(Date.parse(NOW) - m * 60000).toISOString();
T('几分钟前 / 几小时前 / 几天前 / 刚刚', nrAgo(ago(5), NOW) === '5 分钟前' && nrAgo(ago(180), NOW) === '3 小时前' && nrAgo(ago(60 * 24 * 4), NOW) === '4 天前' && nrAgo(ago(0.2), NOW) === '刚刚' && nrAgo(null, NOW) === '');
T('去向文案：应用内各原因 / 推手机 / 出发类 / 推电脑 / 邮件 / 没发 / 过期订阅', nrDeliveryZh({ channel: 'in_app', reason: 'active_device' }).includes('正在用') && nrDeliveryZh({ channel: 'in_app', reason: 'no_push' }).includes('没有开启推送') && nrDeliveryZh({ channel: 'push_mobile', reason: 'mobile_first' }) === '推送到手机' && nrDeliveryZh({ channel: 'push_mobile', reason: 'go_kind' }).includes('出发类') && nrDeliveryZh({ channel: 'push_desktop' }) === '推送到电脑' && nrDeliveryZh({ channel: 'email' }).includes('邮件') && nrDeliveryZh({ channel: 'none' }) === '没发送' && nrDeliveryZh({ channel: 'push_mobile', reason: 'stale:410' }).includes('订阅已失效') && nrDeliveryZh({ channel: 'push_mobile', reason: 'stale:500' }) === '没发：500');
const full = { now: NOW, devices: [{ platform: 'mobile', push: true, this: true, push_ok_at: ago(5), last_active_at: ago(120) }, { platform: 'desktop', push: false, this: false, push_ok_at: null, last_active_at: null }],
  recent: [{ id: '1', kind: 'request', created_at: ago(3), read_at: null, deliveries: [{ channel: 'in_app', reason: 'active_device' }, { channel: 'push_mobile', reason: 'mobile_first' }] }, { id: '2', kind: 'approved', created_at: ago(900), read_at: ago(800), deliveries: [] }] };
const h = nrDiagHTML(full);
T('设备：这台、已订阅、最近送达 5 分钟前、最近在用 2 小时前；电脑没订阅', h.includes('手机（这台）') && h.includes('已订阅推送 · 最近送达 5 分钟前 · 最近在用 2 小时前') && h.includes('电脑') && h.includes('没订阅推送'), h);
T('最近提醒：有人申请 · 3 分钟前 → 应用内 + 推送到手机；申请被同意 → 还没发送、已读', h.includes('有人申请 · 3 分钟前') && h.includes('只在页面里提醒') && h.includes('推送到手机') && h.includes('申请被同意') && h.includes('还没发送') && h.includes('已读'), h);
T('这台已订阅 → 不出现「先点开启提醒」类提示', !h.includes('先点上面的') && !h.includes('还没订阅推送'));
const none = nrDiagHTML({ now: NOW, devices: [{ platform: 'mobile', push: false, this: false }], recent: [] });
T('没有任何设备订阅 → 提示先开启提醒；没有提醒 → 还没有提醒', none.includes('先点上面的「开启提醒」') && none.includes('还没有提醒'), none);
const other = nrDiagHTML({ now: NOW, devices: [{ platform: 'mobile', push: true, this: false, push_ok_at: null }], recent: [] });
T('有设备订阅但不是这台 → 提示这台还没订阅 / 订阅已失效；还没成功送达过', other.includes('这台设备还没订阅推送') && other.includes('还没成功送达过'), other);
T('读取失败 / 空 → 提示读取失败，不报错', nrDiagHTML(null).includes('读取失败') && nrDiagHTML({}).includes('读取失败'));
T('内容转义：种类里有尖括号不会变成标签', !nrDiagHTML({ now: NOW, devices: [], recent: [{ id: '9', kind: '<img src=x>', created_at: ago(1), deliveries: [] }] }).includes('<img'));
console.log(`push_diag: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
