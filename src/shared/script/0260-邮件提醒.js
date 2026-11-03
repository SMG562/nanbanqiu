/* ===================== 邮件提醒（推送的兜底） =====================
 * 注册仍然只要手机号。只在「收不到推送」的人刚申请 / 刚发起之后，顺手问一次邮箱（选填，不填 30 天内不再问）；
 * 只有推送不到才发邮件；同一局同一类 1 小时内最多一封；每人每天最多 5 封。
 * 「我的 → 邮件提醒」随时添加、修改或关闭。只发三类：有人申请、申请结果、球局改动 / 取消。不发广告，每封邮件都能一键退订。
 * 发送：后端用 Resend（免费每月 3,000 封、每天 100 封），发件人 noreply@nanbanqiu.app，域名配好 SPF / DKIM。 */
const EM_KIND={request:'request',approved:'result',rejected:'result',full:'result',changed:'change',game_cancelled:'change',postponed:'change'};
const EM_LAB=[['request','有人申请加入我的球局'],['result','我的申请有结果'],['change','我参加的球局改了时间、地点或被取消']];
var EMAIL_OUTBOX=[];
const emOK=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const emNeedAsk=()=>!!ME&&!ME.email&&!PUSH.enabled&&!(ME.emAskAt&&Date.now()-ME.emAskAt<30*864e5);
function emAskHTML(host){if(!emNeedAsk())return'';
  return `<div class="emk" id="emk"><b>留个邮箱，${host?'有人申请时告诉你':'结果出来发给你'}</b><div class="emk-r"><input id="emkIn" type="email" inputmode="email" autocomplete="email" placeholder="你的邮箱"><button data-em="save" data-k="${host?1:0}">好</button></div><button class="emk-x" data-em="skip">不用了</button></div>`}
