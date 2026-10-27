/* =====================================================================
 * 第三批 · 3a 模拟数据层（DB）+ 查询（Q）
 * DB：和 schema.sql 同名的表（只含后台用到的列），从上线第一天到此刻逐天生成，按日期固定（同一天打开结果一样）
 *     users · games · game_participants · invites · game_feel · player_prefs · impressions · noshow_reports · reports · blocks
 *     访问类：activity[day] = 当天每个活跃球友一行（设备 / 页面 / 入口 / 打开方式 / 会话数），anon[day] = 当天每个未登录访客一行
 *             —— 对应 events 表按「人 × 天」汇总（events → daily rollup），可以算真实的去重人数
 *     shares（分享）· msgs（消息按天汇总）
 * Q：和 schema 视图 / 函数同名同口径的查询；页面只调用 Q，上线时 Q 换成 GET /admin/api/...（清单见 3e）
 * 时间：day = 0（上线第一天）… DB.L（今天）；今天只生成到此刻
 * ===================================================================== */
const DB=(()=>{const t0=performance.now();
  let s=20261015>>>0;const R=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  let s2=7771>>>0;const R2=()=>{s2=(s2+0x6D2B79F5)>>>0;let t=s2;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};   // 第二条随机数流（3d 新增的访问细节），不影响原有数据
  const pois2=m=>{let L=Math.exp(-m),k=0,p=1;do{k++;p*=R2()}while(p>L&&k<60);return k-1},poisE=L=>{let k=0,p=1;do{k++;p*=R2()}while(p>L&&k<60);return k-1};
  const pickW=(a,w)=>{let x=R()*w.reduce((p,q)=>p+q,0);for(let i=0;i<a.length;i++){x-=w[i];if(x<=0)return a[i]}return a[a.length-1]};
  const samp=(a,w)=>{const c=[];let t=0;w.forEach(x=>{t+=x;c.push(t)});return()=>{const x=R()*t;let lo=0,hi=c.length-1;while(lo<hi){const m=(lo+hi)>>1;if(c[m]<x)lo=m+1;else hi=m}return a[lo]}};   // 预先算好累计权重，抽样 O(log n)
  const pois=m=>{let L=Math.exp(-m),k=0,p=1;do{k++;p*=R()}while(p>L&&k<60);return k-1};
  const L=LAUNCH,DAY=864e5,day0=+dayAt(-L),nowT=+NOW;
  // 天的边界 = 墨尔本当地 0 点（夏令时切换那天只有 23 / 25 小时，不能用 day0 + d × 24 小时）
  const MID=[];const dms=d=>{let v=MID[d];if(v===undefined){v=MID[d]=+dayAt(d-L)}return v};
  const dayOf=t=>{let g=Math.floor((t-day0)/DAY);while(dms(g+1)<=t)g++;while(g>0&&dms(g)>t)g--;return g};
  const wall=(d,ms)=>{const x=new Date(dms(d));x.setHours(0,0,0,ms);return +x};          // 第 d 天的墙上时间（ms = 距 0 点的毫秒数）
  const HS=[.1,.05,.03,.02,.03,.08,.35,.7,.75,.55,.45,.45,.5,.45,.4,.45,.6,.85,1,.95,.8,.6,.4,.2],HST=HS.reduce((a,b)=>a+b,0);
  const hourS=samp([...HS.keys()],HS),startS=samp([...Array(17).keys()],[.2,.4,.7,.8,.6,.4,.35,.35,.4,.35,.4,.5,.7,.95,1,.8,.45]),offS=samp([0,1,2,3,4,5,6],[.22,.26,.16,.12,.1,.08,.06]);
  const tIn=d=>{let h=hourS();return wall(d,h*36e5+Math.floor(R()*60)*6e4)};          // 当天按活跃曲线取一个时刻
  const fracToday=(()=>{const h=NOW.getHours(),m=NOW.getMinutes();let a=0;for(let i=0;i<h;i++)a+=HS[i];return (a+HS[h]*m/60)/HST})();
  const SCR=SCREENS.map(x=>x[0]),SP={disc:.95,game_detail:.66,notif:.48,mine:.38,me:.3,player_card:.26,filter:.16,create:0,login:0,game_share:.07,card_share:.035,invite:.04,safety:.02,community:.015};
  const ENV_M=ENVS.filter(e=>e[2]!=='desk'),ENV_D=ENVS.filter(e=>e[2]==='desk'),EIX=Object.fromEntries(ENVS.map((e,i)=>[e[0],i])),EI=k=>EIX[k];
  const envMS=samp(ENV_M.map(e=>e[0]),ENV_M.map(e=>e[0].startsWith('pwa')?0:e[3])),envDS=samp(ENV_D.map(e=>e[0]),ENV_D.map(e=>e[3])),envShS=samp(['wechat','xhs','safari_ios','chrome_android'],[.62,.12,.18,.08]);
  const VV=VENUES.filter(v=>v[6]==='verified'),SUBW=SUBURBS.map(x=>x[1]),SUBN=SUBURBS.map(x=>x[0]);
  const animalS=samp(ANIMALS.map(a=>a[0]),AW),sealS=samp(SEALS.map(x=>x[0]),SW),colorS=samp(COLORS.map(c=>c[0]),CW),themeS=samp(THEMES.map(t=>t[0]),TW);
  const vAll=samp(VV,VV.map(x=>x[7])),vSub={},vNear=sb=>vSub[sb]||(vSub[sb]=samp(VV,VV.map(x=>x[7]*(x[3]===sb?3:1))));
  const users=[],activity=[],anon=[],games=[],parts=[],invites=[],feel=[],prefs=[],imps=[],noshow=[],appeals=[],reports=[],blocks=[],shares=[],msgs=[],changes=[],recaps=[],prefLog=[],follows=[],effects=[],actIdx=[],cardViews=[];
  const viewViaS=samp(['detail','chat','list','notif','mine','card'],[.38,.19,.09,.1,.05,.03]);
  const FN=['Han','Jason','Tom','Grace','Sarah','Kevin','Ryan','Ben','Nick','Amy','Lily','Mia','Leo','Chloe','Ethan','Olivia','Lucas','Emma','Jack','Ava','Daniel','Sophie','Max','Zoe','Alex','Ivy','Sam','Ruby','Henry','Ella','Oscar','Eric','Vivian','Kelvin','Wendy','Frank','Cathy','Tony','Joyce','Peter','Irene','Michael','Yuki','Jun','Mei','Hao','Lin','Wei','Xin','Ming','Yan','Bo','Jing','Rui','Tian','Kai','Nina','Owen','Hugo'];
  const NS=SCREENS.length,D3={ext:[],via:[],opens:[]};
  const LAMS=SCREENS.map(x=>Math.max(0,(x[2]/Math.max(.05,SP[x[0]]||.1))-1)),ELN=LAMS.map(m=>Math.exp(-m)),ELH=LAMS.map(m=>Math.exp(-m*1.2));   // 每个页面一天里再看几次（预先算好）
  const dwell=(j,desk)=>SCREENS[j][4]*(desk?1.25:1)*(.55+R2()*.9);                                   // 每次停留（秒）：页面基准 × 设备 × 随机
  const extS=(()=>{return()=>{const x=R2()*1;return x<.38?0:x<.65?1:x<.89?2:3}})();   // Google 搜索 / 小红书（非分享）/ 微信（非分享）/ 其他网站
  const VIA=['list','map','notif','mine','link','chat','card'],viaS2=(()=>{const w=[.52,.14,.11,.08,.06,.05,.04],c=[];let t=0;w.forEach(x=>{t+=x;c.push(t)});return()=>{const x=R2()*t;return VIA[c.findIndex(y=>x<=y)]}})();
  let anonN=0,recent=[];const anonPool=[];                                                                   // anonPool[id]；recent = 近 7 天来过的访客（可能回访）
  const ENT=['direct','push','share','external'];                                                        // 入口：位掩码 1 / 2 / 4 / 8
  for(let d=0;d<=L;d++){const date=new Date(dms(d)),wd=date.getDay(),g=Math.pow((d+1)/(L+1),1.35),season=(wd===0||wd===6)?1.32:wd===3?1.06:wd===5?.94:1,
      part=d===L?Math.max(.05,fracToday):1,end=d===L?nowT:dms(d+1),noise=.9+R()*.2,target=(45+585*g)*season*noise;
    // ---------- 未登录访客（含从分享链接进来的） ----------
    const A={a:[],dev:[],ent:[],env:[],scr:[],reg:[],t:[]};const tNow=d=>{let t=tIn(d);if(t>=end)t=dms(d)+R()*(end-dms(d));return t};const shareOpen=[];
    let si=shares.length;while(si>0&&shares[si-1].day>=d-2)si--;const prevShares=shares.slice(si);
    recent=recent.filter(x=>x.last>=d-7&&x.uid==null);const nNew=Math.round(target*.6*part),back=recent.filter(()=>R()<.18*part);
    for(let i=0;i<nNew+back.length;i++){const o=i<nNew?{id:anonN++,first:d,last:d,uid:null,mob:R()<.82}:back[i-nNew];o.last=d;if(i<nNew){anonPool.push(o);recent.push(o)}
      let ent=1;if(i<nNew){const r=R();ent=r<.34&&prevShares.length?4:r<.46?8:1}
      if(ent===4){const sh=prevShares[Math.floor(R()*prevShares.length)];sh.opens++;o.ref=sh.id;shareOpen.push(o.id)}
      const env=o.mob?(ent===4?envShS():envMS()):envDS();
      o.env=env;A.t.push(tNow(d));if(ent===4)D3.opens.push({share:o.ref,t:A.t[A.t.length-1],day:d,dev:o.mob?'mobile':'desktop',anon:o.id});A.a.push(o.id);A.dev.push(o.mob?1:2);A.ent.push(ent);A.env.push(EI(env));A.scr.push(1|(R()<.55?2:0)|(R()<.25?256:0))}
    // ---------- 注册：从当天访客里转化 ----------
    const nReg=Math.round(target*(.045+R()*.025)*part),cand=[...Array(A.a.length).keys()];
    for(let k=0;k<nReg&&cand.length;k++){const i=cand.splice(Math.floor(R()*cand.length),1)[0];const an=anonPool[A.a[i]];if(!an||an.uid!=null)continue;
      const ty=pickW(['heavy','regular','light'],[.14,.36,.5]),life=ty==='heavy'?400+R()*400:ty==='regular'?40+R()*160:3+R()*40;
      const t0=Math.min(A.t[i],end-6e4);const u={id:users.length,name:FN[Math.floor(R()*FN.length)]+' '+'ABCDEFGHJKLMNPRSTWYZ'[Math.floor(R()*20)]+'.',dev:an.mob?'mobile':'desktop',anon:an.id,created_at:t0,day:d,gender:pickW(['f','m',null],[.31,.57,.12]),utr:+Math.min(16.5,Math.max(1,1.5+8.5*Math.pow(R(),1.3))).toFixed(1),
        suburb:pickW(SUBN,SUBW),mob:an.mob?(.75+R()*.25):(R()*.5),src:A.ent[i]===4?'share':A.ent[i]===8?'external':'direct',ref:an.ref??null,env0:an.env,type:ty,until:d+life,
        hostW:ty==='heavy'?4:ty==='regular'?1.6:.35,no:1001+users.length,rough:R()<.035,push:R()<(an.mob?.42:.15),pwa:an.mob&&R()<.38,status:'active',opt_out:R()<.03};
      // 球员卡：头像（动物 / 字母）、印样、底色、卡面；「换一枚印」的次数和时间（card_customize）
      u.avatar=R()<.71?'animal':'letter';u.animal=animalS();u.seal=sealS();u.color=colorS();u.theme=themeS();
      const rolls=u.avatar==='animal'?pickW([0,1,2,3,4,5,6,8,10,13],[31,17,12,9,7,6,6,6,3,3]):0;u.cust=[];for(let r=0;r<rolls;r++)u.cust.push(t0+R()*Math.max(6e4,Math.min(nowT,t0+60*DAY)-t0));
      {const e=u.env0||'';u.os=an.mob?(e.includes('android')?'Android':(e==='safari_ios'||e==='chrome_ios'||e.startsWith('pwa_ios'))?'iOS':R2()<.84?'iOS':'Android'):(e==='desk_safari'?'macOS':e==='desk_edge'?'Windows':R2()<.45?'macOS':'Windows');
        u.inst=u.pwa?d+Math.floor(R2()*25):null;                                                   // 第一次从主屏幕打开（pwa_first_launch）
        u.a2hsSeen=u.pwa||(an.mob&&R2()<.46);u.a2hsOpen=u.a2hsSeen&&(u.pwa||R2()<.38);             // 看到「添加到主屏幕」提示 → 打开教程
        if(e==='wechat'||e==='xhs'){u.wxSeen=R2()<.72;u.wxClick=u.wxSeen&&R2()<.43;u.sw=u.wxClick&&R2()<.55?d+1+Math.floor(R2()*10):null;u.env1=u.os==='Android'?'chrome_android':R2()<.85?'safari_ios':'chrome_ios'}}
      an.uid=u.id;A.reg[i]=u.id;A.scr[i]|=256;users.push(u)}
    const AN={a:Int32Array.from(A.a),dev:Uint8Array.from(A.dev),ent:Uint8Array.from(A.ent),env:Uint8Array.from(A.env),scr:Uint16Array.from(A.scr),reg:A.reg,t:Float64Array.from(A.t)};
    const nA=A.a.length;AN.pv=new Uint8Array(nA*NS);AN.dur=new Uint16Array(nA);
    const XR={mobile:[0,0,0,0],desktop:[0,0,0,0]},VR={};D3.ext[d]=XR;D3.via[d]=VR;
    for(let i=0;i<nA;i++){let du=0;const dk=AN.dev[i]===1?'mobile':'desktop';for(let j=0;j<NS;j++)if(AN.scr[i]>>j&1){const c=1+pois2(j===0?.8:.35);AN.pv[i*NS+j]=c;du+=c*dwell(j,AN.dev[i]===2)}AN.dur[i]=Math.min(65535,Math.round(du));
      if(AN.ent[i]===8)XR[dk][extS()]++;
      if(AN.ent[i]===4&&AN.scr[i]&2){const k='share_link';(VR[k]=VR[k]||[0,0])[AN.dev[i]===1?0:1]+=AN.pv[i*NS+1]}}
    anon.push(AN);
    // ---------- 活跃球友：按目标人数加权抽样（越常用、越新的人越容易出现） ----------
    const alive=users.filter(u=>u.day<=d&&d<=u.until),want=Math.min(alive.length,Math.round(target*part));
    const fresh=alive.filter(u=>u.day===d);                                   // 当天注册的人一定算活跃
    const keyed=fresh.concat(alive.filter(u=>u.day!==d).map(u=>{const w=(u.type==='heavy'?5:u.type==='regular'?2.2:1)*(d-u.day<3?1.3:1);return [Math.pow(R(),1/w),u]}).sort((a,b)=>b[0]-a[0]).slice(0,Math.max(0,want-fresh.length)).map(x=>x[1]));
    const nK=keyed.length,act={sesM:new Uint8Array(nK),sesD:new Uint8Array(nK),esM:new Uint8Array(nK*4),esD:new Uint8Array(nK*4),pv:new Uint8Array(nK*NS),durM:new Uint16Array(nK),durD:new Uint16Array(nK),t:new Float64Array(keyed.length),u:new Int32Array(keyed.length),dev:new Uint8Array(keyed.length),scr:new Uint16Array(keyed.length),ses:new Uint8Array(keyed.length),ent:new Uint8Array(keyed.length),env:new Uint8Array(keyed.length)};
    keyed.forEach((u,i)=>{const ses=1+(R()<.45)+(R()<.15);let dev=0,ent=0,scr=0;const sesE=[],viaShare=u.day===d&&u.src==='share';for(let k=0;k<ses;k++){let m=R()<u.mob;let e1=u.push&&R()<.3?2:R()<.06?4:R()<.02?8:1;if(k===0&&viaShare){m=u.dev==='mobile';e1=4}   // 注册当天从分享链接进来：第一次会话就是那次打开
        dev|=m?1:2;ent|=e1;sesE.push([m,e1,k===0&&viaShare]);if(m)act.sesM[i]++;else act.sesD[i]++}
      SCR.forEach((c,j)=>{if(R()<(SP[c]||0)*(u.type==='heavy'?1.25:1))scr|=1<<j});scr|=1;
      const env=dev&1?(u.pwa&&d>=u.inst?(u.os==='Android'?'pwa_android':'pwa_ios'):u.sw!=null&&d>=u.sw?u.env1:(u.env0&&!u.env0.startsWith('desk')?u.env0:u.os==='Android'?'chrome_android':'safari_ios')):(u.env0&&u.env0.startsWith('desk')?u.env0:'desk_chrome');
      // 推送只有主屏幕 App、安卓 Chrome、电脑浏览器能收到；收不到推送的环境，那次打开算直接打开
      const pushOK=m=>!m||env.startsWith('pwa')||env==='chrome_android';ent=0;const t0=u.day===d?u.created_at:null;
      sesE.forEach(([m,e1,reg])=>{let e=e1===2&&!pushOK(m)?1:e1;if(e===4&&!reg){if(prevShares.length){const sh=prevShares[Math.floor(R2()*prevShares.length)];sh.opens++;D3.opens.push({share:sh.id,t:null,day:d,dev:m?'mobile':'desktop',user:u.id,row:i})}else e=1}ent|=e;(m?act.esM:act.esD)[i*4+[1,2,4,8].indexOf(e)]++});   // 球友点开别人的分享链接：记一次打开
      let dM=0,dD=0;const fm=act.sesM[i]/ses;const EL=u.type==='heavy'?ELH:ELN;for(let j=0;j<NS;j++)if(scr>>j&1){const c=1+poisE(EL[j]);act.pv[i*NS+j]=Math.min(255,c);
        const dw=c*SCREENS[j][4]*(.75+R2()*.5);dM+=dw*fm;dD+=dw*(1-fm)*1.25;
        if(j===1){const VR=D3.via[d];for(let k=0;k<c;k++){const v=viaS2();(VR[v]=VR[v]||[0,0])[R2()<fm?0:1]++}}}
      act.durM[i]=Math.min(65535,Math.round(dM));act.durD[i]=Math.min(65535,Math.round(dD));
      for(let k=act.esM[i*4+3];k>0;k--)D3.ext[d].mobile[extS()]++;for(let k=act.esD[i*4+3];k>0;k--)D3.ext[d].desktop[extS()]++;
      act.t[i]=u.day===d?u.created_at:tNow(d);for(let q=D3.opens.length-1;q>=0&&D3.opens[q].row===i&&D3.opens[q].day===d&&D3.opens[q].t==null;q--)D3.opens[q].t=act.t[i];act.u[i]=u.id;act.dev[i]=dev;act.scr[i]=scr;act.ses[i]=ses;act.ent[i]=ent;act.env[i]=EI(env)});
    activity.push(act);actIdx.push(new Map(keyed.map((u,i)=>[u.id,i])));
    const actU=keyed;
    // ---------- 看球员卡（card_view，不含看自己）：从球局详情 / 聊天 / 发现页 / 通知 / 我的球局 / 别人的球员卡点开；站外链接见下面的访客 ----------
    const CARD=1<<SCR.indexOf('player_card'),viaS=viewViaS,seenToday=[];
    keyed.forEach((u,i)=>{if(!(act.scr[i]&CARD))return;for(let k=1+pois(1.1);k>0;k--){let o=actU[Math.floor(R()*actU.length)].id;if(o===u.id)continue;
      const v={day:d,t:Math.min(end-1,act.t[i]+R()*36e5),viewer:u.id,anon:null,owner:o,via:viaS(),dev:act.dev[i]&1?'mobile':'desktop'};cardViews.push(v);seenToday.push(v)}});
    for(let i=0;i<A.a.length;i++){if(A.ent[i]!==4)continue;const an=anonPool[A.a[i]],sh=an&&an.ref!=null?shares[an.ref]:null;if(sh&&sh.target==='card'&&an.first===d)cardViews.push({day:d,t:A.t[i],viewer:A.reg[i]??null,anon:A.a[i],owner:sh.user_id,via:'link',dev:A.dev[i]===1?'mobile':'desktop'})}
    // ---------- 发起球局 ----------
    const nG=Math.round(actU.length*(.1+R()*.03)*(season>1.2?1.15:1));
    const hostS=samp(actU,actU.map(u=>u.hostW));
    for(let k=0;k<nG&&actU.length;k++){const h=hostS();let ca=Math.min(end-6e4,tIn(d));
      let off=offS();{const w=new Date(dms(d+off)).getDay();if(w>0&&w<6&&R()<.38)off=offS()}   // 周末的局更多
      const hr=6+startS(),lateG=R()<.13;
      const hm=hr*36e5+(R()<.5?18e5:0);let st=wall(d+off,hm);if(st<ca+36e5)st=wall(d+off+1,hm);
      if(lateG){const s2=Math.ceil((ca+(40+R()*80)*6e4)/18e5)*18e5,x=new Date(s2),hh=x.getHours()+x.getMinutes()/60;if(hh>=6&&hh<=21.5)st=s2}   // 开打时间只能选 6:00–21:30                              // 临时局：开打前 2 小时内发布
      const type=pickW(['singles','doubles','rally'],[.39,.46,.15]),cap=type==='doubles'?4:2,v=R()<.94?vNear(h.suburb)():null,women=h.gender==='f'&&R()<.27;
      const gm={id:games.length,host_id:h.id,created_at:ca,day:d,starts_at:st,duration_min:R()<.6?90:120,game_type:type,capacity:cap,ntrp_min:Math.max(1,+(h.utr-.5-R()).toFixed(1)),ntrp_max:Math.min(16.5,+(h.utr+.5+R()).toFixed(1)),
        venue_id:v?v[0]:null,suburb:v?v[3]:h.suburb,tags:[...(R()<.38?['relax']:R()<.44?['match']:[]),...(R()<.22?['newbie']:[]),...(women?['women']:[])],join_mode:st-ca<=2*36e5&&R()<.58?'instant':'approve',late:st-ca<=2*36e5,visibility:'public',created_device:R()<h.mob?'mobile':'desktop',status:'open',cancelled_at:null,series:R()<.05,blocked_m:0};if(women)gm.blocked_m=pois(.6);
      {const ix=actIdx[d].get(h.id),jc=SCR.indexOf('create');if(ix!=null){act.scr[ix]|=1<<jc;act.pv[ix*NS+jc]=Math.min(255,act.pv[ix*NS+jc]+1)}}   // 发起球局页（create）：发起的人当天打开过
      games.push(gm);parts.push({game_id:gm.id,user_id:h.id,role:'host',status:'approved',created_at:ca,decided_at:ca,left_at:null,decline_reason:null})}
    // ---------- 邀约（只约一起打过或聊过的人为主） ----------
    const nI=Math.round(actU.length*(.035+R()*.02));
    for(let k=0;k<nI&&actU.length>1;k++){let f=actU[Math.floor(R()*actU.length)],to=actU[Math.floor(R()*actU.length)],fromCard=false;
      if(seenToday.length&&R()<.4){const v=seenToday[Math.floor(R()*seenToday.length)];f=users[v.viewer];to=users[v.owner];fromCard=true}   // 看完球员卡点「约 TA 打球」
      if(to===f)continue;
      const ca=Math.min(end-6e4,tIn(d)),st=wall(d+1+Math.floor(R()*5),(7+Math.floor(R()*13))*36e5),ex=Math.min(st,ca+48*36e5);
      const r=R(),status=r<.47?'accepted':r<.66?'declined':r<.86?'expired':r<.92?'withdrawn':'counter';
      let decided=status==='expired'?ex:ca+(1+R()*20)*36e5;const late=decided>=ex&&status!=='expired';const iv={id:invites.length,from_user:f.id,to_user:to.id,created_at:ca,starts_at:st,game_type:R()<.8?'singles':'rally',device:R()<f.mob?'mobile':'desktop',status,decided_at:decided,countered:status==='counter'||R()<.08,fromCard,reason:status==='declined'?pickW(['week','rest','pass'],[.4,.2,.4]):null,played:R()<.62};
      if(late&&['accepted','declined','counter','withdrawn'].includes(iv.status)){iv.status='expired';iv.decided_at=ex}                        // 开打前 / 48 小时内没回复 → 失效
      if(iv.decided_at>nowT){iv.status=iv.countered?'counter':'pending';iv.decided_at=null}
      invites.push(iv);
      if(iv.status==='accepted'){const gm={id:games.length,host_id:f.id,created_at:decided,day:dayOf(decided),starts_at:st,duration_min:90,game_type:'singles',capacity:2,ntrp_min:f.utr,ntrp_max:f.utr,venue_id:vAll()[0],suburb:f.suburb,tags:[],join_mode:'approve',visibility:'private',created_device:'mobile',status:st+90*6e4<nowT?'completed':'full',filled_at_start:true,cancelled_at:null,_pc:R()<.08,invite_id:iv.id};
        games.push(gm);iv.game_id=gm.id;if(gm._pc){const ct=decided+R()*(st-decided);if(ct<nowT){gm.status='cancelled';gm.cancelled_at=ct}}delete gm._pc;   // 约好的局也有约 8% 后来取消
        parts.push({game_id:gm.id,user_id:f.id,role:'host',status:'approved',created_at:decided,decided_at:decided,left_at:null,decline_reason:null},{game_id:gm.id,user_id:to.id,role:'player',status:'approved',created_at:decided,decided_at:decided,left_at:null,decline_reason:null})}}
    // ---------- 分享 ----------
    keyed.forEach((u,i)=>{const sc=act.scr[i];[[SCR.indexOf('game_share'),'game'],[SCR.indexOf('card_share'),'card']].forEach(([j,tg])=>{if(!(sc&(1<<j)))return;const mob=act.dev[i]&1;shares.push({id:shares.length,day:d,t:Math.max(act.t[i],Math.min(end-1,act.t[i]+R()*36e5)),user_id:u.id,target:tg,channel:tg==='card'?pickW(['moments','xhs','link'],[.48,.3,.22]):mob?pickW(['link','xhs','text','sys'],[.38,.27,.17,.1]):pickW(['link','xhs','webqr'],[.38,.27,.08]),opens:0,device:act.dev[i]&1?'mobile':'desktop'});if(tg==='game'&&shares[shares.length-1].channel==='xhs'){const jp=SCR.indexOf('poster');if(jp>=0){act.scr[i]|=1<<jp;act.pv[i*NS+jp]=Math.min(255,act.pv[i*NS+jp]+1)}}})});   // 小红书海报页（poster）
    // ---------- 消息（按天汇总） ----------
    const mm=Math.round(actU.length*(1.2+R()*.5));msgs.push({day:d,dm:[Math.round(mm*.42*.86),Math.round(mm*.42*.14)],game:[Math.round(mm*.58*.86),Math.round(mm*.58*.14)]});
    // ---------- 举报 / 屏蔽 ----------
    if(actU.length>2){for(let k=pois(actU.length*.0022);k>0;k--){const a=actU[Math.floor(R()*actU.length)],b=actU[Math.floor(R()*actU.length)];if(a===b)continue;const ca=Math.min(end-6e4,tIn(d)),src=R()<.8?'in_app':'email';
        const rs=src==='in_app'?pickW(['pact_violation','harass','no_show','fake_profile','other'],[.24,.22,.3,.12,.12]):pickW(['gender_fake','rude','spam','harass','other'],[.3,.25,.2,.15,.1]);
        reports.push({id:reports.length,reporter_id:a.id,target_type:R()<.85?'user':'game',target_id:b.id,reason:rs,source:src,via:src==='in_app'?(R()<.7?'card':'chat'):null,created_at:ca,status:nowT-ca<2*DAY?'open':R()<.6?'actioned':'dismissed'})}
      for(let k=pois(actU.length*.004);k>0;k--){const a=actU[Math.floor(R()*actU.length)],b=actU[Math.floor(R()*actU.length)];if(a!==b)blocks.push({blocker_id:a.id,blocked_id:b.id,created_at:Math.min(end-6e4,tIn(d))})}}
  }
  // ---------- 申请与结果：逐局按时间走一遍（申请人来自开打前那几天的活跃球友） ----------
  const actOn=d=>activity[Math.max(0,Math.min(L,d))],DETAIL=1<<SCR.indexOf('game_detail');
  const deadline=(c,st)=>Math.min(Math.max(c,st-36e5)+15*6e4,st);
  const circle=new Map(),cAdd=(a,b)=>{let c=circle.get(a);if(!c){c={s:new Set(),a:[]};circle.set(a,c)}if(!c.s.has(b)){c.s.add(b);c.a.push(b)}};   // 一起打过的人：之后更容易再约到一起（老球友）
  for(const gm of games){if(gm.visibility==='private')continue;const need=gm.capacity-1,d1=Math.min(L,dayOf(gm.starts_at)),lam=need*(1.6+R()*1.1);
    const n=pois(lam),seen=new Set([gm.host_id]),apps=[];
    for(let k=0;k<n;k++){const d=gm.day+Math.floor(R()*(d1-gm.day+1)),A=actOn(d);if(!A.u.length)continue;let uid=A.u[Math.floor(R()*A.u.length)];
      {const c=circle.get(gm.host_id);if(c&&R()<.5)for(let t=0;t<4;t++){const x=c.a[Math.floor(R()*c.a.length)];if(actIdx[d].has(x)&&!seen.has(x)){uid=x;break}}}
      const fitU=x=>users[x].utr>=gm.ntrp_min-.3&&users[x].utr<=gm.ntrp_max+.3&&(!gm.tags.includes('women')||users[x].gender==='f');
      for(let t=0;t<(gm.tags.includes('women')?12:3)&&!fitU(uid);t++)uid=A.u[Math.floor(R()*A.u.length)];   // 大多数人会挑水平合适的局；女生局只有女生能看到
      const u=users[uid];
      if(seen.has(uid)||(gm.tags.includes('women')&&u.gender!=='f'))continue;seen.add(uid);
      const lo=Math.max(gm.created_at,dms(d)),hi=Math.min(gm.starts_at-10*6e4,dms(d+1));if(hi<=lo)continue;const at=lo+R()*(hi-lo);if(at>nowT)continue;const ix=actIdx[d].get(uid);let dev=R()<u.mob?'mobile':'desktop';
      if(ix!=null){A.scr[ix]|=DETAIL;A.t[ix]=Math.min(A.t[ix],at);dev=A.dev[ix]===1?'mobile':A.dev[ix]===2?'desktop':dev}   // 申请前一定看过球局详情；用当天用过的设备
      apps.push({uid,at,dev})}                       // 申请前一定看过球局详情
    apps.sort((a,b)=>a.at-b.at);let filled=0,fullAt=null;const mine=[];
    for(const a of apps){const p={game_id:gm.id,user_id:a.uid,role:'player',device:a.dev,status:'pending',created_at:a.at,decided_at:null,left_at:null,decline_reason:null};parts.push(p);mine.push(p);
      if(fullAt!=null&&a.at>=fullAt){p._drop=true;continue}                      // 满员后看到「已满」，不能再申请
      if(R()<.05){p.status='withdrawn';p.left_at=a.at+R()*36e5;if(p.left_at>nowT){p.status='pending';p.left_at=null}continue}
      const u=users[a.uid],fits=u.utr>=gm.ntrp_min&&u.utr<=gm.ntrp_max;
      let t=gm.join_mode==='instant'&&fits?a.at:a.at+(-Math.log(1-R()))*40*6e4,dl=deadline(a.at,gm.starts_at);
      if(t>nowT){continue}                                                      // 发起人还没处理：仍是 pending
      if(t>dl){p.status='expired';p.decline_reason='timeout';p.decided_at=dl;continue}
      if(gm.join_mode!=='instant'&&R()<(fits?.16:.4)){p.status='rejected';p.decline_reason=pickW(['known','level','pass'],fits?[.4,.15,.45]:[.15,.65,.2]);p.decided_at=t;continue}
      if(filled>=need){p.status='rejected';p.decline_reason='full_auto';p.decided_at=Math.max(t,fullAt||t);continue}   // 发起人处理时已经满了
      p.status='approved';p.decided_at=t;filled++;
      if(R()<.06){const lt=t+R()*(gm.starts_at-t);if(lt<nowT){p.status='left';p.left_at=lt;filled--;continue}}
      if(filled>=need&&fullAt==null)fullAt=t}
    // 满员后，之前还在等的申请自动结束
    if(fullAt!=null)mine.filter(p=>p.status==='pending'&&p.created_at<fullAt).forEach(p=>{p.status='rejected';p.decline_reason='full_auto';p.decided_at=fullAt});
    // 发起人修改（time 改时间 · postpone 顺延 · spots 改人数 / 水平 · venue 改球场 · note 改说明）；改时间后已通过的人可以不算临时退出地退出
    [['time',.09],['postpone',.03],['spots',.06],['venue',.03],['note',.08]].forEach(([k,pr])=>{if(R()<pr){const at=gm.created_at+R()*(gm.starts_at-gm.created_at);if(at>=nowT)return;changes.push({game_id:gm.id,kind:k,at});
      if(k==='time'||k==='postpone')mine.filter(p=>p.status==='approved'&&p.decided_at<at).forEach(p=>{p.changed=true;if(R()<.22){const lt=at+R()*36e5;if(lt<nowT&&lt<gm.starts_at){p.status='left';p.left_at=lt;p.leave_reason='changed';filled--}}})}})
    // 取消：没凑齐的更容易被取消
    const ok=filled>=need,cp=ok?.05:.22;if(R()<cp){const ct=gm.starts_at-R()*Math.min(48*36e5,gm.starts_at-gm.created_at);if(ct<nowT&&ct>gm.created_at){gm.status='cancelled';gm.cancelled_at=ct;
      mine.forEach(p=>{if(p.created_at>=ct)p._drop=true;else if(p.status==='pending'||(p.decided_at>ct&&['approved','rejected','expired'].includes(p.status))){p.status='rejected';p.decline_reason='pass';p.decided_at=ct}})}}   // 取消之后不会再有申请；还没处理的申请随球局结束
    if(gm.status!=='cancelled')gm.status=gm.starts_at+gm.duration_min*6e4<nowT?'completed':ok?'full':'open';
    gm.filled_at_start=ok;
    {const ps=mine.filter(p=>p.status==='approved').map(p=>p.user_id).concat(gm.host_id);ps.forEach(a=>ps.forEach(b=>{if(a!==b)cAdd(a,b)}))}}

  {let w=0;for(let i=0;i<parts.length;i++)if(!parts[i]._drop)parts[w++]=parts[i];parts.length=w}   // 去掉被丢弃的申请（原地压缩）
  // ---------- 打完之后：赛后感受、多遇到 / 少遇到、印象、爽约反馈 ----------
  const byGame=new Map();parts.forEach(p=>{if(!byGame.has(p.game_id))byGame.set(p.game_id,[]);byGame.get(p.game_id).push(p)});
  for(const gm of games){if(gm.status!=='completed')continue;const pl=(byGame.get(gm.id)||[]).filter(p=>p.status==='approved').map(p=>p.user_id);if(pl.length<2)continue;const endT=gm.starts_at+gm.duration_min*6e4;
    const mx=Math.max(...pl.map(x=>users[x].utr)),early=new Date(gm.starts_at).getHours()<8;
    pl.forEach(a=>{
      // 赛后提醒：结束 1 小时后发一次；没送出的原因；打开 → 选了至少一项 → 点完成（也可以从球局详情进入）
      const r0=R(),sent=r0<.88,why=sent?null:r0<.95?'late':r0<.98?'blocked':'off',sat=endT+36e5,rc={game_id:gm.id,user_id:a,sent,why,at:sat,opened:false,acted:false,done:false};
      const viaDetail=!sent&&R()<.1;if((sent&&R()<.47)||viaDetail){rc.opened=true;if(R()<.83){rc.acted=true;rc.done=R()<.86}}
      if(sat>=nowT)return;recaps.push(rc);
      if(rc.acted){const at=sat+R()*20*36e5;if(at<nowT){const u=users[a],gap=mx-u.utr;feel.push({game_id:gm.id,user_id:a,feel:pickW(['hard','ok','easy'],gap>2?[.58,.35,.07]:gap>1?[.34,.56,.1]:gap>.5?[.17,.68,.15]:[.09,.71,.2]),closed_at:at,gap});
        const kudosAll=R()<.28;pl.forEach(b=>{if(a===b)return;const r=R(),mb=(early?.34:.24)*(gm.game_type==='doubles'?.75:1.25);const lp=users[b].rough?.45:.07;if(r<mb*(users[b].rough?.3:1))prefs.push({user_id:a,target_id:b,pref:'more',game_id:gm.id,updated_at:at,via:'recap'});else if(r<mb+lp)prefs.push({user_id:a,target_id:b,pref:'less',game_id:gm.id,updated_at:at,via:'recap'});
          if(kudosAll||R()<.35)imps.push({game_id:gm.id,from_id:a,to_id:b,kinds:[pickW(['ontime','kind','partner','serious','fun','share','newbie'],[.3,.25,.1,.1,.15,.05,.05])],created_at:at,all:kudosAll})})}}
      // 爽约反馈：结束后 48 小时内；可能有多人反馈
      if(R()<(users[a].rough?.12:.02)){const others=pl.filter(x=>x!==a),rep=others[Math.floor(R()*others.length)],at=endT+R()*40*36e5;if(rep!=null&&at<nowT){noshow.push({game_id:gm.id,target_id:a,reporter_id:rep,created_at:at});
        const o2=others.find(x=>x!==rep);if(o2!=null&&R()<.25&&at+36e5<nowT)noshow.push({game_id:gm.id,target_id:a,reporter_id:o2,created_at:at+36e5})}}})}
  // 爽约确认：发起人反馈，或两人局里另一位反馈，或 ≥2 人反馈（v_confirmed_noshow）；被确认的人约 22% 申诉，约 45% 成立
  const nsKey={};noshow.forEach(n=>{const k=n.game_id+'|'+n.target_id;(nsKey[k]=nsKey[k]||[]).push(n)});
  const nsList=Object.values(nsKey).map(rs=>{const g=games[rs[0].game_id],n=(byGame.get(g.id)||[]).filter(p=>p.status==='approved').length,byHost=rs.some(r=>r.reporter_id===g.host_id),pair=n===2;
    const conf=byHost||pair||rs.length>=2,o={game_id:g.id,target_id:rs[0].target_id,reps:rs.length,byHost,pair,confirmed:conf,at:rs[0].created_at,rule:byHost?'host':pair?'pair':rs.length>=2?'2+':'single'};
    if(conf&&R()<.22){const at=o.at+R()*24*36e5;if(at<nowT)appeals.push({game_id:g.id,user_id:o.target_id,created_at:at,status:nowT-at<2*DAY&&R()<.5?'pending':R()<.45?'upheld':'rejected'})}return o});
  // 球员卡上设的多遇到 / 少遇到（不在赛后卡片里）
  prefs.slice().forEach(p=>{if(R()<.4){const at=p.updated_at+R()*10*DAY;if(at<nowT)prefs.push({user_id:p.target_id,target_id:p.user_id,pref:R()<.86?'more':'less',game_id:null,updated_at:at,via:'card'})}});
  // 改过主意
  prefs.forEach(p=>{const r=R();if(p.pref==='less'&&r<.09){const at=p.updated_at+R()*20*DAY;if(at<nowT)prefLog.push({user_id:p.user_id,target_id:p.target_id,from:'less',to:R()<.7?'ok':'more',at})}
    else if(p.pref==='more'&&r<.01){const at=p.updated_at+R()*20*DAY;if(at<nowT)prefLog.push({user_id:p.user_id,target_id:p.target_id,from:'more',to:'less',at})}});
  // 少遇到生效（less_effect）：join 直接加入改为申请 · invite 邀约拦下 · dm 私信静音 · rank 排序后移
  prefs.filter(p=>p.pref==='less').forEach(p=>{[['join',.06],['invite',.04],['dm',.21],['rank',3.4]].forEach(([k,m])=>{for(let i=pois(m);i>0;i--){const at=p.updated_at+R()*30*DAY;if(at<nowT)effects.push({user_id:p.user_id,target_id:p.target_id,type:k,at})}})});
  // 多遇到：TA 发了新局 → 提醒（follow_notify；同一人每 7 天最多一次；不适合的不发）
  {const fol={};prefs.filter(p=>p.pref==='more').forEach(p=>{(fol[p.target_id]=fol[p.target_id]||[]).push(p)});const last={};
    games.filter(g=>g.visibility==='public').forEach(g=>{(fol[g.host_id]||[]).forEach(p=>{if(p.updated_at>g.created_at||g.created_at>nowT)return;const u=users[p.user_id],k=p.user_id+'>'+g.host_id;
      const fit=(!g.tags.includes('women')||u.gender==='f')&&u.utr>=g.ntrp_min-.5&&u.utr<=g.ntrp_max+.5;let st='sent';if(!fit)st='unfit';else if(last[k]&&g.created_at-last[k]<7*DAY)st='capped';else last[k]=g.created_at;
      const o={game_id:g.id,user_id:p.user_id,host_id:g.host_id,at:g.created_at,status:st,opened:false,applied:false};if(st==='sent'&&R()<.41){o.opened=true;o.applied=R()<.39}follows.push(o)})})}
  // ---------- 其他风险信号（risk_rules 里没有别的表能算的几条）：未确认性别试女生局、改性别、新账号大量私信、私信发链接 ----------
  const signals=[];{const male=users.filter(u=>u.gender!=='f');
    games.filter(g=>g.blocked_m>0).forEach(g=>{for(let k=0;k<g.blocked_m;k++){const u=male[Math.floor(R()*male.length)];if(u&&u.created_at<g.starts_at){const at=Math.min(nowT-6e4,g.created_at+R()*Math.max(6e4,g.starts_at-g.created_at));if(at>u.created_at)signals.push({user_id:u.id,type:'women_probe',at})}}});
    // 少数人反复试（同一个人多次）
    male.filter(u=>u.rough&&R()<.5).forEach(u=>{for(let k=2+pois(2);k>0;k--){const at=u.created_at+R()*(nowT-u.created_at);signals.push({user_id:u.id,type:'women_probe',at})}});
    users.forEach(u=>{if(u.gender==='f'&&R()<.012){const at=u.created_at+R()*Math.min(30*DAY,nowT-u.created_at);signals.push({user_id:u.id,type:'gender_m2f',at});u.m2f=at}
      if(R()<(u.rough?.25:.006)){const at=u.created_at+R()*Math.min(DAY,nowT-u.created_at);signals.push({user_id:u.id,type:'dm_burst',at,n:10+pois(6)})}
      if(R()<(u.rough?.2:.004)){for(let k=3+pois(2);k>0;k--)signals.push({user_id:u.id,type:'link',at:u.created_at+R()*(nowT-u.created_at)})}})
    // 5a-2 新信号：用独立的散列取数（不改动上面的随机序列，其他页面的数据不变）
    users.forEach(u=>{const h=k=>b1h(u.id+':'+k),life=nowT-u.created_at;if(life<=0)return;
      if(h('dev')<(u.rough?.18:.004))signals.push({user_id:u.id,type:'same_device',at:u.created_at,n:2+Math.floor(h('dn')*2)});
      if(h('ip')<(u.rough?.06:.001))signals.push({user_id:u.id,type:'same_ip',at:u.created_at,n:3+Math.floor(h('in')*3)});
      if(h('lure')<(u.rough?.22:.003))for(let k=1+Math.floor(h('ln')*3);k>0;k--)signals.push({user_id:u.id,type:'contact_lure',at:u.created_at+h('la'+k)*Math.min(7*DAY,life)});
      if(h('churn')<(u.rough?.15:.01))for(let k=2+Math.floor(h('cn')*7);k>0;k--)signals.push({user_id:u.id,type:'apply_churn',at:nowT-h('ca'+k)*14*DAY});
      if(h('rate')<(u.rough?.12:.005))for(let k=1+Math.floor(h('rn')*7);k>0;k--)signals.push({user_id:u.id,type:'rate_hit',at:nowT-h('ra'+k)*2*DAY})})}
  // ---------- 账号状态（少数，与举报 / 爽约相关） ----------
  const repd={};reports.forEach(r=>{if(r.target_type==='user')repd[r.target_id]=(repd[r.target_id]||0)+1});const nsd={};nsList.filter(n=>n.confirmed).forEach(n=>nsd[n.target_id]=(nsd[n.target_id]||0)+1);
  users.forEach(u=>{if((nsd[u.id]||0)>=2&&R()<.5){u.status='suspended';u.status_until=nowT+(1+Math.floor(R()*7))*DAY}else if((repd[u.id]||0)>=2&&R()<.4)u.status=R()<.5?'limited':'review';else if(R()<.004)u.status='deleted'});
  const pvu=VENUES.filter(v=>v[4]==='user'&&v[6]==='pending').map(v=>({venue_id:v[0],n:1+Math.floor(R2()*4)}));   // 用户提交、还在审核的球场：提交人发局时用过几次
  const db={pending_venue_use:pvu,NS,share_opens:D3.opens,ext_sources:D3.ext,game_view_via:D3.via,L,DAY,day0,dms,dayOf,wall,ago:(t,k)=>{const x=new Date(t);return wall(dayOf(t)-k,((x.getHours()*60+x.getMinutes())*60+x.getSeconds())*1e3+x.getMilliseconds())},fracToday,users,activity,actIdx,anon,games,game_participants:parts,invites,game_feel:feel,player_prefs:prefs,impressions:imps,noshow_reports:noshow,noshow_confirmed:nsList,signals,card_views:cardViews,noshow_appeals:appeals,game_changes:changes,recap_notices:recaps,pref_changes:prefLog,follow_notices:follows,less_effects:effects,reports,blocks,shares,msgs,byGame,ENT,SCR,ms:0};
  db.ms=Math.round(performance.now()-t0);return db})();

