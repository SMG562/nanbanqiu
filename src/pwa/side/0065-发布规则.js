/* ===== 发布与互动的规则（第八批 F1b）：和数据库同一套，按接口文档 §14 返回错误码；真正的判断在服务端，这里只为先给出提示 ===== */
// 链接：和数据库 api_sb_post / api_sb_reply 同一个正则
const SB_LINK=/(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\b|\/))/i;
// 频率：数据库 rate_rules 里场边的几条（窗口毫秒、次数、错误码）
const SB_RATE={sb_post:[[36e5,5,'sb_post_hourly_limit'],[864e5,20,'sb_post_daily_limit']],sb_topic:[[864e5,3,'sb_topic_daily_limit']],
  sb_reply:[[6e4,6,'message_too_fast']],sb_ball:[[6e4,30,'rate_limited']],sb_report:[[864e5,5,'report_daily_limit']]};
// 超了返回错误码；dry = 只看不记
const sbRate=(S,k,dry)=>{const now=Date.now(),R=S.rl||(S.rl={}),L=R[k]=(R[k]||[]).filter(t=>now-t<864e5);
  for(const[w,n,c]of SB_RATE[k])if(L.filter(t=>now-t<w).length>=n)return c;if(!dry)L.push(now);return null};
// 相似词（配置 alias）：词 → 话题
const SB_ALIAS=()=>Object.fromEntries(CFG.alias.map(([w,id])=>[w.toLowerCase(),id]));
const sbGeneric=lt=>CFG.generic.some(w=>w.toLowerCase()===lt);
// 话题名 → {id}（并入已有的）| {err} | {title}（新建）。和数据库 sb_topic_resolve 同一个顺序
const sbTopicResolve=(raw,T)=>{const t=String(raw||'').replace(/^\s*[#＃]+/,'').trim(),lt=t.toLowerCase(),st=CFG.settings;
  if(t.length<st.name_min||t.length>st.name_max)return{err:'invalid'};
  if(sbGeneric(lt))return{err:'topic_too_generic'};
  const al=SB_ALIAS()[lt];if(al&&T[al])return{id:al};
  const same=Object.keys(T).find(id=>T[id].t.toLowerCase()===lt);if(same)return{id:same};
  if(typeof NICK_BAD==='function'&&NICK_BAD(t))return{err:'topic_name_not_allowed'};
  return{title:t}};
