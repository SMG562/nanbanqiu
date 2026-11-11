/* ===== 场边通知的规则（E2 抽出）：纯函数，不碰页面里的任何东西 —— tests/unit/side_rules.mjs 在 Node 里直接测 =====
 * 合并 = 数据库 sb_notify_ball / sb_notify_reply（接口文档 §14.8b）；文字 = server/notify/rules.mjs pushText。 */
const SB_MERGE_MS=10*60e3;
const sbCut=(t,k=24)=>{const a=[...String(t||'').trim()];return a.length>k?a.slice(0,k).join('')+'…':a.join('')};
function sbNtfText(n){const a=n.an||'球友',k=n.sb_count||1;
  if(n.kind==='sb_ball')return [k>1?`${a} 和另外 ${k-1} 人给你点了网球 🎾`:`${a} 给你点了网球 🎾`,n.pb?`「${sbCut(n.pb)}」`:n.ph?'你的照片':''];
  if(n.kind==='sb_reply')return [k>1?`${a} 等 ${k} 人回复了你`:`${a} 回复了你`,sbCut(n.rb,40)];
  return [`${a} 回复了你`,sbCut(n.rb,40)]}
// 网球：balls = 这条发布现在还点着的 [{n 名字, c 头像色, t 时间}]（不含作者自己），since = 这条没看的提醒从哪一下算起
//   → null（都取消了：没看的那条拿掉）| {count 人数, an 最近点的人, ac}
const sbBallTally=(balls,since)=>{const L=balls.filter(b=>b.t>=since);if(!L.length)return null;
  const last=L.reduce((a,b)=>b.t>=a.t?b:a);return{count:L.length,an:last.n,ac:last.c}};
// 回复：还没看、10 分钟内的那条才并（正好 10 分钟 = 新的一条，和数据库 created_at > now() - 10 分钟 一样）
const sbReplyMergeable=(n,now)=>!n.read&&now-n.at<SB_MERGE_MS;
// 并进去后的人数 = 那条之后回复的不同的人（不算自己；sb_reply_to 只算回复我的），至少 1
const sbReplyCount=(replies,since,me)=>Math.max(1,new Set(replies.filter(y=>!y.me&&y.t>=since&&(!me||y.to===me)).map(y=>y.n)).size);
