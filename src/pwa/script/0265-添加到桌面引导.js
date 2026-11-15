/* ===================== 添加到桌面引导 v2（11-15 起）：「比下载 App 更简单」 =====================
 * 为什么：iPhone 上浏览器和桌面图标不共用登录；推送也只有从桌面图标打开才收得到。旧引导把「添加到主屏幕」写成三行文字，用户要自己把文字对到屏幕上。
 * 做法：一屏一件事——为什么（三个具体好处）→ 怎么做（循环演示 Safari 最下面那一排，最多三步）。
 *   没有「我已添加」按钮：用户一点「添加」，系统就把他带回桌面，不会回来点它。用户从桌面回到这个页面时（页面重新可见），才显示「放好了吗？」（去桌面点南伴球）。
 * 开关 NBQ_A2HS2_ON：测试环境（分支预览，连测试库）开；正式站默认关；任何设备可用 localStorage nbq_ff_a2hs2=1 单独打开。
 * 范围：只管 iPhone（Safari / 其他浏览器 / App 内置浏览器）；安卓仍是原来的一键安装 / ⋮ 菜单。入口仍是 openA2HS()（埋点 a2hs_open、hoGuide 刷新都在它那里），这里只换画面。 */
const NBQ_A2HS2_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_a2hs2')==='1'}catch(_){return false}})();
const a2hsV2=()=>NBQ_A2HS2_ON&&/^ios_|^inapp$/.test(a2hsKind());
const A2V={k:'why',gate:false};
const A2V_G={dl:'<path d="M12 3v11.5M7.5 10.5l4.5 4.5 4.5-4.5M5 19.5h14"/>',bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',ok:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>'};
const A2V_PERKS=[['dl','不用下载，没有负担','不占内存，不用 App Store，想删就删'],['bell','有人回复，马上提醒','同意、邀约、开打前，第一时间通知你'],['ok','所有球局，一眼看到','附近有新球局，打开就是最新的']];
const A2V_STEPS=['点「≡」，选「分享」','往上滑，点「添加到主屏幕」','点右上角的「添加」'];
const a2vSvg=d=>`<svg viewBox="0 0 24 24">${d}</svg>`;
const A2V_SHARE=a2vSvg('<path d="M12 15V3.5M8 7l4-4 4 4"/><path d="M7 10H6a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18 10h-1"/>'),
  A2V_MARK=a2vSvg('<path d="M6 4h12v17l-6-4-6 4z"/>'),A2V_FIND=a2vSvg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>'),
  A2V_COPY=a2vSvg('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),A2V_PLUS=a2vSvg('<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>');
function a2vHow(){return `<h2 class="a2v-t sm">三步，放到桌面</h2><p class="a2v-s tight">手机最下面那一排，约 15 秒</p>
  <div class="a2d" data-step="0" aria-hidden="true"><div class="a2d-pg"><i></i><i></i><i></i><i></i></div>
    <div class="a2d-bar"><span class="a2d-lp gl">${a2vSvg('<path d="m14.5 5.5-6 6.5 6 6.5"/>')}${a2vSvg('<path d="m9.5 5.5 6 6.5-6 6.5"/>')}</span>
      <span class="a2d-url gl"><span class="a2d-mb">${a2vSvg('<path d="M5 7.5h14M5 12h14M5 16.5h14"/>')}</span><em>nanbanqiu.app</em></span>
      <span class="a2d-rp gl">${a2vSvg('<rect x="4" y="6" width="12" height="12" rx="2.5"/><path d="M8 3h10a2 2 0 0 1 2 2v10"/>')}</span></div>
    <div class="a2d-pop gl"><div class="a2d-r hit"><span>分享</span>${A2V_SHARE}</div><div class="a2d-r f"><span>添加书签</span>${A2V_MARK}</div><div class="a2d-r f"><span>查找页面</span>${A2V_FIND}</div></div>
    <div class="a2d-shs"><div class="a2d-hd"><img src="/icons/icon-180.png" alt=""><div><b>南伴球</b><span>nanbanqiu.app</span></div></div>
      <div class="a2d-r f"><span>拷贝</span>${A2V_COPY}</div><div class="a2d-r f"><span>添加书签</span>${A2V_MARK}</div><div class="a2d-r hit"><span>添加到主屏幕</span>${A2V_PLUS}</div><div class="a2d-r f"><span>查找页面</span>${A2V_FIND}</div>
      <div class="a2d-sw">${a2vSvg('<path d="m6 14 6-6 6 6"/>')}上滑</div></div>
    <div class="a2d-dlg"><div class="a2d-top"><span class="c">取消</span><span class="t">添加到主屏幕</span><span class="ad">添加</span></div>
      <div class="a2d-app"><img src="/icons/icon-180.png" alt=""><div><b>南伴球</b><span>nanbanqiu.app</span></div></div></div></div>
  <ol class="a2v-c">${A2V_STEPS.map((t,i)=>`<li class="${i?'':'cur'}" data-a="a2hsStep" data-i="${i}"><span class="hl"></span><i><u>${i+1}</u>${i+1}</i><b>${t}</b></li>`).join('')}</ol>
  <button class="a2v-l" data-a="a2hsBack">返回</button>`}
function a2vHtml(k){
  if(k==='open'){const inapp=a2hsKind()==='inapp';
    return `<div class="a2v"><img class="a2v-ic" src="/icons/icon-180.png" alt=""><h2 class="a2v-t">先用 Safari 打开</h2>
      <p class="a2v-s">${inapp?'微信等 App 里不能放到桌面。':'只有 Safari 能把网页放到 iPhone 桌面。'}复制链接，到 Safari 里打开就行。</p>
      <div class="a2v-card"><img src="/icons/icon-180.png" alt=""><div><b>南伴球</b><span>${esc(location.host)}</span></div></div></div>
      <div style="height:18px"></div><button class="btn btn-p" data-a="a2hsLink">复制链接</button><button class="a2v-l" data-a="close">以后再说</button>`}
  if(k==='how')return a2vHow();
  if(k==='go'){const ho=typeof HO_READY!=='undefined'&&HO_READY;
    return `<div class="a2v"><h2 class="a2v-t sm">放好了吗？</h2><p class="a2v-s">回到桌面，点南伴球。${ho?'从图标打开，自动登录。':'从图标打开，登录一次，之后都不用再登录。'}</p>
      <div class="a2v-home" aria-hidden="true"><i class="a"></i><i class="a"></i><i class="a"></i><i class="a"></i><i class="a"></i><span class="me"><img src="/icons/icon-180.png" alt=""></span><i class="a"></i><i class="a"></i><div class="a2v-dock"></div></div>
      <p class="a2v-fine">找不到？在桌面往左滑，图标一般在最后一页。收提醒需要 iOS 16.4 或更新。</p></div>
      <button class="btn btn-p" data-a="a2hsDone">好的</button><button class="a2v-l" data-a="a2hsBack">还没添加？再看一遍</button>`}
  return `<div class="a2v"><img class="a2v-ic" src="/icons/icon-180.png" alt=""><h2 class="a2v-t">比下载 App 更简单</h2><p class="a2v-s">把南伴球放到桌面，所有球局都不错过。</p>
    <ul class="a2v-p">${A2V_PERKS.map(p=>`<li><span class="g">${a2vSvg(A2V_G[p[0]])}</span><div><b>${p[1]}</b><span>${p[2]}</span></div></li>`).join('')}</ul></div>
    <div style="height:14px"></div><button class="btn btn-p" data-a="a2hsNext">放到桌面</button>${A2V.gate?'<button class="a2v-l" data-a="authAnyway">先在浏览器里用</button>':'<button class="a2v-l" data-a="close">以后再说</button>'}`}
function a2hsScreen(k,gate){A2V.k=k;if(gate!==undefined)A2V.gate=gate;openSheet(a2vHtml(k));if(k==='go')try{track('a2hs_back')}catch(_){}}   // 「放好了吗」出现 = 用户添加完回到了页面（a2hs_back 埋点）
// 开了「减少动态效果」时演示不自动播放：点哪一条步骤，演示就停在哪一步（样式见 0165 的 reduced-motion 段；正常模式点了没有可见变化）
function a2hsStep(i){const d=document.querySelector('.a2d');if(!d)return;d.dataset.step=i;document.querySelectorAll('.a2v-c li').forEach((x,k)=>x.classList.toggle('cur',k===i))}
// 放到桌面 → 怎么做；返回 → 上一屏（「放好了吗」的「再看一遍」回到演示）
function a2hsNav(d){if(A2V.k==='go'){if(d<0)a2hsScreen('how');return}if(A2V.k==='why'&&d>0)try{track('a2hs_go')}catch(_){}const seq=['why','how'],i=seq.indexOf(A2V.k);if(i<0)return;const n=seq[i+d];if(n)a2hsScreen(n)}
// 用户在演示那一屏离开页面（去分享、添加、被带回桌面），再回来：显示「放好了吗？」。只在「演示屏正在显示」时触发（离开前后各查一次，中间被换成别的弹层 / 关掉都不触发）；全局只挂一个监听
// 「演示屏正在显示」：弹层开着、且里面确实是演示（.a2d）。只看 #sheet 开着不够——别的弹层共用 #sheet，A2V.k 在弹层关掉后也不会重置（复核：别的弹层会被误换成「放好了吗」）
const a2vShown=()=>{const e=document.getElementById('sheet');return !!e&&e.classList.contains('show')&&!!e.querySelector('.a2d')};
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){A2V.away=A2V.k==='how'&&a2vShown();return}
  if(A2V.away){A2V.away=false;if(A2V.k==='how'&&a2vShown())a2hsScreen('go')}});
