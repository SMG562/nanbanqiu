/* ===== 弹层 / 弹窗里的输入框：通用规则（11-05：「说一句」输入框回车没反应、点选项页面跳回顶部）=====
   不靠每张表单各写各的，这里统一：
   1. 键盘右下角的键：有 data-enter 的显示「发送」，其余显示「完成」（enterkeyhint，iOS / 安卓都认）。
   2. 按回车：有 data-enter="选择器" → 点那个按钮；没有 → 只收起键盘。绝不让回车「没反应」，也不会误提交整张表单。
      有后果的操作（发邀约、发布球局）不要加 data-enter：回车只收键盘，提交靠看得见的按钮（11-05 你真机试出来的）。
   3. 中文输入法正在拼写时（isComposing / keyCode 229）的回车是「确认拼音」，一律不处理——否则打到一半就把邀约发出去了。
   只管 #sheet / #modal 里的单行输入框；别处（聊天 / 场边）自己有回车逻辑，不动。 */
(function(){
  const SKIP=/^(checkbox|radio|range|hidden|file|button|submit|color|date|number)$/;
  const inLayer=el=>!!(el&&el.closest&&el.closest('#sheet,#modal'));
  const isLine=el=>el&&el.tagName==='INPUT'&&!SKIP.test(el.type||'text');
  /* 同屏重画时保住用户已经打的字（11-05 排查：新用户资料里点一下 UTR / Club，刚填的「姓氏首字母」就没了——NP.redraw 只记了昵称）。
     不靠每张表单各记各的：openSheet / openModal 同屏重画前后各调一次。规则：新旧都有同一个 id 的输入框，并且这次重画没有改它的默认值（说明表单没有「故意」改它），
     就把用户打的字放回去；表单故意清空 / 改值的（默认值变了）不动。 */
  window.nbqDraftsTake=root=>{const m={};if(!root)return m;root.querySelectorAll('input[id],textarea[id]').forEach(e=>{if(!SKIP.test(e.type||'text'))m[e.id]={v:e.value,d:e.defaultValue}});return m};
  window.nbqDraftsPut=(root,m)=>{if(!root||!m)return;Object.keys(m).forEach(id=>{const n=root.querySelector('#'+CSS.escape(id));if(n&&!SKIP.test(n.type||'text')&&n.defaultValue===m[id].d&&n.value!==m[id].v)n.value=m[id].v})};
  document.addEventListener('focusin',e=>{const el=e.target;if(!isLine(el)||!inLayer(el)||el.hasAttribute('enterkeyhint'))return;el.setAttribute('enterkeyhint',el.dataset.enter?'send':'done')});
  // iOS Safari：点键盘右下角确认拼音时，compositionend 先触发、随后才来一个 isComposing=false 的 Enter（11-05 真机复现：确认拼音就把邀约发出去了）。
  // 所以光看 isComposing 不够：刚结束拼写 400ms 内的 Enter 一律当成「确认拼音」，什么都不做（键盘也不收）。
  let ceAt=0;document.addEventListener('compositionend',()=>{ceAt=Date.now()},true);
  window.nbqImeEnter=e=>!!(e.isComposing||e.keyCode===229||Date.now()-ceAt<400);
  document.addEventListener('keydown',e=>{const el=e.target;if(e.key!=='Enter'||e.defaultPrevented||window.nbqImeEnter(e)||!isLine(el)||!inLayer(el))return;
    e.preventDefault();const sel=el.dataset.enter;el.blur();
    if(sel){const b=document.querySelector(sel);if(b&&!b.disabled)b.click()}})
})();
