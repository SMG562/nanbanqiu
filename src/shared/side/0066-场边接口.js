/* ===== 场边接真后端（#369 PR-B）：接口数据 → 场边前台对象的转换口 + 配置缓存 =====
 * 真实模式 = 宿主页面有 NBQ_NET（正式 / 测试库）；演示（本地文件、测试）仍走 seed，PR-D 删。
 * 接口字段进前台只经这里（skill §六）：页面代码不直接读接口字段。读接口规格 tests/spec/api_spec.md §14.1。 */
const sbReal=()=>typeof nbqOn==='function'&&nbqOn();
const SB_CFG_KEY='nbq_sb_cfg',SB_FEED_KEY='nbq_sb_feed',SB_POLL_MS=30000;
const sbLS=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
// ---- 配置：只往前走。内置第 1 版（SB_CONFIG）不能盖掉后台发布的 v2：版本号不比手上的大就不用 ----
const SB_CFG_PARTS=['week','alias','hints','slots','topics','generic','settings','specials','starters'];
const SB_VER={v:SB_CONFIG.version||1};
const SB_TNAME={};   // 话题名字记录（含已下线的）：旧帖子挂着下线话题时，接口不给名字，用这里兜底
CFG.topics.forEach(t=>{SB_TNAME[t.id]=t.title});
const sbCfgUse=(cfg,ver)=>{if(!cfg||!(ver>SB_VER.v)||!SB_CFG_PARTS.every(k=>cfg[k]!==undefined))return false;
  CFG.topics.forEach(t=>{SB_TNAME[t.id]=t.title});SB_CFG_PARTS.forEach(k=>{CFG[k]=cfg[k]});SB_VER.v=ver;return true};
// 进入真实模式：去掉演示的假数字、假「本周最热」、假的大家发起话题（只做一次）
const sbEnterReal=()=>{if(sbEnterReal.done)return;sbEnterReal.done=1;SB_HOT=null;Object.keys(SB_N).forEach(k=>delete SB_N[k]);Object.keys(TOPICS).forEach(k=>{TOPICS[k].n=0});
  ['u1','u2','u3'].forEach(k=>delete TOPICS[k]);const c=sbLS(SB_CFG_KEY);if(c)sbCfgUse(c.config,c.version);
  TODAY=sbToday();sbApplyTopics(TOPICS)};
// ---- 转换 ----
const sbTs=t=>{const n=Date.parse(t);return isNaN(n)?Date.now():n};
// 作者：接口 profiles 里的一项 → 场边的人（字母头像，底色走 nbqColor；停用 / 注销的显示成「一位球友」）
const sbUser=(p,me)=>{if(!p||p.gone)return ANON_U;return {id:p.id,n:p.nickname||'球友',c:nbqColor(p.avatar_color),real:1,...(p.id&&p.id===me?{me:1}:{})}};
// 话题要先在 TOPICS 里有，页面才画得出名字；接口没给名字就用记录里的，再没有叫「话题」
const sbTopicEnsure=(T,id,info)=>{if(!id)return;if(!T[id])T[id]={t:(info&&info.title)||SB_TNAME[id]||'话题',k:info&&info.kind==='user'?'大家发起':'话题',q:'',ask:'',fills:[],n:0,user:1}};
// 一条动态。c = {prof, me, vk(venue_id)→球场键, km(球场键)→距离}
const sbFromPost=(p,c)=>{const x={id:p.id,uid:p.user_id,t:sbTs(p.publish_at),x:p.body||'',w:'',km:null,b:Math.max(0,(+p.balls||0)-(p.my_ball?1:0)),my:!!p.my_ball,r:[],rn:+p.replies||0,
    floor:+p.floor||0,closed:p.replies_open===false,mine:!!p.mine,tone:p.tone||'',u:sbUser(c.prof[p.user_id],c.me),real:1};
  if(p.topic_id)x.topic=p.topic_id;
  const k=p.venue_id&&c.vk?c.vk(p.venue_id):'';if(k){x.w=k;x.km=c.km?c.km(k):null}
  return x};
const sbFromReply=(r,post,c)=>({id:r.id,uid:r.user_id,x:r.body||'',t:sbTs(r.created_at),me:!!r.mine,op:r.user_id===post.user_id,
  to:r.to_user?((c.prof[r.to_user]||{}).nickname||null):null,u:sbUser(c.prof[r.user_id],c.me)});
