/* ===== 动画：冒出来 ===== */
// 一句话的气泡：「…」先冒出来 → 长成整句的气泡 → 字从模糊里浮出 → 气泡褪去
function bubbleIn(tx,{k=1,typing=true,delay=0,lag=0,perm=false,right=false}={}){
  const T=v=>v*k;
  const sm=!!tx.closest('.rp');
  if(!perm){tx.classList.add('bub');if(sm)tx.classList.add('sm');tx.insertAdjacentHTML('afterbegin','<i class="bb" aria-hidden="true"></i>')}
  const host=tx.offsetParent||tx.parentNode,W=tx.offsetWidth,Hh=tx.offsetHeight;
  let sx=.3,sy=.5,tOut=delay;
  if(typing){
    const p=document.createElement('div');p.className='typing'+(sm?' sm':'');p.innerHTML='<i></i><i></i><i></i>';host.append(p);
    const pw=p.offsetWidth,ph=p.offsetHeight;
    p.style.left=(right?tx.offsetLeft+W-pw:tx.offsetLeft)+'px';p.style.top=(tx.offsetTop+Hh-ph)+'px';
    if(right)p.style.transformOrigin='100% 100%';
    p.animate([{transform:'scale(.15)',opacity:0},{transform:'scale(1.08)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}],{duration:T(440),delay:delay+T(100),easing:'ease-out',fill:'both'});
    tOut=delay+T(720);
    p.animate([{transform:'scale(1)',opacity:1},{transform:'scale(.92)',opacity:0}],{duration:T(170),delay:tOut,fill:'forwards'}).onfinish=()=>p.remove();
    sx=Math.min(1,pw/W);sy=Math.min(1,ph/Hh);
  }
  const tIn=tOut+lag;
  tx.style.transformOrigin=right?'100% 100%':'0 100%';
  tx.animate([{transform:`scale(${sx},${sy})`,opacity:0},{opacity:1,offset:.16},{transform:'scale(1)',opacity:1}],{duration:T(560),delay:tIn,easing:'cubic-bezier(.22,1.28,.42,1)',fill:'backwards'});
  const cs=[...tx.querySelectorAll('.c')],st=Math.min(24,560/Math.max(1,cs.length));
  cs.forEach((c,i)=>c.animate([{opacity:0,filter:'blur(5px)',transform:'translateY(4px)'},{opacity:1,filter:'blur(0px)',transform:'none'}],{duration:T(440),delay:tIn+T(110+i*st),easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
  const tEnd=tIn+T(110+cs.length*st+440);
  if(!perm)setTimeout(()=>{const bb=tx.querySelector(':scope>.bb'),done=()=>{if(bb)bb.remove();tx.classList.remove('bub','sm')};
    if(!bb||!tx.isConnected)return done();
    bb.animate([{opacity:1},{opacity:0}],{duration:T(900),easing:'ease',fill:'forwards'}).onfinish=done},tEnd+T(450));
  return {tOut,tIn,tEnd};
}
// 新的一行：先让出位置，再冒出来；带照片的，照片从气泡处像涟漪一样展开
function birth(row,{k=1,typing=true}={}){
  const host=row.closest('.it')||row,T=v=>v*k,cs=getComputedStyle(host),mt=parseFloat(cs.marginTop),mb=parseFloat(cs.marginBottom),h=host.offsetHeight;
  const slot=document.createElement('div');slot.className='slot';host.before(slot);slot.append(host);slot.style.overflow='hidden';
  slot.animate([{height:'0px'},{height:(h+mt+mb)+'px'}],{duration:T(460),easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>{slot.style.overflow=''};
  const tx=row.querySelector('.bd>.t>.tx'),bg=row.querySelector(':scope>.bg');
  const rr=row.getBoundingClientRect(),tr=tx.getBoundingClientRect(),ox=tr.left-rr.left,oy=tr.bottom-rr.top;
  const {tOut,tIn,tEnd}=bubbleIn(tx,{k,typing,delay:T(220),lag:bg?T(240):0});
  if(bg){const Rr=Math.hypot(rr.width,rr.height)+30;
    bg.animate([{clipPath:`circle(0px at ${ox}px ${oy}px)`},{clipPath:`circle(${Rr}px at ${ox}px ${oy}px)`}],{duration:T(950),delay:tOut-T(40),easing:'cubic-bezier(.45,0,.1,1)',fill:'backwards'})}
  row.querySelectorAll('.bd>.rp,.bd>.m').forEach(e=>e.animate([{opacity:0},{opacity:1}],{duration:T(380),delay:tIn,easing:'ease-out',fill:'backwards'}));
  if(!bg)row.animate([{backgroundColor:'rgba(255,255,255,.42)'},{backgroundColor:'rgba(238,246,200,.95)',offset:.3},{backgroundColor:'rgba(255,255,255,.42)'}],{duration:T(2600),delay:tIn});
}
// 一句新的回应：行高平滑变化，回应从小气泡里冒出
function replyIn(row,h0,{k=1,typing=true}={}){
  const T=v=>v*k,h1=row.offsetHeight;
  if(h1!==h0){row.style.overflow='hidden';row.animate([{height:h0+'px'},{height:h1+'px'}],{duration:T(380),easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>row.style.overflow=''}
  const tx=row.querySelector('.rp .tx');if(tx)bubbleIn(tx,{k,typing,delay:T(80)});
  const c=row.querySelector('.cnt');if(c)c.animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:T(420),delay:T(900),easing:'ease-out'});
}

