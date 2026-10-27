const blockedPair=(a,b)=>!!(a&&b&&((USERS[a]&&USERS[a].blocked.has(b))||(USERS[b]&&USERS[b].blocked.has(a))));
function V(g){const v=VEN[g.venue_id],start=new Date(g.starts_at),end=new Date(+start+g.duration_min*6e4),ps=PARTS.filter(p=>p.game_id===g.id);
  const appr=ps.filter(p=>p.status==='approved').sort((a,b)=>(a.role==='host'?-1:0)-(b.role==='host'?-1:0)),pend=ps.filter(p=>p.status==='pending'&&!blockedPair(g.host_id,p.user_id)),mineP=ME?ps.find(p=>p.user_id===ME.id&&p.status!=='withdrawn'&&p.status!=='left'):null;
  return {...g,v,start,end,appr,pend,hold:Array(g.filled||0).fill(0),spots:g.capacity-appr.length-(g.filled||0),dist:km(LOC,v),mine:mineP?mineP.status:null,mineP,isHost:!!ME&&g.host_id===ME.id,host:U(g.host_id),past:end<NOW}}
function stateOf(c){if(c.status==='cancelled')return'cancelled';if(c.past||c.status==='completed')return'past';if(c.isHost)return'host';
  if(['pending','approved','rejected','held','invited'].includes(c.mine))return c.mine;return c.spots<=0?'full':'open'}
const lvl=c=>c.ntrp_min<=UTR_MIN&&c.ntrp_max>=UTR_MAX?'不限':c.ntrp_min===c.ntrp_max?f1(c.ntrp_min):f1(c.ntrp_min)+'–'+f1(c.ntrp_max);
const PILL={held:['保留中','p-amber'],invited:['受邀','p-amber'],host:['我发起','p-host'],approved:['已加入','p-green'],pending:['待确认','p-amber'],rejected:['没排上','p-gray'],full:['已满','p-gray'],cancelled:['已取消','p-red'],past:['已结束','p-gray']};
const pill=c=>{const s=stateOf(c);if(s==='open')return `<span class="pill ${c.spots===1?'p-lime':'p-green'}">缺 ${c.spots} 位</span>`;
  if(s==='host'&&c.pend.length)return `<span class="pill p-amber">${c.pend.length} 个申请</span>`;const p=PILL[s];return `<span class="pill ${p[1]}">${p[0]}</span>`};
