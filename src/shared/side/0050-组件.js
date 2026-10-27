/* ===== 组件 ===== */
// 排序：新鲜（刚发的十几分钟一定在上面）+ 热度（网球、回应）× 距离（越远沉得越快）
const score=x=>{const age=(Date.now()-x.t)/H,heat=Math.log1p(x.b+(x.my?1:0)+2*x.r.length),d=x.km==null?2.5:x.km;
  return 2.2*Math.exp(-age/.25)+Math.exp(-age/5)*(1+.45*heat)/(1+d/5)};
const F99=n=>n>99?'99+':n;
const ballBtn=(x,big)=>{const n=x.b+(x.my?1:0);return `<button class="ball${big?' big':''}${x.my?' on':''}" data-ball="${x.id}"><span class="bw"><svg viewBox="0 0 100 100"><use href="#${x.my?'ball':'ball0'}"/></svg></span><span class="odo">${n?`<b>${F99(n)}</b>`:''}</span></button>`};
const lineHTML=(x,o={})=>{const last=x.r[x.r.length-1],n=(x.pics||[]).length,pt=x.pic&&PM[x.pic];
  return `<div class="it${x.pic?' itp':' itt'}"><div class="ln${x.pic?' pc':''}${pt?' pt':''}" data-ln="${x.id}" style="--a:${alpha(x.t).toFixed(2)}">${x.pic?`<div class="bg">${PIC(x.pic,'band',x.tone)}</div>${n>1?`<span class="mst">${x.pics.slice(0,3).reverse().map(q=>`<i>${PIC(q,'band',x.tone)}</i>`).join('')}</span>`:''}${x.topic?`<span class="flr" data-topic="${x.topic}">#${esc(TOPICS[x.topic].t)} · No.${x.floor}</span>`:''}`:''}
  ${!x.pic&&CIC(x)?`<span class="cic">${ic(CIC(x),'')}</span>`:''}<div class="bd"><div class="t"><span class="tx">${chars(x.x)}</span></div>
  ${last?`<div class="rp" data-cmt="${x.id}"><b>${esc(RU(last,x).n)}</b>${last.op?'<em>作者</em>':''}<span class="tx">${chars(last.x)}</span></div>`:''}
  <div class="m">${av(U(x),16)}${unb(U(x))}<i>·</i>${!o.court&&x.w?(x.area?`<span class="pl ar">${esc(x.w)} 附近</span>`:`<span class="pl${o.my&&o.my.includes(x.w)?' mc':''}" data-court="${esc(x.w)}">${esc(x.w)}</span>`)+'<i>·</i>':''}<span>${o.court?hm(x.t):ago(x.t)}</span>${x.topic&&!x.pic?`<i>·</i><span class="tpl" data-topic="${x.topic}">#${esc(TOPICS[x.topic].t)} · No.${x.floor}</span>`:''}<span class="sp"></span>${x.r.length?`<span class="cnt" data-cmt="${x.id}">${ic('bub','')}<span class="n">${F99(x.r.length)}</span></span>`:''}${ballBtn(x)}</div></div></div></div>`};
const replyHTML=(r,x)=>{const u=RU(r,x);return `<div class="rr${r.me?' me':''}" data-rto="${r.me?'':esc(u.n)}">${av(u,28)}<div class="rb"><div class="rn">${unb(u)}${r.op?'<em>作者</em>':''}${r.me?'<em class="me">我</em>':''}<small>${ago(r.t)}</small></div><div class="rt">${r.to?`<span class="to">回复 ${esc(r.to)}：</span>`:''}<span class="tx">${chars(r.x)}</span></div></div></div>`};
// 剩余时间：一个会走的小圆圈，按住才显示文字
const lifeRing=t=>{const rem=Math.max(0,24*H-(Date.now()-t)),p=rem/(24*H),txt=rem>=H?`还会公开 ${Math.floor(rem/H)} 小时`:`还会公开 ${Math.max(1,Math.floor(rem/M))} 分钟`;
  return `<span class="lr" data-tip="${txt}"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" class="r0"/><circle cx="8" cy="8" r="6.2" class="r1" style="stroke-dashoffset:${(38.96*(1-p)).toFixed(2)}"/></svg></span>`};
const life=t=>{const rem=Math.max(0,24*H-(Date.now()-t));return {txt:rem>=H?`还剩 ${Math.floor(rem/H)} 小时`:`还剩 ${Math.max(1,Math.floor(rem/M))} 分钟`,p:rem/(24*H)}};

