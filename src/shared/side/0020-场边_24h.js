/* ===== 场边 24h（第八批 F1a）：设计稿 v35 的 App，放在 Shadow DOM 里，样式不和页面互相影响 =====
   配置 = 后台发布的版本，前台读 sb_config(手上的版本号)；这里内置第 1 版（= 数据库建库时的第 1 版，测试逐项核对）。 */
const SB_CONFIG={"config":{"week":[{"dow":1,"auto_hot":false,"topic_id":"dopa","alt_topic_id":null},{"dow":2,"auto_hot":false,"topic_id":"gear","alt_topic_id":null},{"dow":3,"auto_hot":true,"topic_id":null,"alt_topic_id":null},{"dow":4,"auto_hot":false,"topic_id":"spot","alt_topic_id":null},{"dow":5,"auto_hot":false,"topic_id":"ootd","alt_topic_id":null},{"dow":6,"auto_hot":false,"topic_id":"pet","alt_topic_id":null},{"dow":7,"auto_hot":false,"topic_id":"sunset","alt_topic_id":"good"}],"alias":[["好场","spot"],["好物","good"],["学不会","brain"],["宠物","pet"],["旅行","trip"],["日落","sunset"],["狗","pet"],["神仙球场","spot"],["穿搭","ootd"],["装备","gear"]],"hints":[{"kind":"general","text":"场边有什么新鲜事？","active":true,"daypart":"any"},{"kind":"court","text":"{球场} 现在怎么样？","active":true,"daypart":"any"},{"kind":"court","text":"{球场} 有空场吗？","active":true,"daypart":"day"},{"kind":"court","text":"{球场} 的灯亮了吗？","active":true,"daypart":"night"},{"kind":"lost","text":"捡到东西了？","active":true,"daypart":"any"}],"slots":[{"to":11,"from":5,"name":"早上","slot":0,"topics":["brain","gear"]},{"to":16,"from":11,"name":"中午","slot":1,"topics":["good","spot"]},{"to":20,"from":16,"name":"傍晚","slot":2,"topics":["sunset","dopa"]},{"to":5,"from":20,"name":"晚上","slot":3,"topics":["dopa","love"]}],"topics":[{"id":"ootd","ask":"今天穿什么上场？","kind":"evergreen","sort":10,"intro":"今天穿什么上场？拍一张发上来。","title":"网球人的OOTD","active":true,"ends_at":null,"suggest":true,"starters":["今天这身是","第一次穿网球裙上场，","这双鞋终于到了，"],"starts_at":null,"photo_tags":["穿搭","鞋"]},{"id":"brain","ask":"今天哪个动作又没跟上？","kind":"evergreen","sort":20,"intro":"教学视频看了十遍，手还是不听话。","title":"脑子会了，身体没会","active":true,"ends_at":null,"suggest":true,"starters":["看了十遍教学视频，","教练说的我都懂，就是","今天的反手又"],"starts_at":null,"photo_tags":[]},{"id":"dopa","ask":"今天哪一拍最爽？","kind":"evergreen","sort":30,"intro":"那一拍打出去的时候。","title":"多巴胺太爽了","active":true,"ends_at":null,"suggest":true,"starters":["今天终于赢了一盘，","第一次发球直接得分，","打了两个小时，"],"starts_at":null,"photo_tags":[]},{"id":"pet","ask":"今天带它来了吗？","kind":"evergreen","sort":40,"intro":"来看球的、来捡球的，都算。","title":"带着宠物去打球","active":true,"ends_at":null,"suggest":true,"starters":["今天带狗狗来看球，","它在场边乖乖等了","它捡球比我还积极，"],"starts_at":null,"photo_tags":["宠物"]},{"id":"trip","ask":"这次带球拍去了哪？","kind":"evergreen","sort":50,"intro":"换一座城市，换一块场。","title":"带着球拍去旅行","active":true,"ends_at":null,"suggest":true,"starters":["这次旅行带上了球拍，","出门在外也没忘了打球，","找到一块海边的球场，"],"starts_at":null,"photo_tags":["风景"]},{"id":"gear","ask":"最近换了什么装备？","kind":"evergreen","sort":60,"intro":"新拍子、新鞋、新手胶，拆开的那一刻。","title":"我的新装备","active":true,"ends_at":null,"suggest":true,"starters":["换了新拍子，","新鞋第一次上场，","纠结了一个月，终于入手了"],"starts_at":null,"photo_tags":["球拍","球包"]},{"id":"spot","ask":"最近发现了哪块好场？","kind":"evergreen","sort":70,"intro":"人少、灯亮、地面好，悄悄分享。","title":"宝藏球场","active":true,"ends_at":null,"suggest":true,"starters":["发现一块宝藏球场：","这块场人少，而且","周末不用抢的场："],"starts_at":null,"photo_tags":["球场"]},{"id":"good","ask":"最近离不开的小东西？","kind":"evergreen","sort":80,"intro":"不贵，但真的好用。","title":"实用网球好物","active":true,"ends_at":null,"suggest":true,"starters":["用了就回不去的：","十几块钱买的","球包里一定会带的"],"starts_at":null,"photo_tags":[]},{"id":"sunset","ask":"今天的晚霞……","kind":"evergreen","sort":90,"intro":"最后一局，抬头看一眼。","title":"场边的晚霞","active":true,"ends_at":null,"suggest":true,"starters":["打完最后一局，抬头","今天的晚霞","夜场的灯亮起来的时候，"],"starts_at":null,"photo_tags":["晚霞"]},{"id":"love","ask":"周末和网球约会了吗？","kind":"evergreen","sort":100,"intro":"周末的约会对象：一块场，一筐球。","title":"别人在恋爱，而我在打球","active":true,"ends_at":null,"suggest":true,"starters":["这个周末的约会对象，是","别人在约会，我在","今天又和球拍待了一下午，"],"starts_at":null,"photo_tags":["影子"]}],"generic":["tennis","健身","墨尔本","打球","日常","生活","网球","运动"],"settings":{"name_max":12,"name_min":2,"hint_hold":4,"sink_days":30,"suggest_n":3,"hint_every":4,"later_hours":2,"hint_max_len":12,"post_max_len":60,"public_hours":24,"release_days":7,"reply_max_len":60,"release_people":3},"specials":[{"id":"c4996f77-8570-43a7-ac9e-4250450b51d4","city":null,"active":true,"ends_at":"2027-02-01T13:00:00Z","trigger":"date","topic_id":"ao","starts_at":"2027-01-11T13:00:00Z"}],"starters":{"lost":["在 {球场} 捡到一个","有没有人在 {球场} 看到一个"],"court":["{球场} 现在有空场，","{球场} 风好大，","刚下过雨，{球场} 的场地"]}},"version":1,"published_at":"2026-10-27T10:01:46.577979+11:00"};
const SB=(()=>{
const CFG=SB_CONFIG.config;
// 城市当地时间
const melNow=(t=Date.now())=>{const p={};new Intl.DateTimeFormat('en-AU',{timeZone:CITY.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false,weekday:'short'}).formatToParts(new Date(t)).forEach(x=>p[x.type]=x.value);
  return {y:+p.year,m:+p.month,d:+p.day,h:+p.hour%24,dow:{Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}[p.weekday]}};
const WD=['','周一','周二','周三','周四','周五','周六','周日'];
const live=t=>{const n=Date.now();return (!t.starts_at||+new Date(t.starts_at)<=n)&&(!t.ends_at||+new Date(t.ends_at)>n)};
// 今日推荐：正式版读 sb_today_topic(城市)；这里按数据库 sb_pick_today 同一个顺序算——
//   特别安排（按日期）→ 周历（ISO 周数单数时用隔周轮换的话题）→ 本周最热（大家发起的话题）→ 兜底（不在周历里的常驻话题，按顺序）
const dkey=o=>o.y*1e4+o.m*100+o.d;
const liveT=id=>CFG.topics.some(t=>t.id===id&&t.kind!=='user'&&live(t));
const isoWeek=o=>{const d=new Date(Date.UTC(o.y,o.m-1,o.d)),w=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-w+3);const y0=new Date(Date.UTC(d.getUTCFullYear(),0,4));return 1+Math.round(((d-y0)/864e5-3+((y0.getUTCDay()+6)%7))/7)};
const sbToday=(hot=SB_HOT)=>{const now=melNow(),k=dkey(now);
  const sp=CFG.specials.find(s=>s.trigger==='date'&&(!s.city||s.city===CITY.key)&&dkey(melNow(+new Date(s.starts_at)))<=k&&k<dkey(melNow(+new Date(s.ends_at)))&&liveT(s.topic_id));if(sp)return sp.topic_id;
  const w=CFG.week.find(x=>x.dow===now.dow);
  if(w&&w.auto_hot){if(hot)return hot}
  else if(w){if(w.alt_topic_id&&isoWeek(now)%2===1&&liveT(w.alt_topic_id))return w.alt_topic_id;if(liveT(w.topic_id))return w.topic_id}
  const inWeek=new Set(CFG.week.flatMap(x=>[x.topic_id,x.alt_topic_id]).filter(Boolean));
  return CFG.topics.filter(t=>t.kind==='evergreen').sort((a,b)=>(inWeek.has(a.id)-inWeek.has(b.id))||a.sort-b.sort||(a.id<b.id?-1:1)).map(t=>t.id)[0]};
// 演示：本周最热的大家发起的话题（正式版由数据库按近 7 天发帖人数算）
const SB_HOT='u2';
// 演示数字（今天几条）：正式版由信息流接口返回
const SB_N={ootd:37,love:486,gear:212,sunset:153,pet:96,spot:131,good:88,dopa:174,brain:207,trip:58};
const sbApplyTopics=T=>{const now=melNow(),today=sbToday(),left=Math.max(1,24-now.h);
  Object.keys(T).forEach(k=>{if(!T[k].user)delete T[k]});
  CFG.topics.filter(t=>t.kind!=='user'&&live(t)).sort((a,b)=>a.sort-b.sort).forEach(t=>{
    T[t.id]={t:t.title,k:t.id===today?'今日推荐 · '+WD[now.dow]:t.kind==='limited'?'限时话题':'常驻话题',q:t.intro||'',ask:t.ask||'',fills:t.starters||[],n:SB_N[t.id]||0,...(t.id===today?{left:left+' 小时',daily:1}:{})}});
  if(T[today]&&T[today].user)Object.assign(T[today],{k:'今日推荐 · '+WD[now.dow],left:left+' 小时',daily:1});
  if(!T[today])T[today]={t:'',k:'',q:'',ask:'',fills:[],n:0}};
const HQ0=(t,tp,sc)=>({t,tp:tp||null,sc:sc||null});
const sbHints=(kind,court)=>{const sl=CFG.slots[slotNow()],night=!!sl&&sl.from>sl.to;   // 晚上 = 跨过午夜的那个时段（设计稿：20 点到 5 点）
  return CFG.hints.filter(x=>x.active&&x.kind===kind&&(x.daypart==='any'||x.daypart===(night?'night':'day'))).map(x=>HQ0(court?x.text.split('{球场}').join(court):x.text,null,kind==='general'?null:kind))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=(id,c='i')=>`<svg class="${c}"><use href="#${id}"/></svg>`;
const M=6e4,H=36e5,NOW=Date.now();
const ago=t=>{const d=Math.max(0,(Date.now()-t)/M);return d<1?'刚刚':d<60?Math.floor(d)+' 分钟前':Math.floor(d/60)+' 小时前'};
const hm=t=>new Date(t).toTimeString().slice(0,5);
const alpha=t=>Math.max(.24,1-.76*Math.pow(Math.min(1,(Date.now()-t)/(24*H)),.6));
const chars=s=>(String(s).match(/[A-Za-z0-9$.,'’\-–]+|\s+|[\s\S]/gu)||[]).map(t=>/^\s+$/.test(t)?t:`<span class="c">${esc(t)}</span>`).join('');