function emSettings(){const p=ME.emPrefs||{};
  UF_OPEN(`<div class="uf em"><div class="uf-h">邮件提醒</div><p class="uf-s">推送收不到的时候，才用邮件告诉你。同一局 1 小时内最多一封，每天最多 5 封，不发广告。</p>
    ${ME.emailStatus==='bounced'?'<div class="em-bad">这个邮箱收不到邮件，换一个吧</div>':''}
    <input id="emSet" class="em-in" type="email" inputmode="email" autocomplete="email" placeholder="你的邮箱" value="${esc(ME.email&&ME.email!==NBQ_EMAIL_SET?ME.email:'')}">
    <div class="em-l">${EM_LAB.map(([k,l])=>`<button class="em-t${p[k]===false?'':' on'}" data-em="tog" data-k="${k}"><span>${l}</span><i></i></button>`).join('')}</div>
    <div class="uf-l" style="margin-top:14px"><button class="uf-r p" data-em="setSave"><b>保存</b></button>${ME.email?'<button class="uf-r d" data-em="off"><b>关闭邮件提醒</b></button>':''}</div></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-em]');if(!b||!ME)return;e.stopPropagation();const k=b.dataset.em;
  if(k==='save'){const v=($('#emkIn')||{}).value.trim();if(!emOK(v)){toast('邮箱格式好像不对');return}
    ME.email=v;ME.emPrefs=ME.emPrefs||{request:true,result:true,change:true};if(nbqOn())nbqPatchMe('em',{email:v,email_prefs:ME.emPrefs});$('#emk').outerHTML=`<div class="emk ok">✓ ${b.dataset.k==='1'?'有人申请时':'结果出来'}会发到 ${esc(v)}</div>`;return}
  if(k==='skip'){ME.emAskAt=Date.now();const x=$('#emk');if(x)x.remove();return}
  if(k==='settings'){emSettings();return}
  if(k==='tog'){b.classList.toggle('on');return}
  if(k==='setSave'){let v=$('#emSet').value.trim();const keep=!v&&ME.email===NBQ_EMAIL_SET;if(keep)v=NBQ_EMAIL_SET;if(v&&!keep&&!emOK(v)){toast('邮箱格式好像不对');return}
    ME.email=v||null;ME.emailStatus='ok';ME.emPrefs={};document.querySelectorAll('[data-em="tog"]').forEach(t=>ME.emPrefs[t.dataset.k]=t.classList.contains('on'));if(nbqOn())nbqPatchMe('em',keep?{email_prefs:ME.emPrefs}:{email:ME.email,email_prefs:ME.emPrefs});UF_CLOSE();toast(v?'已保存':'已关闭邮件提醒');render();return}
  if(k==='off'){ME.email=null;if(nbqOn())nbqPatchMe('em',{email:null});UF_CLOSE();toast('已关闭邮件提醒');render()}},true);
// ---------- 发送规则（原型里完整模拟一遍，和 schema.sql 的 ①–⑦ 一一对应；真实环境在后端执行） ----------
const EM_DELAY=5*6e4,EM_MERGE=36e5,EM_CAP=5,EM_RANK={change:0,result:1,request:2};
const emDay=t=>new Date(t).toLocaleDateString('en-AU',{timeZone:CITY.tz});
const emPushOK=u=>!!nrDev(u).mobile.push;            // ③ 原型：当前设备看 PUSH，其他人看 pushOK
function emQueue(uid,kind,gid,nid,t=Date.now()){const u=U(uid),k=EM_KIND[kind];if(!k)return null;                       // ①
  if(!u||!u.email||u.emailStatus&&u.emailStatus!=='ok'||(u.emPrefs||{})[k]===false)return null;                      // ②
  if(emPushOK(u))return null;                                                                                          // ③ 推送到了就不发
  const key=`${uid}:${gid}:${k}`,last=EMAIL_OUTBOX.filter(x=>x.key===key&&x.status!=='skipped').sort((a,b)=>b.created-a.created)[0];
  if(last&&last.status==='queued'){last.nids.push(nid);return last}                                                     // ④ 还没发出：并进同一封
  const after=last&&last.status==='sent'&&t-last.sent<EM_MERGE?last.sent+EM_MERGE:t+EM_DELAY;                           // ④ 1 小时内已发过：攒到满 1 小时
  const m={key,uid,to:u.email,kind:k,gid,nids:[nid],created:t,after,merged:after!==t+EM_DELAY,status:'queued'};EMAIL_OUTBOX.push(m);return m}
function emFlush(now=Date.now()){const due=EMAIL_OUTBOX.filter(x=>x.status==='queued'&&x.after<=now).sort((a,b)=>EM_RANK[a.kind]-EM_RANK[b.kind]||a.after-b.after);   // ⑤ 重要的先发
  due.forEach(m=>{const u=U(m.uid),ns=m.nids.map(id=>NOTIFS.find(n=>n.id===id)).filter(Boolean),g=GAMES.find(x=>x.id===m.gid);
    const skip=r=>{m.status='skipped';m.reason=r};
    if(emPushOK(u))return skip('pushed');                                                                              // ③ 期间开了推送
    const open=ns.filter(n=>!n.read);if(!open.length)return skip('seen');                                              // ③ 5 分钟内已经看过
    if(m.kind!=='change'&&g&&new Date(g.starts_at)<=now)return skip('stale');if(g&&g.status==='cancelled'&&!ns.some(n=>n.kind==='game_cancelled'))return skip('stale');if(m.kind==='invite'&&open.every(n=>nrStale({...n,read:false})))return skip('stale');                                          // ⑥ 球局已开打
    if(m.kind==='request'&&!open.some(n=>PARTS.some(p=>p.game_id===m.gid&&p.user_id===n.from&&p.status==='pending')))return skip('stale');   // ⑥ 申请都处理完了
    const sentToday=EMAIL_OUTBOX.filter(x=>x.uid===m.uid&&x.status==='sent'&&emDay(x.sent)===emDay(now)).length;
    if(sentToday>=EM_CAP)return skip('daily_cap');                                                                     // ⑤ 每人每天 5 封
    m.status='sent';m.sent=now;m.count=open.length;m.last=sentToday+1===EM_CAP;m.subject=emSubject(m,open,g)})}
function emSubject(m,ns,g){if(m.kind==='invite')return invText(ns[ns.length-1])[0];const c=g?V(g):null,when=c?`${relDay(c.start)} ${hm(c.start)}`:'',f=U(ns[0].from)||{name:'球友'};
  if(m.kind==='request')return m.merged?`又有 ${ns.length} 位球友申请加入你${when} 的球局`:ns.length>1?`${ns.length} 位球友申请加入你${when} 的球局`:`${f.name} 申请加入你${when} 的球局`;
  if(m.kind==='result'){const k=ns[ns.length-1].kind;return k==='approved'?`你的申请通过了 · ${when} ${c?c.v.short:''}`:`${when} 的球局没排上，附近还有别的局`}
  {const k=ns[ns.length-1].kind;if(m.kind==='invite')return invText(ns[ns.length-1])[0];if(k==='game_cancelled')return `球局已取消 · ${when}`;if(k==='postponed')return `球局顺延了 1 小时 · ${when}`;if(k==='unfilled')return `你的球局还缺人 · ${when}`}return `你参加的球局有改动 · ${when}`}
const _notifyEm=notify;notify=function(uid,kind,gid,from){_notifyEm(uid,kind,gid,from);const n=NOTIFS.find(x=>x.user_id===uid&&x.kind===kind&&x.game_id===gid);emQueue(uid,kind,gid,n&&n.id)};
// 发起人：刚发布、分享面板里顺手问一次
const _openShareEm=openShare;openShare=function(id){_openShareEm(id);if(UI._justMade!==id)return;UI._justMade=null;const h=emAskHTML(true);if(!h)return;
  const box=document.getElementById(typeof openSheet==='function'?'sheet':'modal');if(box)box.insertAdjacentHTML('beforeend',`<div class="emk-wrap">${h}</div>`)};


