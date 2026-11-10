// 网页端「我的」标签（#134 P1）：资料 / 设置在「我的」，「我的球局」左栏只是摘要；每个原有入口都还在
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const T=(n,ok,x)=>{if(!ok){bad++;console.log('FAIL '+n+(x!==undefined?' '+JSON.stringify(x):''))}};
const ctx=await b.newContext({viewport:{width:1360,height:860}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',x=>errs.push(x.message));
await pg.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await pg.settle(800);
await pg.evaluate(()=>{closeModal();setWho('jason',true)});await pg.settle(200);
const E=f=>pg.evaluate(f),has=async s=>(await pg.locator(s).count())>0,vis=async s=>await pg.locator(s).first().isVisible().catch(()=>false);
T('页签：发现球局 / 我的球局 / 场边 / 我的',JSON.stringify(await E(()=>[...document.querySelectorAll('#tabs [data-tab]')].map(x=>x.dataset.tab)))===JSON.stringify(['disc','mine','side','me']));
// 「我的球局」：时间轴 + 摘要，不放资料和设置
await pg.click('#tabs [data-tab="mine"]');await pg.settle(300);
T('我的球局：摘要卡在左栏，有「编辑资料」',await has('#colL .minesum [data-tab="me"]'));
for(const s of ['[data-a="logout"]','[data-a="nrSet"]','[data-a="editClubs"]','[data-sx="gender"]'])T('我的球局：左栏没有 '+s,!(await has('#colL '+s)));
T('我的球局：中栏还是时间轴',/我的球局/.test(await E(()=>document.querySelector('#colC').innerText)));
// 摘要上的「编辑资料」→ 我的
await pg.click('#colL .minesum [data-tab="me"]');await pg.settle(300);
T('点「编辑资料」进「我的」',await E(()=>UI.tab==='me'&&document.querySelector('#tabs [data-tab="me"]').classList.contains('on')));
// 「我的」：资料栏居中；设置不再堆在这里，收进右上角齿轮（#134 P2）
for(const s of ['.mycard','[data-a="editClubs"]','[data-a="settings"]'])T('我的：有 '+s,await has('#colL '+s));
for(const s of ['[data-em="settings"]','[data-sx="gender"]','[data-a="blocklist"]','[data-a="safety"]','[data-a="logout"]'])T('我的：设置项已收进齿轮，这里没有 '+s,!(await has('#colL '+s)));
T('我的：球友 / 常一起打 这一块在（UTR、球拍有开关，演示环境关着，这里不测）',await E(()=>/球友|常一起打/.test(document.querySelector('#colL').innerText)));
T('我的：中栏不显示、资料栏可见',!(await vis('#colC'))&&await vis('#colL'));
await pg.click('#colL [data-a="settings"]');await pg.settle(300);
T('齿轮：打开设置弹层，原有入口都在',await E(()=>{const m=document.querySelector('#modal');return ['[data-a="nrSet"]','[data-em="settings"]','[data-sx="gender"]','[data-a="blocklist"]','[data-a="safety"]','[data-a="logout"]'].every(q=>m.querySelector(q))}));
await pg.click('#modal [data-sx="gender"]');await pg.settle(300);
T('设置里点性别能打开原来的弹层',await E(()=>/性别/.test(document.querySelector('#modal').innerText)));
await E(()=>closeModal());await pg.settle(200);
// 回到其他页签：左栏恢复，中栏恢复
await pg.click('#tabs [data-tab="disc"]');await pg.settle(300);
T('回到发现球局：筛选在左栏、中栏可见',await has('#colL [data-flv]')&&await vis('#colC'));
// 通知 → 账号状态 → 我的页
await E(()=>{UI.tab='disc';render();acctGo()});await pg.settle(400);
T('账号状态通知落到「我的」',await E(()=>UI.tab==='me'));
// 没登录：我的也能看到登录入口
await E(()=>{closeModal();setWho(null);UI.tab='me';render()});await pg.settle(300);
T('没登录：「我的」里是登录入口',await has('#colL [data-a="login"]'));
T('没有页面报错',errs.length===0,errs);
await ctx.close();console.log(bad?'FAIL':'PASS web_me');await b.close()})();