/* ---------- 查询：与 schema 视图 / 函数同名同口径 ---------- */
const Q=(()=>{const D=DB,DEVB={all:3,mobile:1,desktop:2},dv=x=>DEVB[x||'all'];
  const days=(a,b)=>{const o=[];for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++)o.push(d);return o};
  const inR=(t,a,b)=>t>=D.dms(a)&&t<D.dms(b+1);
  return {
    days,
    // active_users(from,to,device)：至少有一个事件的已注册球友，去重；visitors 另含未登录访客
    active_users(a,b,dev){const m=dv(dev),s=new Set();days(a,b).forEach(d=>{const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.dev[i]&m)s.add(A.u[i])});return s.size},
    visitors(a,b,dev){const m=dv(dev),s=new Set();days(a,b).forEach(d=>{const A=D.anon[d];for(let i=0;i<A.a.length;i++)if(A.dev[i]&m&&A.reg[i]==null)s.add('a'+A.a[i])});return s.size+this.active_users(a,b,dev)},
    dau(d,dev){const m=dv(dev),A=D.activity[d];let n=0;for(let i=0;i<A.u.length;i++)if(A.dev[i]&m)n++;return n},
    // distinct_people(screen,from,to,device)：看过某个页面的人（去重，含未登录访客的发现 / 详情 / 登录页）
    distinct_people(scr,a,b,dev){const j=D.SCR.indexOf(scr),m=dv(dev),s=new Set();if(j<0)return 0;days(a,b).forEach(d=>{const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.dev[i]&m&&A.scr[i]>>j&1)s.add(A.u[i]);const N=D.anon[d];for(let i=0;i<N.a.length;i++)if(N.dev[i]&m&&N.scr[i]>>j&1&&N.reg[i]==null)s.add('a'+N.a[i])});return s.size},
    new_users(a,b,dev){return D.users.filter(u=>u.day>=a&&u.day<=b&&(!dev||dev==='all'||(dev==='mobile')===(u.mob>=.5))).length},
    // v_game_fill / fill_rate(from,to)：按开打时间；开打 = 到了开打时间且没取消；人齐 = 开打时已通过人数 ≥ 需要的人数
    fill_rate(a,b){const g=D.games.filter(x=>x.visibility==='public'&&inR(x.starts_at,a,b)&&x.starts_at<=+NOW);const st=g.filter(x=>x.status!=='cancelled'),full=st.filter(x=>x.filled_at_start);
      return {games:g.length,started:st.length,full:full.length,cancelled:g.length-st.length,rate:st.length?full.length/st.length:null}},
    games_created(a,b,dev){return D.games.filter(x=>x.visibility==='public'&&x.day>=a&&x.day<=b&&(!dev||dev==='all'||x.created_device===dev)).length},
    // v_applications_daily：申请（不含发起人自己那一行），按申请时间
    applications(a,b){const p=D.game_participants.filter(x=>x.role==='player'&&!D.games[x.game_id].invite_id&&inR(x.created_at,a,b));const by={};p.forEach(x=>by[x.status+(x.decline_reason?':'+x.decline_reason:'')]=(by[x.status+(x.decline_reason?':'+x.decline_reason:'')]||0)+1);
      return {apps:p.length,applicants:new Set(p.map(x=>x.user_id)).size,by}},
    // v_counted_games：未取消、已结束、至少 2 人通过、没有被确认爽约
    counted_games(a,b){return D.games.filter(x=>x.status==='completed'&&inR(x.starts_at,a,b)&&(D.byGame.get(x.id)||[]).filter(p=>p.status==='approved').length>=2).length},
    invites(a,b){const v=D.invites.filter(x=>inR(x.created_at,a,b)),by={};v.forEach(x=>by[x.status]=(by[x.status]||0)+1);return {n:v.length,by,played:v.filter(x=>x.played).length}},
    sessions(a,b,dev){const m=dv(dev);let n=0;days(a,b).forEach(d=>{const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.dev[i]&m)n+=A.ses[i];const N=D.anon[d];for(let i=0;i<N.a.length;i++)if(N.dev[i]&m&&N.reg[i]==null)n++});return n},
    msgs(a,b){return days(a,b).reduce((s,d)=>{const x=D.msgs[d];return s+x.dm[0]+x.dm[1]+x.game[0]+x.game[1]},0)},
    shares(a,b){const v=D.shares.filter(x=>x.day>=a&&x.day<=b);return {n:v.length,opens:v.reduce((s,x)=>s+x.opens,0),regs:D.users.filter(u=>u.src==='share'&&u.day>=a&&u.day<=b).length}},
    reports(a,b){return D.reports.filter(x=>inR(x.created_at,a,b))},
  }})();

