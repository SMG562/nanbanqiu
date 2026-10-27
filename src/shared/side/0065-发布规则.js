/* ===== 发布与互动的规则（第八批 F1b）：和数据库同一套，按接口文档 §14 返回错误码；真正的判断在服务端，这里只为先给出提示 ===== */
// 链接：和数据库 api_sb_post / api_sb_reply 同一个正则
const SB_LINK=/(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\b|\/))/i;
// 频率：数据库 rate_rules 里场边的几条（窗口毫秒、次数、错误码）
const SB_RATE={sb_post:[[36e5,5,'sb_post_hourly_limit'],[864e5,20,'sb_post_daily_limit']],sb_topic:[[864e5,3,'sb_topic_daily_limit']],
  sb_reply:[[6e4,6,'message_too_fast']],sb_ball:[[6e4,30,'rate_limited']],sb_report:[[864e5,5,'report_daily_limit']]};
// 纯函数：L = 这一类之前的时间戳 → 超了的错误码 | null（不改 L）
const sbRateHit=(L,k,now)=>{for(const[w,n,c]of SB_RATE[k])if(L.filter(t=>now-t<w).length>=n)return c;return null};
// 超了返回错误码；dry = 只看不记
const sbRate=(S,k,dry)=>{const now=Date.now(),R=S.rl||(S.rl={}),L=R[k]=(R[k]||[]).filter(t=>now-t<864e5),c=sbRateHit(L,k,now);
  if(!c&&!dry)L.push(now);return c};
// 相似词（配置 alias）：词 → 话题
const SB_ALIAS=()=>Object.fromEntries(CFG.alias.map(([w,id])=>[w.toLowerCase(),id]));
const sbGeneric=lt=>CFG.generic.some(w=>w.toLowerCase()===lt);
// 话题名 → {id}（并入已有的）| {err} | {title}（新建）。和数据库 sb_topic_resolve 同一个顺序
//   纯函数：cfg = 场边配置（alias、generic、settings），bad = 昵称规则 NICK_BAD；字数按字符算（= 数据库 char_length，表情算 1 个）
const sbTopicPick=(raw,T,cfg,bad)=>{const t=String(raw||'').replace(/^\s*[#＃]+/,'').trim(),lt=t.toLowerCase(),st=cfg.settings,n=[...t].length;
  if(n<st.name_min||n>st.name_max)return{err:'invalid'};
  if(cfg.generic.some(w=>w.toLowerCase()===lt))return{err:'topic_too_generic'};
  const al=(cfg.alias.find(([w])=>w.toLowerCase()===lt)||[])[1];if(al&&T[al])return{id:al};
  const same=Object.keys(T).find(id=>T[id].t.trim().toLowerCase()===lt);if(same)return{id:same};
  if(bad&&bad(t))return{err:'topic_name_not_allowed'};
  return{title:t}};
const sbTopicResolve=(raw,T)=>sbTopicPick(raw,T,CFG,typeof NICK_BAD==='function'?NICK_BAD:null);
