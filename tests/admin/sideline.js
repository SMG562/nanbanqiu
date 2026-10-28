// 第八批 A1：场边 24h 后台四页（场边数据 · 话题 · 今日推荐排期 · 引导文案）并入正式后台，以及待审核里的「场边」。
// 页面能打开、没有报错；运营能改并记操作日志；只读能看不能改（昵称隐藏）；待审核：照片保留 / 拿掉、举报隐藏要理由。
const { chromium } = require('playwright'); const path = require('path');
const FILE = path.join(process.env.NBQ_DIR || path.join(__dirname, '..', '..'), '南伴球_后台.html');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const open = async role => { const pg = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(400); await pg.selectOption('#demoRole', role); await pg.click('.go'); await pg.waitForTimeout(300); await pg.evaluate(() => clearInterval(window._tk)); return { pg, errs } };
  const go = async (pg, p) => { await pg.click(`#nav [data-pg="${p}"]`); await pg.waitForTimeout(150) };
  const toast = pg => pg.evaluate(() => (document.getElementById('admToast') || {}).textContent || '');
  const audit0 = pg => pg.evaluate(() => S.audit[0]);
  // ---------- 运营 ----------
  { const { pg, errs } = await open('operator');
    T('导航里有「场边 24h」四页', await pg.evaluate(() => ['sb', 'stopic', 'ssched', 'sguide'].every(k => !!document.querySelector(`#nav [data-pg="${k}"]`))));
    T('话题页的导航有红点（还没到门槛的 2 个话题）', await pg.evaluate(() => document.querySelector('#nav [data-pg="stopic"] i').textContent) === '2');
    for (const [p, t] of [['sb', '场边数据'], ['stopic', '话题'], ['ssched', '今日推荐排期'], ['sguide', '引导文案']]) { await go(pg, p); T(`${t}：标题和内容`, (await pg.textContent('#pt')) === t && (await pg.evaluate(() => document.querySelectorAll('#page .card').length)) >= 2) }
    await go(pg, 'sb'); T('场边数据：6 张指标卡、有筛选条', await pg.evaluate(() => document.querySelectorAll('#page .kpis6 .kpi').length) === 6 && await pg.evaluate(() => getComputedStyle(document.getElementById('rng')).display !== 'none'));
    await go(pg, 'stopic'); T('话题页：不显示时间 / 设备筛选和导出', await pg.evaluate(() => getComputedStyle(document.getElementById('rng')).display === 'none' && getComputedStyle(document.querySelector('.filters .btn')).display === 'none'));
    const n0 = await pg.evaluate(() => document.querySelectorAll('#page table:first-of-type tbody tr').length); T('话题表有行', n0 >= 10, n0);
    await pg.click('[data-on="ootd"]'); T('上线开关：已下线 + 记操作日志（sideline.config，署名运营）', await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'ootd').on) === false && (await audit0(pg))[0] === 'Amy' && (await audit0(pg))[1] === 'sideline.config' && /网球人的OOTD 下线/.test((await audit0(pg))[2]), await audit0(pg));
    await pg.click('[data-on="ootd"]');
    await pg.click('[data-edit="gear"]'); T('点编辑：抽屉打开，带预览', await pg.evaluate(() => document.getElementById('drw').classList.contains('on') && !!document.querySelector('#drw .ph')));
    await pg.fill('#drw [data-f="t"]', '我的新装备2'); await pg.click('[data-save]'); await pg.waitForTimeout(150);
    T('保存：话题改名 + 记日志 + 版本记录多一条', await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'gear').t) === '我的新装备2' && /编辑 #我的新装备2/.test((await audit0(pg))[2]) && await pg.evaluate(() => SB_VERS[0][2]) === '编辑 #我的新装备2');
    await pg.click('[data-edit="gear"]'); await pg.fill('#drw [data-f="t"]', '网'); await pg.click('[data-save]'); T('名字太短：不保存，提示 2–12 个字', /2–12/.test(await toast(pg)) && await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'gear').t) === '我的新装备2'); await pg.click('[data-close]');
    await pg.click('[data-tab="pending"]'); await pg.click('[data-release="u4"]'); T('提前放出：话题不再「还没到门槛」', await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'u4').pending) === false);
    await go(pg, 'sguide'); await pg.click('[data-qon="gen:0"]'); T('引导文案：改了出现「发布」条（1 处改动）', await pg.evaluate(() => getComputedStyle(document.getElementById('pub')).display === 'flex' && document.getElementById('pubn').textContent === '1'));
    await pg.click('[data-publish]'); T('发布：条消失、记日志、新版本', await pg.evaluate(() => getComputedStyle(document.getElementById('pub')).display === 'none') && /发布 v\d+/.test((await audit0(pg))[2]), await audit0(pg));
    await go(pg, 'overview'); T('离开场边页：筛选条恢复', await pg.evaluate(() => getComputedStyle(document.getElementById('rng')).display !== 'none'));
    // 待审核 → 场边
    await go(pg, 'review'); await pg.click('[data-tab2="sideline"]'); await pg.waitForTimeout(100);
    T('待审核有「场边」标签，3 张照片 + 3 条举报待处理', await pg.evaluate(() => /场边 \(6\)/.test(document.querySelector('.tabs').textContent)) && await pg.evaluate(() => document.querySelectorAll('[data-act="sbpk"]').length) === 3 && await pg.evaluate(() => document.querySelectorAll('[data-act="sbrh"]').length) === 3);
    await pg.click('[data-act="sbpk"][data-id="sp1"]'); T('照片保留：状态改变、记日志', await pg.evaluate(() => SB_REVIEW.photos[0].st) === 'ok' && (await audit0(pg))[1] === 'sb.photo_keep' && (await audit0(pg))[0] === 'Amy');
    await pg.click('[data-act="sbpx"][data-id="sp2"]'); T('照片拿掉', await pg.evaluate(() => SB_REVIEW.photos[1].st) === 'removed' && (await audit0(pg))[1] === 'sb.photo_remove');
    await pg.click('[data-act="sbrh"][data-id="sr1"]'); T('隐藏内容：要先写理由', await pg.evaluate(() => !!document.querySelector('#admR.show')) && await pg.evaluate(() => SB_REVIEW.reports[0].st) === 'open');
    await pg.fill('#admRin', '虚假交易，已核对'); await pg.click('[data-admrok]'); await pg.waitForTimeout(200);
    T('填了理由：举报处理、日志带理由', await pg.evaluate(() => SB_REVIEW.reports[0].st) === 'actioned' && (await audit0(pg))[1] === 'sb.hide' && /理由：虚假交易，已核对/.test((await audit0(pg))[2]), await audit0(pg));
    await pg.click('[data-act="sbrd"][data-id="sr2"]'); T('忽略举报', await pg.evaluate(() => SB_REVIEW.reports[1].st) === 'dismissed' && (await audit0(pg))[1] === 'sb.report_dismiss');
    T('待审核红点跟着减少', await pg.evaluate(() => { const r = S.pending + S.reports.filter(x => x.status === 'open').length + sbReviewOpen(); return document.querySelector('#nav [data-pg="review"] i').textContent === String(r) }));
    T('运营没有页面报错', !errs.length, errs); await pg.close() }
  // ---------- 只读 ----------
  { const { pg, errs } = await open('viewer');
    T('只读：能看场边四页，看不到待审核', await pg.evaluate(() => ['sb', 'stopic', 'ssched', 'sguide'].every(k => !!document.querySelector(`#nav [data-pg="${k}"]`)) && !document.querySelector('#nav [data-pg="review"]')));
    await go(pg, 'stopic');
    T('只读：作者昵称换成「某球友」', !(await pg.evaluate(() => document.getElementById('page').textContent)).match(/阿杰|Yuki|Mia|Leo/) && /某球友 发起/.test(await pg.evaluate(() => document.getElementById('page').textContent)));
    T('只读：开关、输入框置灰', await pg.evaluate(() => [...document.querySelectorAll('#page [data-on]')].every(x => x.classList.contains('noperm')) && [...document.querySelectorAll('#page input')].every(x => x.disabled)));
    const on0 = await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'ootd').on);
    await pg.evaluate(() => document.querySelector('[data-on="ootd"]').click()); T('只读：点开关被拦下，说明需要什么角色，话题不变', /你的角色不能做这件事.*运营/.test(await toast(pg)) && await pg.evaluate(() => SB_TOPICS.find(t => t.id === 'ootd').on) === on0, await toast(pg));
    await pg.click('[data-edit="ootd"]'); await pg.click('[data-save]'); T('只读：能打开编辑看，保存被拦下', /你的角色不能做这件事/.test(await toast(pg)) && await pg.evaluate(() => SB_VERS.length) === 3); await pg.click('[data-close]');
    await go(pg, 'sb'); T('只读：场边数据里的作者昵称隐藏', !/Lily|Nana|阿杰/.test(await pg.evaluate(() => document.getElementById('page').textContent)));
    T('只读没有页面报错', !errs.length, errs); await pg.close() }
  // ---------- 窄屏 ----------
  { const pg = await b.newPage({ viewport: { width: 390, height: 800 } }); await pg.goto('file://' + FILE); await pg.waitForTimeout(400); await pg.click('.go'); await pg.waitForTimeout(300); await pg.evaluate(() => { clearInterval(window._tk); S.page = 'ssched'; render() });
    T('390 宽：排期页不横向溢出', await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, await pg.evaluate(() => document.documentElement.scrollWidth)); await pg.close() }
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) })();
