/* ===== 手机端视口守卫 =====
   iOS Safari 弹键盘时不缩小布局视口，而是把整页往上顶；收起后偶尔停在错位的位置（底栏被拉到半空、下面露出底色）。
   这里让外壳始终等于「当前可见区域」：键盘弹出时缩高并跟着可视区平移，收起后一定回到 0。 */
(function(){
  const vv=window.visualViewport,d=document.querySelector('.device'),mq=matchMedia('(max-width:560px)');
  if(!vv||!d)return;
  let raf=0,kb=false;
  const reset=()=>{if(scrollX||scrollY)scrollTo(0,0)};
  const sync=()=>{raf=0;
    if(!mq.matches||vv.scale>1.02){off();return}                 // 电脑演示 / 用户双指放大：不动
    const open=innerHeight-vv.height>120;                          // 高度少了一大截 = 键盘
    if(open){kb=true;d.classList.add('kb');d.style.setProperty('--vvh',vv.height+'px');d.style.transform=vv.offsetTop?`translateY(${vv.offsetTop}px)`:''}
    else{off();reset()}};
  const off=()=>{if(!kb&&!d.style.transform&&!d.style.getPropertyValue('--vvh'))return;kb=false;d.classList.remove('kb');d.style.removeProperty('--vvh');d.style.transform=''};
  const ask=()=>{if(!raf)raf=requestAnimationFrame(sync)};
  vv.addEventListener('resize',ask);vv.addEventListener('scroll',ask);
  addEventListener('scroll',()=>{if(!kb)reset()},{passive:true});
  addEventListener('orientationchange',()=>setTimeout(ask,300));
  addEventListener('focusout',()=>{setTimeout(()=>{ask();reset()},120);setTimeout(()=>{ask();reset()},420)});
  sync();
})();
