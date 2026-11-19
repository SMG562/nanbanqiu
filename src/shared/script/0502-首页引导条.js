/* ===== 首页引导条（11-08 首版，11-19 重做成「球场灯亮起」动画）=====
 * 每天每端（pwa / web 各一次）显示一次，所有人都看；当天再打开不显示。规则见 0501 nbqIntroDecide。
 * 从分享 / 推送 / 球局链接进来：这次不显示，也不占额度。
 * 动画（舒缓版约 11 秒）：夜色里静一拍 → 球从右边蹦进来落在场地中间 → 球场灯预热、由暗到亮，光从灯处向外铺开，回到主题深绿
 *   → 出现「挑一场，加入。」→ 停约 3 秒 → 淡出收起。球一直是亮的；球场、边线、灯的位置不变。
 * 提前结束（都不再显示，额度显示时就记了）：点 × / Esc（球滚出收起）；往下滑 / 点开一场球 / 切走首页（安静收起）；鼠标悬停时暂停自动收起的计时。
 * 显示时（页面可见才开始，记当天额度）手机端不自动弹位置授权（0120 go）；系统开了「减少动态效果」则直接显示最终画面。
 * 本机记录 nbq_intro = {v:2,first,days:{pwa,web},n}；存储读写失败只在内存里记（这次打开内不再出现）。
 * 开关：正式站（#203）、分支预览（staging）、预览站默认开；本地 / 测试域名关，localStorage nbq_ff_intro=1 单独打开。
 * 不单独埋点（加事件要改库里的事件表）：效果用现有的 session_start + game_view 做上线前后对比。 */
const NBQ_INTRO_K='nbq_intro',NBQ_INTRO_AUDIENCE='all';
const NBQ_INTRO=(()=>{const s={on:false,deep:false,force:false,state:null,K:1,hover:false,t:0,anims:[]};
  try{s.on=typeof NBQ_ENV!=='undefined'&&(NBQ_ENV==='prod'||NBQ_ENV==='staging'||NBQ_ENV==='preview')||localStorage.getItem('nbq_ff_intro')==='1'}catch(_){}
  // 落地网址在启动路由改写 hash 之前记下
  try{s.deep=/^#\/./.test(location.hash)||/\/(g|u|p)\//.test(location.pathname)||(typeof AN!=='undefined'&&(AN.entry==='share'||AN.entry==='push'))}catch(_){}
  // 测试用：网址带 ?intro=1 强制显示且不占额度（仅预览 / 本地；正式站无效）
  try{s.force=typeof NBQ_ENV!=='undefined'&&NBQ_ENV!=='prod'&&/[?&]intro=1(&|$)/.test(location.search)}catch(_){}
  try{if(window.__NBQ_INTRO_K>0)s.K=window.__NBQ_INTRO_K}catch(_){}   // 测试用：把时间整体缩短
  return s})();
const nbqIntroSurface=()=>typeof AN_BUILD!=='undefined'&&AN_BUILD==='web'?'web':'pwa';
function nbqIntroRec(){try{const j=JSON.parse(localStorage.getItem(NBQ_INTRO_K)||'null');return j&&j.v>=2?j:j&&j.v>=1?{v:2,first:j.at||0,days:{},n:0}:null}catch(_){return null}}
function nbqIntroMark(){const r=nbqIntroRec()||{v:2,first:Date.now(),days:{},n:0};r.first=r.first||Date.now();r.days=r.days||{};r.days[nbqIntroSurface()]=nbqIntroDay();r.n=(r.n||0)+1;
  try{localStorage.setItem(NBQ_INTRO_K,JSON.stringify(r))}catch(_){}}
function nbqIntroShowing(){
  if(NBQ_INTRO.state==='done')return false;
  if(NBQ_INTRO.state==='show')return true;
  const rec=nbqIntroRec();
  if(nbqIntroDecide({on:NBQ_INTRO.on,deep:NBQ_INTRO.deep,force:NBQ_INTRO.force,surface:nbqIntroSurface(),today:nbqIntroDay(),days:rec&&rec.days,audience:NBQ_INTRO_AUDIENCE,isNew:nbqIntroIsNew(rec)})!=='show')return false;
  NBQ_INTRO.state='show';return true}
const nbqIntroRM=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}};
function nbqIntroDone(by){
  if(NBQ_INTRO.state!=='show')return;NBQ_INTRO.state='done';clearTimeout(NBQ_INTRO.t);
  const el=document.getElementById('nbqIntro');if(!el)return;
  if((by==='x'||by==='auto')&&!nbqIntroRM()){const auto=by==='auto';el.classList.add('out');   // 像关灯 / 谢幕：整条渐隐，再向上折叠；球不动
    setTimeout(()=>el.classList.add('shut'),auto?650:350);setTimeout(()=>el.remove(),auto?1500:1100)}
  else{el.classList.add('shut');setTimeout(()=>el.remove(),500)}}
