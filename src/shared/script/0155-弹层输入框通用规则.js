/* ===== 弹层 / 弹窗里的输入框：通用规则（11-05：「说一句」输入框回车没反应、点选项页面跳回顶部）=====
   不靠每张表单各写各的，这里统一：
   1. 键盘右下角的键：有 data-enter 的显示「发送」，其余显示「完成」（enterkeyhint，iOS / 安卓都认）。
   2. 按回车：有 data-enter="选择器" → 点那个按钮；没有 → 只收起键盘。绝不让回车「没反应」，也不会误提交整张表单。
   3. 中文输入法正在拼写时（isComposing / keyCode 229）的回车是「确认拼音」，一律不处理——否则打到一半就把邀约发出去了。
   只管 #sheet / #modal 里的单行输入框；别处（聊天 / 场边）自己有回车逻辑，不动。 */
(function(){
  const SKIP=/^(checkbox|radio|range|hidden|file|button|submit|color|date|number)$/;
  const inLayer=el=>!!(el&&el.closest&&el.closest('#sheet,#modal'));
  const isLine=el=>el&&el.tagName==='INPUT'&&!SKIP.test(el.type||'text');
  document.addEventListener('focusin',e=>{const el=e.target;if(!isLine(el)||!inLayer(el)||el.hasAttribute('enterkeyhint'))return;el.setAttribute('enterkeyhint',el.dataset.enter?'send':'done')});
  document.addEventListener('keydown',e=>{const el=e.target;if(e.key!=='Enter'||e.defaultPrevented||e.isComposing||e.keyCode===229||!isLine(el)||!inLayer(el))return;
    e.preventDefault();const sel=el.dataset.enter;el.blur();
    if(sel){const b=document.querySelector(sel);if(b&&!b.disabled)b.click()}})
})();
