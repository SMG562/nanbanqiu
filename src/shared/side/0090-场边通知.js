/* ===== 场边通知（第八批 F2）：别人给我的发布点网球、回复我的发布、回复我 → 同一份消息列表 =====
 * 合并 = 数据库 sb_notify_ball / sb_notify_reply（接口文档 §14.8b）：
 *   网球 sb_ball（给作者）：第一下新建一条并提醒；还没看时，后面的并进这一条（人数 = 这一条之后点的、现在还点着的人，名字 = 最近点的人），不再提醒；
 *     看过之后再有新网球 → 新的一条；都取消了 → 没看的那条拿掉。
 *   回复 sb_reply（给作者）/ sb_reply_to（给被回复的人）：同一条发布 10 分钟内、还没看的并进同一条（人数 = 不同的人，内容 = 最近一条），不再提醒。
 * 文字 = server/notify/rules.mjs pushText（测试逐字对照）；不紧急（NR_LOW：夜里顺延到 8 点）；不发邮件（不在 EM_KIND）；
 * 推送前：发布 / 回复已不在、屏蔽了对方 → 不提醒。点开 → 场边那条发布（回复滚到那条），已不在 → 「这条已经不在了」。
 * 两端共用（F3 起）；各端只差「重画消息列表 sbNtfRedraw」「切到场边打开那条 sbShow」，写在各自的 side/0080-场边页.js。 */
const SB_NK=['sb_ball','sb_reply','sb_reply_to'];
SB_NK.forEach(k=>NR_LOW.add(k));
const SB_MERGE_MS=10*60e3;
const sbCut=(t,k=24)=>{const a=[...String(t||'').trim()];return a.length>k?a.slice(0,k).join('')+'…':a.join('')};
function sbNtfText(n){const a=n.an||'球友',k=n.sb_count||1;
  if(n.kind==='sb_ball')return [k>1?`${a} 和另外 ${k-1} 人给你点了网球 🎾`:`${a} 给你点了网球 🎾`,n.pb?`「${sbCut(n.pb)}」`:n.ph?'你的照片':''];
  if(n.kind==='sb_reply')return [k>1?`${a} 等 ${k} 人回复了你`:`${a} 回复了你`,sbCut(n.rb,40)];
  return [`${a} 回复了你`,sbCut(n.rb,40)]}
function sbPost(id){return SBV&&SBV.api.get(id)}
// 过时：发布不在了（删除 / 隐藏）、回复不在了、屏蔽了对方
function sbGone(n){const p=sbPost(n.sb_post_id);if(!p)return '发布已不在';if(n.kind!=='sb_ball'&&!p.reply(n.sb_reply_id))return '回复已不在';
  if(SBV.bl&&SBV.bl.has(n.an))return '有屏蔽关系';return null}
// 列表、横幅都要重画：合并只改数字和名字，不再提醒
function sbRefresh(){nrBadge();sbNtfRedraw()}
function sbNtf(o){if(!ME||!o||!o.post)return;const uid=ME.id,x=o.post,now=Date.now(),p=sbPost(x.id);if(!p)return;
  const base=()=>({id:++NID,user_id:uid,kind:o.kind,game_id:null,from:null,at:now,read:false,sb_post_id:x.id,sb_count:1,an:o.actor.n,ac:o.actor.c,pb:p.body,ph:p.photos});
  if(o.kind==='sb_ball'){
    const cur=NOTIFS.find(n=>n.user_id===uid&&n.kind==='sb_ball'&&n.sb_post_id===x.id&&!n.read);
    if(!cur){if(!o.on)return;const b=p.balls.find(b=>b.n===o.actor.n),n=Object.assign(base(),{since:b?b.t:now});NOTIFS.unshift(n);nrDeliver(n);return}
    const L=p.balls.filter(b=>b.t>=cur.since);
    if(!L.length)NOTIFS.splice(NOTIFS.indexOf(cur),1);
    else{const last=L.reduce((a,b)=>b.t>=a.t?b:a);cur.sb_count=L.length;cur.an=last.n;cur.ac=last.c}
    sbRefresh();return}
  const r=o.reply,me=o.kind==='sb_reply_to'?SBV.api.me:null;
  const cur=NOTIFS.find(n=>n.user_id===uid&&n.kind===o.kind&&n.sb_post_id===x.id&&!n.read&&now-n.at<SB_MERGE_MS);
  if(!cur){const n=Object.assign(base(),{sb_reply_id:r.id,rb:r.x});NOTIFS.unshift(n);nrDeliver(n);return}
  const who=new Set(p.replies.filter(y=>!y.me&&y.t>=cur.at&&(!me||y.to===me)).map(y=>y.n));
  Object.assign(cur,{sb_count:Math.max(1,who.size),an:o.actor.n,ac:o.actor.c,sb_reply_id:r.id,rb:r.x});sbRefresh()}
// 文字、头像（场边的人不是球局的用户：用场边的字母头像）
{const _t=ntfText;ntfText=function(n){return n&&SB_NK.includes(n.kind)?sbNtfText(n):_t.apply(this,arguments)}}
{const _a=nrAv;nrAv=function(n,f){if(n&&SB_NK.includes(n.kind))return `<span class="av sbav" style="background:${n.ac||'#E6E3DC'}">${esc([...(n.an||'?')][0])}</span>`;return _a.apply(this,arguments)}}
{const _s=nrStale;nrStale=function(n){if(!n||!SB_NK.includes(n.kind))return _s.apply(this,arguments);return n.read?'已经看过':sbGone(n)}}
// 点开（横幅、列表、系统推送同一个入口）
{const _o=nrOpen;nrOpen=function(n){if(!n||!SB_NK.includes(n.kind))return _o.apply(this,arguments);n.read=true;nrBadge();
  sbBoot();if(!sbPost(n.sb_post_id)){toast('这条已经不在了');return}
  sbShow(n.sb_post_id,n.kind==='sb_ball'?null:n.sb_reply_id)};ntfOpen=nrOpen}
