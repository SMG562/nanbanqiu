/* =====================================================================
 * 第八期：球场 × 区域 统一管理
 * 球场的「所在区」必须是区域库里的一个区（名称 + 邮编）。用户添加球场时：
 *   · 从 Google 地图选的：区由坐标自动算出（落在哪个区里），不让用户填
 *   · 手动添加的：只能从区域库里选（输入邮编最快）；系统再用坐标 / 地址复核
 * 复核不一致（填的区和坐标所在的区不同、或者离区中心超过 3 km）→「区域待核实」，后台一键改正
 * ===================================================================== */
const vFix=v=>v[10]||null;
function vsubHTML(){const by={};VENUES.filter(v=>v[6]!=='rejected'&&v[6]!=='nosub'&&v[6]!=='outside').forEach(v=>{const k=v[3];(by[k]=by[k]||{n:0,u:0}).n++;if(v[4]==='user')by[k].u++});
  delete by[''];const rows=Object.entries(by).sort((a,b)=>b[1].n-a[1].n||a[0].localeCompare(b[0])),P=pager('vsub',rows.length,12),fixes=VENUES.filter(vFix);
  return (fixes.length?`<div class="card sec" id="pg-vfix"><div class="ch"><b>区域待核实</b><small>用户填的区和实际位置对不上，或两份资料写的区不一样 · ${fixes.length} 个</small></div><table><tbody>
    ${fixes.map(v=>`<tr><td><b style="font-weight:600">${esc(v[2])}</b><br><small style="color:var(--mut)">${v[11]==='名录'?'两份资料不一致':esc(v[5]||'')+' 提交'}</small></td><td>${v[11]==='名录'?'现有资料':'填的是'} <b>${esc(v[3])}</b> ${VPC[v[3]]||''}</td><td>${v[11]==='名录'?'名录里写':'实际在'} <b>${esc(vFix(v))}</b> ${VPC[vFix(v)]||''}</td><td class="r"><div class="rowacts"><button class="btn sm p" data-vfx="${v[0]}">改为 ${esc(vFix(v))}</button><button class="btn sm" data-vfk="${v[0]}">保持不变</button></div></td></tr>`).join('')}</tbody></table>
    <p class="cap">复核规则：手动添加的球场，用地址坐标反查所在的区；和用户填的不一致，或者离所填区的中心超过 3 km，就进这里。</p></div>`:'')
  +`<div class="card sec" id="pg-vsub"><div class="ch"><b>区域 × 球场</b><small>${rows.length} 个区有收录的球场 · 点一个区，只看这个区的球场</small></div>
    <table><thead><tr><th>区</th><th>邮编</th><th class="r">球场</th><th class="r">用户提交</th><th></th></tr></thead><tbody>
    ${rows.slice(P.from,P.to).map(([k,x])=>`<tr data-vsub="${esc(k)}" style="cursor:pointer${S.vsub===k?';background:var(--gw)':''}"><td><b style="font-weight:600">${esc(k)}</b></td><td class="num" style="color:var(--mut)">${VPC[k]||''}</td><td class="r num"><b>${x.n}</b></td><td class="r num">${x.u||'—'}</td><td class="r" style="color:var(--mut)">›</td></tr>`).join('')}</tbody></table>${P.html}
    <p class="cap">${VENUES.length} 个球场 = 公开资料整理的 88 个 + 名录（244 家）合并去重；同名同区算一家，同名但相隔 6 km 以上算两家。${VENUES.filter(v=>v[6]==='nosub'||v[6]==='outside').length} 个还没有区或在服务范围外，暂不在 App 里显示。坐标待逐个用 Google 地图核实。</p></div>`}
const _pageVenues8=pageVenues6;
function pageVenues8(){let h=_pageVenues8();const i=h.indexOf('<div class="card sec" id="pg-vdb">');
  const chip=S.vsub?`<div class="vsubchip">只看 <b>${esc(S.vsub)}</b> ${VPC[S.vsub]||''}<button data-vsub="">×</button></div>`:'';
  if(i>=0)h=h.slice(0,i)+vsubHTML()+h.slice(i).replace('<div class="chips" style="margin-bottom:12px">',chip+'<div class="chips" style="margin-bottom:12px">');return h}
document.addEventListener('click',e=>{const t=e.target;
  const s=t.closest('[data-vsub]');if(s){S.vsub=s.dataset.vsub||null;S.pg.vdb=1;render();const c=document.getElementById('pg-vdb');c&&c.scrollIntoView({block:'start'});return}
  const fx=t.closest('[data-vfx]');if(fx){const v=VENUES.find(x=>x[0]===fx.dataset.vfx);S.audit.unshift(['Han','venue.suburb',`${v[2]} · ${v[3]} → ${v[10]}`,'刚刚']);v[3]=v[10];v.length=10;render();return}
  const fk=t.closest('[data-vfk]');if(fk){const v=VENUES.find(x=>x[0]===fk.dataset.vfk);v.length=10;render()}},true);

