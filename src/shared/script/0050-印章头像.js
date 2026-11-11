// ===== 印章头像：整枚印一次盖出（同一滤镜），外形清晰、浓淡各异 =====
const hashS=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const rngS=seed=>{let a=hashS(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
let _sid=0;
function glyphInner(k){const a=LA[k];return `<path d="${a.d}" ${a.fill?'fill="currentColor" stroke="none"':''}/><g fill="currentColor" stroke="none">${a.f}</g>`}
const animalContent=(k,scale=1)=>{const a=LA[k],g=60*(a.KK||1)*scale,o=(100-g)/2;return `<svg x="${o}" y="${o}" width="${g}" height="${g}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyphInner(k)}</svg>`};
const letterContent=ch=>`<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="46" font-weight="800" fill="currentColor" font-family="-apple-system,PingFang SC,Helvetica,Arial,sans-serif">${ch}</text>`;
const FREE_BOOST={bee:1.1,ant:1.1,rabbit:1.06,duck:1.06,bird:1.06,snake:1.08,hedgehog:1.06,turtle:1.06};
const seedAnimal=s=>{s=String(s);for(const k of Object.keys(FREE_BOOST))if(s.includes(k))return k;return ''};
// 印型：白文方印 / 白文圆印 / 朱文方框 / 朱文圆框 / 无框
const STYLES=['bw-rd','bw-rd-m:linen','zw-rd','bw-rd-g','bw-rd-m:rim','bw-rd-m:dry','free','bw-rd-m:press'];  // 换一枚印依次轮换：白文 / 布纹 / 朱文 / 毛玻璃 / 积墨边 / 飞白 / 无框 / 偏压
function stampSVG(contentFn,color,sz,seed,forceStyle,tiltKey){const r=rngS(seed),id='s'+(++_sid);
  const st=forceStyle||STYLES[Math.floor(r()*STYLES.length)];
  const rad=st.endsWith('sq')?(6+r()*10):50, inset=4+r()*2, s=100-2*inset;
  const shape=`<rect x="${inset}" y="${inset}" width="${s}" height="${s}" rx="${Math.min(rad,s/2)}"`;
  const s1=Math.floor(r()*999),s2=Math.floor(r()*999),s3=Math.floor(r()*999);
  const FXN=st.includes(':')?st.split(':')[1]:'clouda';
  const mot=st.includes('-m'),glass=st.endsWith('-g'),tiny=sz<44;
  const P=tiny?{f:.4,disp:.4,tone:'-.15 1.08',grain:'-4 4.2'}:mot?{f:.5,disp:.55,tone:'-.12 1.05',grain:/^cloud[ab]$/.testFXN?'-2.5 2.7':'-9 8.6'}:{f:.45,disp:.5,tone:'-.1 1.04',grain:'-9 8.6'};
  // 动物的微倾斜只跟「这个人 + 这只动物」有关，换印时不再转动
  const tilt=((rngS('tilt'+(tiltKey||seed))()-.5)*4).toFixed(1);
  const Rr=s/2,edge=!tiny&&!glass;  // 毛玻璃：干净纯圆
  // 边缘「吃墨不足」：几段柔和的淡处，从边线向内渐隐，像按印时一侧没压实 —— 不再有向内的硬缺口
  const edgeF=`<filter id="${id}w" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${mot?1.3:1.6}" result="b"/><feTurbulence type="fractalNoise" baseFrequency="${mot&&!/^cloud[ab]$/.testFXN?.5:.22}" numOctaves="2" seed="${s3+5}"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${mot?2.4:1.8} 0 0 0 ${mot?-.5:-.35}" result="na"/><feComposite in="b" in2="na" operator="in"/></filter>`;
  const soft=(n,rim)=>{let h='';const arc=(a0,a1,rr)=>{const p=a=>`${(50+Math.cos(a)*rr).toFixed(2)} ${(50+Math.sin(a)*rr).toFixed(2)}`;return `M${p(a0)} A${rr} ${rr} 0 ${a1-a0>Math.PI?1:0} 1 ${p(a1)}`};
    for(let i=0;i<n;i++){const a0=r()*Math.PI*2,len=.35+r()*.55,w=3+r()*2.4;
      h+=`<path d="${arc(a0,a0+len,rim+.4)}" fill="none" stroke="#000" stroke-opacity="${(.7+r()*.25).toFixed(2)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`}
    return `<g filter="url(#${id}w)">${h}</g>`};
  // 斑驳拓印：印面里有大块的深浅起伏 + 细碎的露白，像拓在粗纸上
  const ML=1;
  const MT=[...[['.42 .55 .8 1 1','1 1 1 1 1 1 1 1 .25 0'],['.25 .4 .72 1 1','1 1 1 1 1 1 1 .3 0 0'],['.12 .3 .65 .95 1','1 1 1 1 1 1 .45 .1 0 0']][ML]];
  const CF=FXN;
  if(CF==='clouda')MT[1]='1';                                   // 云纹 · 去点：只留大块深浅
  if(CF==='cloudb'){MT[0]='.12 .26 .66 1 1';MT[1]='1'}            // 云纹 · 去点 · 浓：起伏更明显
  const motF=`<filter id="${id}t" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="3" seed="${s1+11}" result="lo"/><feComponentTransfer in="lo" result="lc"><feFuncR type="table" tableValues="${MT[0]}"/><feFuncG type="table" tableValues="${MT[0]}"/><feFuncB type="table" tableValues="${MT[0]}"/><feFuncA type="discrete" tableValues="1"/></feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="${s2+7}" result="hi"/><feComponentTransfer in="hi" result="hc"><feFuncR type="discrete" tableValues="${MT[1]}"/><feFuncG type="discrete" tableValues="${MT[1]}"/><feFuncB type="discrete" tableValues="${MT[1]}"/><feFuncA type="discrete" tableValues="1"/></feComponentTransfer>
    <feComposite in="lc" in2="hc" operator="arithmetic" k1="1" result="mx"/><feComposite in="mx" in2="SourceGraphic" operator="in"/></filter>`;

  // ---------- 拓印质感（斑驳拓印的几种「手感」） ----------
  const FX=FXN;
  const spk=(fid,seed,freq,tbl,clip)=>`<filter id="${fid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="${tbl}"/></feComponentTransfer>${clip?'<feComposite in2="SourceGraphic" operator="in"/>':''}</filter>`;
  const clipC=`<clipPath id="${id}c"><circle cx="50" cy="50" r="${(Rr).toFixed(2)}"/></clipPath>`;
  function faceFX(){const W=`${shape} fill="#fff"/>`;
    // 通用：一层噪声 → 阈值 → 黑色半透明（=该处少吃墨）
    const nl=(fid,type,freq,oct,seed,fa,extra)=>`<filter id="${fid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="${type}" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0"/><feComponentTransfer><feFuncA ${fa}/></feComponentTransfer>${extra||''}</filter>`;
    const L=(fid,op,rot)=>`<g transform="rotate(${rot||0} 50 50)"><rect x="-25" y="-25" width="150" height="150" fill="#000" filter="url(#${fid})" opacity="${op}"/></g>`;
    const wrap=(defs,layers)=>({defs:clipC+defs,face:W+`<g clip-path="url(#${id}c)">${layers}</g>`});
    const fine=nl(id+'z','fractalNoise','.95',2,s3,'type="discrete" tableValues="0 0 0 0 0 0 0 0 .7 .9"');
    const rot=(r()*180).toFixed(0);
    if(FX==='sand') // 砂岩纹：细密的颗粒成片聚集，像砂岩表面
      return wrap(nl(id+'a','fractalNoise','.16',3,s1,'type="discrete" tableValues="0 0 0 0 0 0 .55 .8 .95 1"')+fine,L(id+'a',.5)+L(id+'z',.6));
    if(FX==='stain'){ // 水渍纹：一块块浅下去的墨，边上留一道略深的水线
      const t=Array.from({length:20},(_,k)=>k<11?.1:k===11?0:.42).join(' ');
      return wrap(nl(id+'a','fractalNoise','.04',2,s1,`type="discrete" tableValues="${t}"`)+fine,L(id+'a',1)+L(id+'z',.35))}
    if(FX==='crack') // 冰裂纹：像哥窑开片，细线交织成大小不一的片
      return wrap(nl(id+'a','turbulence','.045',1,s1,'type="linear" slope="-16" intercept="1"')+nl(id+'b','turbulence','.11',1,s2,'type="linear" slope="-22" intercept="1"'),L(id+'a',.45)+L(id+'b',.2));
    if(FX==='wood'){ // 木纹：拉长的年轮，一圈圈深浅相间
      const t='0 .8 .1 .75 0 .8 .1 .75 0 .8 .1 .75 0';
      return wrap(nl(id+'a','fractalNoise','.006 .045',2,s1,`type="table" tableValues="${t}"`)+fine,L(id+'a',.6,rot)+L(id+'z',.3))}
    if(FX==='marble') // 大理石纹：几道流动的淡纹，像石材的脉络
      return wrap(`<pattern id="${id}l" width="19" height="19" patternUnits="userSpaceOnUse"><rect width="1" height="19" fill="#000"/></pattern><filter id="${id}d" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="4" seed="${s1}"/><feDisplacementMap in="SourceGraphic" scale="34" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".45"/></filter>`+fine,
        `<g transform="rotate(${rot} 50 50)"><rect x="-25" y="-25" width="150" height="150" fill="url(#${id}l)" filter="url(#${id}d)" opacity=".55"/></g>`+L(id+'z',.3));
    if(FX==='snow') // 雪点纹：大大小小的圆点留白，像落了一层细雪
      return wrap(nl(id+'a','fractalNoise','.3',1,s1,'type="discrete" tableValues="0 0 0 0 0 0 0 0 0 0 0 .9 1 1 1 1"')+nl(id+'b','fractalNoise','.75',1,s2,'type="discrete" tableValues="0 0 0 0 0 0 0 0 0 .8 1 1 1"'),L(id+'a',.55)+L(id+'b',.45));
    if(FX==='rust') // 古印残：像出土的老印，越靠边越斑驳，中间完好
      return {defs:clipC+nl(id+'a','fractalNoise','.11',3,s1,'type="discrete" tableValues="0 0 0 0 0 .5 .9 1 1 1"')+fine+`<radialGradient id="${id}r"><stop offset=".52" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient><mask id="${id}k"><rect width="100" height="100" fill="url(#${id}r)"/></mask>`,
        face:W+`<g clip-path="url(#${id}c)"><g mask="url(#${id}k)">${L(id+'a',.9)}</g>${L(id+'z',.3)}</g>`};
    if(FX==='linen') // 布纹：隔着一层细麻布拓下来，经纬隐约可见
      return wrap(`<pattern id="${id}l" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><rect width="2.2" height=".7" fill="#000"/><rect width=".7" height="2.2" fill="#000" opacity=".7"/></pattern>`+nl(id+'a','fractalNoise','.05',2,s1,'type="table" tableValues=".25 .35 .7 1"'),
        `<g transform="rotate(${(r()*8-4).toFixed(1)} 50 50)"><rect x="-25" y="-25" width="150" height="150" fill="url(#${id}l)" opacity=".42"/></g>`+L(id+'a',.35));
    if(FX==='pat'){ // 拓包轻拍：一下一下拍上去的圆形墨团，边缘柔、彼此叠压
      let c='';const n=9+Math.floor(r()*4);for(let i=0;i<n;i++){const a=r()*Math.PI*2,d=r()*Rr*.75,x=50+Math.cos(a)*d,y=50+Math.sin(a)*d,rr=7+r()*7;
        c+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="#000" fill-opacity="${(.07+r()*.07).toFixed(2)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rr-1.2).toFixed(1)}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.1"/>`}
      return {defs:clipC+`<filter id="${id}b"><feGaussianBlur stdDeviation="1.1"/></filter>`+spk(id+'s',s2,'.8','0 0 0 0 0 0 0 0 .9 .9'),
        face:W+`<g clip-path="url(#${id}c)"><g filter="url(#${id}b)">${c}</g><rect width="100" height="100" fill="#000" filter="url(#${id}s)" opacity=".4"/></g>`}}
    if(FX==='fiber'){ // 宣纸纤维：纸里的长纤维没吃上墨，留下一丝丝细白
      const fl=(fid,seed,f)=>`<filter id="${fid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="turbulence" baseFrequency="${f}" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -24 0 0 0 1"/></filter>`;
      return {defs:clipC+fl(id+'x',s2,'.03 .09')+fl(id+'y',s3,'.085 .028')+spk(id+'s',s1,'.9','0 0 0 0 0 0 0 0 0 .8'),
        face:W+`<g clip-path="url(#${id}c)"><rect width="100" height="100" fill="#000" filter="url(#${id}x)" opacity=".5"/><rect width="100" height="100" fill="#000" filter="url(#${id}y)" opacity=".32"/><rect width="100" height="100" fill="#000" filter="url(#${id}s)" opacity=".5"/></g>`}}
    if(FX==='dry'){ // 干笔飞白：一笔顺着印边扫过，笔中几道两头尖的留白丝，疏朗有气；只走外圈，不碰中间的动物
      const lens=(a0,a1,rr,w)=>{const o=[],i=[],n=28;for(let k=0;k<=n;k++){const t=k/n,a=a0+(a1-a0)*t,th=w*Math.pow(Math.sin(Math.PI*t),.65)*(1-.35*t);
          o.push(`${(50+Math.cos(a)*(rr+th/2)).toFixed(2)} ${(50+Math.sin(a)*(rr+th/2)).toFixed(2)}`);i.unshift(`${(50+Math.cos(a)*(rr-th/2)).toFixed(2)} ${(50+Math.sin(a)*(rr-th/2)).toFixed(2)}`)}
        return `M${o.join(' L')} L${i.join(' L')}Z`};
      const sweep=(c,span,r0,r1,n,op)=>{let h='';for(let k=0;k<n;k++){const t=n>1?k/(n-1):.5,rr=r0+(r1-r0)*t,mid=1-Math.abs(t-.5)*1.3,len=span*(.45+.55*mid)*(.8+r()*.35),st=c-len/2+(r()-.5)*.25,w=.9+r()*1.6;
          if(r()<.4){const cut=.35+r()*.3,gap=.05+r()*.06;h+=`<path d="${lens(st,st+len*cut,rr,w)}"/><path d="${lens(st+len*(cut+gap),st+len,rr,w*.8)}"/>`}
          else h+=`<path d="${lens(st,st+len,rr,w)}"/>`}
        return `<g fill="#000" fill-opacity="${op}">${h}</g>`};
      const c1=r()*Math.PI*2,R1=Rr*.95;
      const strokes=sweep(c1,2.1+r()*.6,Rr*.74,R1,5,.92)+(r()<.6?sweep(c1+Math.PI*(.9+r()*.25),.9+r()*.4,Rr*.82,R1,3,.7):'');
      return {defs:clipC+`<filter id="${id}y" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="2" seed="${s2}"/><feDisplacementMap in="SourceGraphic" scale="1.1" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".18"/></filter>`,
        face:W+`<g clip-path="url(#${id}c)"><g filter="url(#${id}y)">${strokes}</g></g>`}}
    if(FX==='rim'){ // 积墨边：中间墨薄、边缘墨厚，像水彩干透后的一圈
      return {defs:clipC+`<radialGradient id="${id}r" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8A8A8A"/><stop offset=".68" stop-color="#A2A2A2"/><stop offset=".9" stop-color="#E6E6E6"/><stop offset=".97" stop-color="#fff"/></radialGradient>`+spk(id+'s',s1,'.06','.18 .1 0 0 0 0 0 .12 .2 .3'),
        face:`${shape} fill="url(#${id}r)"/><g clip-path="url(#${id}c)"><rect width="100" height="100" fill="#000" filter="url(#${id}s)"/></g>`}}
    if(FX==='press'){ // 偏压：一侧压得实，另一侧渐渐吃不上墨，碎点越来越多
      const a=r()*360;
      return {defs:clipC+`<linearGradient id="${id}p" gradientTransform="rotate(${a.toFixed(0)} .5 .5)"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#8E8E8E"/></linearGradient><linearGradient id="${id}q" gradientTransform="rotate(${a.toFixed(0)} .5 .5)"><stop offset=".3" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="${id}k"><rect width="100" height="100" fill="url(#${id}q)"/></mask>`+spk(id+'s',s2,'.55','0 0 0 0 0 0 1 1 1 1'),
        face:`${shape} fill="url(#${id}p)"/><g clip-path="url(#${id}c)" mask="url(#${id}k)"><rect width="100" height="100" fill="#000" filter="url(#${id}s)"/></g>`}}
    return {defs:motF,face:`${shape} fill="#fff" filter="url(#${id}t)"/>`}}
  const ga=r()*Math.PI*2,gx=Math.cos(ga)*50,gy=Math.sin(ga)*50;
  const rimG=`<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${(50+gx).toFixed(1)}" y1="${(50+gy).toFixed(1)}" x2="${(50-gx).toFixed(1)}" y2="${(50-gy).toFixed(1)}"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>`;
  const filt=`<filter id="${id}f" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="${P.f}" numOctaves="3" seed="${s1}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${P.disp}" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="${s2}" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${P.tone}" result="tn"/><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="${s3}" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${P.grain}" result="gn"/><feComposite in="d" in2="tn" operator="in" result="c"/><feComposite in="c" in2="gn" operator="in"/></filter>`;
  let body;
  if(st.startsWith('bw')){ // 白文：实心印面，动物镂空
    const F=mot&&!tiny?faceFX():{defs:'',face:`${shape} fill="#fff"/>`};
    const glyph=`<g style="color:#000;--bg:#fff" transform="rotate(${tilt} 50 50)">${contentFn(.92)}</g>`;
    body=`<mask id="${id}m">${F.face}${edge&&FX!=='press'?soft(mot?3:2,Rr):''}${glyph}</mask>${edge?rimG+edgeF:''}${F.defs}`;
    if(mot&&!tiny&&FX==='ghost'){ // 双印重影：盖了两次、第二次轻轻错开，留下一层淡淡的影子
      const dx=(2.2+r()*1.4)*(r()<.5?-1:1),dy=(1.8+r()*1.4)*(r()<.5?-1:1);
      body=`<mask id="${id}m">${shape} fill="#fff"/>${edge?soft(2,Rr):''}${glyph}</mask><mask id="${id}n"><g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${(r()*3-1.5).toFixed(1)} 50 50)">${shape} fill="#fff"/>${glyph}</g></mask>${edge?rimG+edgeF:''}`;
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 100 100" style="display:block;overflow:visible"><defs>${filt}${body}</defs><g filter="url(#${id}f)"><rect x="-10" y="-10" width="120" height="120" fill="${color}" fill-opacity=".42" mask="url(#${id}n)"/><rect width="100" height="100" fill="${color}" fill-opacity=".9" mask="url(#${id}m)"/></g></svg>`}
    const rim=edge&&!mot?`<circle cx="50" cy="50" r="${(Rr-1).toFixed(2)}" fill="none" stroke="url(#${id}g)" stroke-width="2" mask="url(#${id}m)"/>`:'';
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 100 100" style="display:block;overflow:visible"><defs>${filt}${body}</defs><g filter="url(#${id}f)"><rect width="100" height="100" fill="${color}"${glass?' fill-opacity=".58"':''} mask="url(#${id}m)"/>${rim}</g></svg>`}
  const sw=3+r()*2.5,frame=st==='free'?'':`${shape} fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}"/>`;
  const fr=frame.replace(`stroke="${color}"`,'stroke="#fff"')+(st==='free'||tiny?'':soft(2,Rr+sw/2));return `<svg width="${sz}" height="${sz}" viewBox="0 0 100 100" style="display:block;overflow:visible"><defs>${filt}${edgeF}<mask id="${id}m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">${fr}<g style="color:#fff;--bg:#000" transform="rotate(${tilt} 50 50)">${contentFn(st==='free'?1.38*(FREE_BOOST[seedAnimal(seed)]||1):.9)}</g></mask></defs><g filter="url(#${id}f)"><rect x="-10" y="-10" width="120" height="120" fill="${color}" mask="url(#${id}m)"/></g></svg>`}
const INK='#3A4252';
// 选择面板：只显示动物本身，极简
const pickSVG=(k,sz)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:${INK};--bg:#fff;display:block">${glyphInner(k)}</svg>`;
function avatarSVG(k,color,sz,seed){return `<span class="av wd" style="width:${sz}px;height:${sz}px">${stampSVG(s=>animalContent(k,s),color,sz,seed||k,'bw-rd')}</span>`}
const ZAVC=[["paper","#F4EFE3"],["red", "#E3262B"], ["orange", "#F07D1A"], ["olive", "#6B8A2E"], ["green", "#1FA35C"], ["teal", "#11A394"], ["sky", "#2C98EC"], ["navy", "#24457F"], ["violet", "#7B68EE"], ["rose", "#E0548A"], ["cocoa", "#8A5A44"], ["slate", "#3A4252"]];