// 球：从右进场，真实弹跳 + 一条连续的减速曲线（没有折角）：
//   水平：x(t)=205+135·(1-t/T)²，一路自然减速、滚到停；竖直：先自由下落 100，再三次抛物线弹跳（40 → 14.4 → 5.2，恢复系数约 0.6，时长随 √高度），最后一小跳后只滚不弹
//   远小近大、落点越来越靠下（随 x）；落地挤压随冲击递减；滚动方向与前进方向一致（向左前进 = 逆时针）
const NI_FX=205,NI_T=1750,NI_LAND=[340,770,1028,1183],NI_HP=[40,14.4,5.2],NI_H0=100,NI_SQ={340:.14,770:.09,1028:.04};
const niX=t=>NI_FX+135*Math.pow(1-t/NI_T,2);
const niH=t=>{if(t<=0)return NI_H0;if(t>=NI_LAND[3])return 0;if(t<NI_LAND[0]){const s=t/NI_LAND[0];return NI_H0*(1-s*s)}
  for(let i=0;i<3;i++)if(t<NI_LAND[i+1]){const s=(t-NI_LAND[i])/(NI_LAND[i+1]-NI_LAND[i]);return 4*NI_HP[i]*s*(1-s)}return 0};
const niGnd=x=>-14*(x-NI_FX)/140,niK=x=>1-.2*(x-NI_FX)/140;
const NI_TS=(()=>{const a=new Set(NI_LAND);for(let t=0;t<=NI_T;t+=25)a.add(t);a.add(NI_T);return[...a].sort((x,y)=>x-y)})();
function nbqIntroPlay(el){
  const q=s=>el.querySelector(s),K=NBQ_INTRO.K,L=NBQ_INTRO.anims=[],F={fill:'both'},SOFT='cubic-bezier(.4,0,.3,1)';
  const A=(e,kf,o)=>{const a=e.animate(kf,{...o,duration:o.duration*K,delay:(o.delay||0)*K});L.push(a);return a};
  const arm=ms=>{clearTimeout(NBQ_INTRO.t);NBQ_INTRO.t=setTimeout(()=>{if(NBQ_INTRO.hover)arm(1500);else nbqIntroDone('auto')},ms)};
  const box=q('.ni-box'),dim=q('.ni-dim'),g=q('#niGlow').getBoundingClientRect(),b=box.getBoundingClientRect(),lx=g.left+g.width/2-b.left,ly=g.top+g.height/2-b.top;
  dim.style.setProperty('--lx',lx+'px');dim.style.setProperty('--ly',ly+'px');
  dim.style.setProperty('--nrmax',(Math.hypot(Math.max(lx,b.width-lx),Math.max(ly,b.height-ly))+260)+'px');
  if(nbqIntroRM()){dim.style.setProperty('--nir','var(--nrmax)');q('#niEb').style.opacity=1;const h=q('#niH');h.style.opacity=1;h.style.transform='none';h.style.filter='none';arm(5000);return}
  const D=900,T=NI_T;
  const kf=f=>NI_TS.map(t=>({offset:t/T,easing:'linear',...f(t,niX(t),niH(t))}));
  A(q('#niBX'),kf((t,x)=>({transform:`translateX(${(x-NI_FX).toFixed(2)}px)`})),{duration:T,delay:D,...F});
  A(q('#niBSpin'),kf((t,x)=>({transform:`rotate(${((x-NI_FX)*2.4).toFixed(1)}deg)`})),{duration:T,delay:D,...F});
  A(q('#niBY'),kf((t,x,h)=>({transform:`translateY(${(niGnd(x)-h).toFixed(2)}px)`})),{duration:T,delay:D,...F});
  const sq=[];Object.entries(NI_SQ).forEach(([t,s])=>{t=+t;const k=niK(niX(t));sq.push([t-30,k,k],[t,k*(1+s),k*(1-s*1.15)],[t+80,k*(1-s*.2),k*(1+s*.25)],[t+160,niK(niX(t+160)),niK(niX(t+160))])});
  const fr=[[0,niK(niX(0)),niK(niX(0))]];sq.sort((a,c)=>a[0]-c[0]).forEach(([t,x,y])=>{if(t<=fr[fr.length-1][0])t=fr[fr.length-1][0]+1;if(t<T)fr.push([t,x,y])});fr.push([T,niK(NI_FX),niK(NI_FX)]);
  A(q('#niBSq'),fr.map(([t,x,y])=>({offset:t/T,transform:`scale(${x.toFixed(3)},${y.toFixed(3)})`})),{duration:T,delay:D,...F});
  A(q('#niBSh'),kf((t,x,h)=>{const p=Math.min(1,h/46);return{transform:`translateY(${niGnd(x).toFixed(2)}px) scale(${(niK(x)*(1-.5*p)).toFixed(3)})`,opacity:.6*(1-.55*p)}}),{duration:T,delay:D,...F});
  // 球落稳、静半拍，灯由暗到亮（单调上升，不闪）；光从灯处向外铺开，夜色退去，回到主题深绿
  const Ls=D+T+700;
  A(q('#niLens'),[{opacity:.06},{opacity:1}],{duration:3200,delay:Ls,easing:SOFT,...F});
  A(q('#niGlow'),[{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1)'}],{duration:3600,delay:Ls,easing:SOFT,...F});
  A(dim,[{'--nir':'0px'},{'--nir':'var(--nrmax)'}],{duration:4400,delay:Ls+300,easing:'cubic-bezier(.45,.05,.35,1)',fill:'forwards'});
  setTimeout(()=>{if(NBQ_INTRO.state==='show')dim.style.setProperty('--nir','var(--nrmax)')},(Ls+4800)*K);
  setTimeout(()=>{if(NBQ_INTRO.state==='show')A(q('#niGlow'),[{opacity:1},{opacity:.92}],{duration:6000,direction:'alternate',iterations:Infinity,easing:'ease-in-out'})},(Ls+3600)*K);
  // 文字 → 停约 3 秒 → 淡出收起
  A(q('#niEb'),[{opacity:0},{opacity:1}],{duration:1100,delay:Ls+3700,...F});
  A(q('#niH'),[{transform:'translateY(110%)',filter:'blur(5px)',opacity:0},{transform:'none',filter:'blur(0)',opacity:1}],{duration:1300,delay:Ls+4000,easing:'cubic-bezier(.16,1,.3,1)',...F});
  arm((Ls+4000+1300+2800)*K)}
function nbqIntroStart(el){
  if(el._ni)return;el._ni=1;
  el.addEventListener('pointerenter',()=>{NBQ_INTRO.hover=true});el.addEventListener('pointerleave',()=>{NBQ_INTRO.hover=false});
  const go=()=>{if(NBQ_INTRO.state!=='show'||!el.isConnected)return;if(!NBQ_INTRO.force)nbqIntroMark();nbqIntroPlay(el)};   // 页面可见时才开始并记当天额度
  if(document.hidden){const f=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',f);go()}};document.addEventListener('visibilitychange',f)}else go()}
function nbqIntroHTML(){const city=typeof CITY!=='undefined'&&CITY.zh?CITY.zh:'';
  return `<section class="nbq-intro" id="nbqIntro" aria-label="南伴球"><div class="ni-wrap"><div class="ni-box">
  <div class="ni-scene" aria-hidden="true"><svg viewBox="0 0 300 170" preserveAspectRatio="xMaxYMid meet"><defs>
   <radialGradient id="niGl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4C8" stop-opacity=".72"/><stop offset=".5" stop-color="#FFF4C8" stop-opacity=".22"/><stop offset="1" stop-color="#FFF4C8" stop-opacity="0"/></radialGradient>
   <radialGradient id="niBl" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#F0FC9E"/><stop offset=".42" stop-color="#D0F04A"/><stop offset=".8" stop-color="#B2D62B"/><stop offset="1" stop-color="#7F9E10"/></radialGradient>
   <radialGradient id="niBs" cx=".34" cy=".28" r=".9"><stop offset=".5" stop-color="#2B4300" stop-opacity="0"/><stop offset="1" stop-color="#1D3000" stop-opacity=".42"/></radialGradient>
   <filter id="niFz" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 .75  0 0 0 .9 -.34" result="s"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s2"/></feMerge></filter>
   <clipPath id="niBc"><circle r="13"/></clipPath></defs>
   <path d="M0 85H300V170H0Z" fill="#164F35"/>
   <g stroke="#E8F1E9" stroke-opacity=".42" stroke-width="1.2" fill="none"><path d="M150 88H260L330 178H80Z"/><path d="M118 116H292M205 116V178"/></g>
   <line x1="110" y1="85" x2="110" y2="30" stroke="#062A1D" stroke-width="2.4"/>
   <circle id="niGlow" cx="110" cy="30" r="38" fill="url(#niGl)"/><rect id="niLens" x="103" y="28" width="14" height="5" rx="1.5" fill="#FFF8DC"/></svg></div>
  <div class="ni-dim"></div>
  <div class="ni-balls" aria-hidden="true"><svg viewBox="0 0 300 170" preserveAspectRatio="xMaxYMid meet"><g id="niBX">
   <ellipse id="niBSh" cx="205" cy="149.4" rx="17" ry="3.3" fill="#04170F" opacity=".6" style="transform-origin:205px 149.4px"/>
   <g id="niBY"><g id="niBSq" style="transform-origin:205px 148px"><g transform="translate(205 132.4) scale(1.2)" class="ni-hit" id="niBall"><circle r="13" fill="url(#niBl)"/>
    <g clip-path="url(#niBc)"><g id="niBSpin" fill="none" stroke-linecap="round"><path d="M-12.2 -4.5C-4.5 -1.5 -4.5 6.5 -8 10.3M12.2 4.5C4.5 1.5 4.5 -6.5 8 -10.3" stroke="#5B7400" stroke-opacity=".35" stroke-width="2" transform="translate(.4 .5)"/><path d="M-12.2 -4.5C-4.5 -1.5 -4.5 6.5 -8 10.3M12.2 4.5C4.5 1.5 4.5 -6.5 8 -10.3" stroke="#F7FBE6" stroke-width="1.5"/></g></g>
    <circle r="13" fill="url(#niBs)"/><circle r="13" fill="url(#niBl)" filter="url(#niFz)" opacity=".45"/><ellipse cx="-4.6" cy="-5.6" rx="3.3" ry="1.9" transform="rotate(-35 -4.6 -5.6)" fill="#fff" opacity=".42"/></g></g></g></g></svg></div>
  <button class="ni-x" data-a="introX" aria-label="知道了，关闭"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>
  <div class="ni-txt"><div class="ni-eb" id="niEb">${esc(city)}华人网球约局</div><h2><span class="ni-ln"><span id="niH">挑一场，<em>加入。</em></span></span></h2></div></div></div></section>`}
// 两端在渲染首页时调用：here = 现在是不是首页
function nbqIntroSync(host,here){if(!host)return;const el=host.querySelector('#nbqIntro');
  if(here&&nbqIntroShowing()){if(!el){host.innerHTML=nbqIntroHTML();nbqIntroStart(host.querySelector('#nbqIntro'))}}
  else if(el&&!el.classList.contains('shut'))nbqIntroDone('away')}
document.addEventListener('click',e=>{if(NBQ_INTRO.state!=='show')return;const t=e.target;
  if(t.closest('[data-a="introX"]')){e.stopPropagation();nbqIntroDone('x');return}
  if(t.closest('#niBall')){const el=document.getElementById('nbqIntro');if(el&&!nbqIntroRM()){const q=s=>el.querySelector(s);
    q('#niBY').animate([{transform:'translateY(0)',easing:'cubic-bezier(.25,.46,.45,.94)'},{transform:'translateY(-26px)',offset:.45,easing:'cubic-bezier(.55,.085,.68,.53)'},{transform:'translateY(0)'}],{duration:480});
    q('#niBSpin').animate([{transform:'rotate(0)'},{transform:'rotate(200deg)'}],{duration:480,easing:'ease-out'})}return}
  if(t.closest('[data-open],[data-sel]'))nbqIntroDone('open')},true);
// 往下滑：只认用户自己的滚动手势（页面启动时程序自动滚到「现在」不算）
const nbqIntroScroll=e=>{if(NBQ_INTRO.state==='show'&&!(e.target.closest&&e.target.closest('#nbqIntro')))nbqIntroDone('scroll')};
document.addEventListener('wheel',nbqIntroScroll,{passive:true,capture:true});document.addEventListener('touchmove',nbqIntroScroll,{passive:true,capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&NBQ_INTRO.state==='show'&&document.getElementById('nbqIntro'))nbqIntroDone('x')});
