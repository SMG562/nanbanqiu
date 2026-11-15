/* ===== 手机端视口守卫 =====
   iOS Safari 弹键盘时不缩小布局视口（只缩小「可视视口」visualViewport），固定在底部的东西会被键盘盖住，或者整页被顶上去、收起后错位。
   这里让外壳始终等于「当前可见区域」：键盘弹出时缩高并跟着可视区平移，收起后一定回到 0。
   判断键盘不看单个数字，而是和「没有键盘时记下的高度」比：不管浏览器有没有同时缩小 innerHeight 都成立。
   诊断：网址后面加 ?dbg，左上角实时显示这些数值（真机出问题时截图给我）。 */
(function(){
  const vv=window.visualViewport,d=document.querySelector('.device'),mq=matchMedia('(max-width:560px)');
  if(!vv||!d)return;
  // iOS 26 起，键盘上方那条「▲ ▼ ✓」工具条是浮在页面上的，不算进键盘高度：visualViewport 只扣掉键盘，这条（约 68pt）仍盖在页面底部，
  //   外壳按 vv.height 算高就会把贴底的输入栏（聊天 / 说一句）压在它下面，页面滚到底也看不到（11-16 真机截图：内容在工具条上沿被截断，Safari 和微信内一致）。
  //   所以键盘弹出时外壳再让出这一条。判断：Safari 的 Version/26+ 或 WebView 的 OS 26+；网址加 ?acc=数字 可手动调（真机微调用）。
  const uaV=(navigator.userAgent.match(/Version\/(\d+)/)||[])[1]||(navigator.userAgent.match(/OS (\d+)[_.]/)||[])[1],ACCQ=(location.search.match(/[?&]acc=(\d+)/)||[])[1];
  const ACC=ACCQ!=null?+ACCQ:(/iPhone|iPad/.test(navigator.userAgent)&&+uaV>=26?68:0);
  let raf=0,kb=false,base=Math.max(innerHeight,vv.height+vv.offsetTop),dbg=null;
  const typing=()=>{let a=document.activeElement;while(a&&a.shadowRoot&&a.shadowRoot.activeElement)a=a.shadowRoot.activeElement;return !!a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||!!a&&a.isContentEditable};
  const reset=()=>{if(scrollX||scrollY)scrollTo(0,0)};
  const off=()=>{if(!kb&&!d.style.transform&&!d.style.getPropertyValue('--vvh'))return;kb=false;d.classList.remove('kb');d.style.removeProperty('--vvh');d.style.transform=''};
  const sync=()=>{raf=0;
    if(!mq.matches||vv.scale>1.02){off();paint();return}              // 电脑演示 / 用户双指放大：不动
    const h=vv.height,open=base-h>120&&typing()||base-h>200;           // 高度少了一大截（有输入框在打字 120，没有则要 200）= 键盘
    if(open){kb=true;d.classList.add('kb');d.style.setProperty('--vvh',(h-ACC)+'px');d.style.transform=vv.offsetTop?`translateY(${vv.offsetTop}px)`:''}
    else{off();reset();if(!typing())base=Math.max(innerHeight,h+vv.offsetTop)}   // 没键盘：更新「正常高度」（地址栏收放也会变）
    paint()};
  const paint=()=>{if(!dbg)return;dbg.textContent=`acc ${ACC}  innerH ${innerHeight}  vvH ${Math.round(vv.height)}  vvTop ${Math.round(vv.offsetTop)}  scale ${vv.scale.toFixed(2)}\nbase ${base}  kb ${kb}  typing ${typing()}  scrollY ${Math.round(scrollY)}\ndevice ${Math.round(d.getBoundingClientRect().top)}→${Math.round(d.getBoundingClientRect().bottom)}`};
  const ask=()=>{if(!raf)raf=requestAnimationFrame(sync)};
  if(/[?&]dbg\b/.test(location.search)){dbg=document.createElement('pre');dbg.style.cssText='position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 4px);z-index:99999;margin:0;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';document.body.appendChild(dbg);setInterval(paint,300)}
  vv.addEventListener('resize',ask);vv.addEventListener('scroll',ask);
  addEventListener('scroll',()=>{if(!kb)reset()},{passive:true});
  addEventListener('resize',ask);
  addEventListener('orientationchange',()=>{base=0;setTimeout(()=>{base=Math.max(innerHeight,vv.height+vv.offsetTop);ask()},400)});
  addEventListener('focusin',()=>{setTimeout(ask,60);setTimeout(ask,350)});
  addEventListener('focusout',()=>{setTimeout(()=>{ask();reset()},120);setTimeout(()=>{ask();reset()},420)});
  sync();
})();
