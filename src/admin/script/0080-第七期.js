/* =====================================================================
 * 第七期：服务范围（区域数据管理）
 * 不需要管理员一个个维护区：区名、邮编、中心点来自官方公开数据集（ABS 统计区 + Australia Post 邮编），每年导入一次。
 * 管理员只做四件事：开放 / 暂停一个地区 · 置顶推荐的区 · 维护中文别名 · 根据「区外需求」决定下一个开放哪里。
 * ===================================================================== */
const AREAS=[{k:'melb',n:'大墨尔本',sub:669,lga:31,st:'on',src:'ABS 2021 · Australia Post · 2026-07 导入'},{k:'geelong',n:'Geelong',sub:0,lga:0,st:'off',src:'未导入'}];
S.pins=S.pins||['Box Hill','Glen Waverley','Melbourne CBD'];
S.alias=S.alias||[['博士山','Box Hill'],['格伦','Glen Waverley'],['市中心','Melbourne CBD'],['唐人街','Melbourne CBD'],['卡尔顿','Carlton'],['克莱顿','Clayton'],['唐卡斯特','Doncaster'],['圣基尔达','St Kilda'],['南雅拉','South Yarra'],['里士满','Richmond'],['点库克','Point Cook']];
function areasHTML(){const on=AREAS.filter(a=>a.st==='on');
  return `<div class="insight sec"><div><b>仅展示</b>：服务范围、推荐的区和中文别名目前写在前台代码里，改动要随版本发布；这里只展示当前的设置，不能在后台修改。</div></div>
  <div class="card sec" id="pg-areas"><div class="ch"><b>服务范围</b> <span class="pill nodot">仅展示</span><small>开放 ${on.length} 个地区 · ${fmt(on.reduce((s,a)=>s+a.sub,0))} 个区 · 区数据来自官方数据集，不需要手动一个个添加</small></div>
    <table><thead><tr><th>地区</th><th class="r">区</th><th class="r">LGA</th><th>数据</th><th>状态</th></tr></thead><tbody>
    ${AREAS.map((a,i)=>`<tr><td><b style="font-weight:600">${esc(a.n)}</b></td><td class="r num">${a.sub||'—'}</td><td class="r num">${a.lga||'—'}</td><td style="color:var(--mut);font-size:12px">${esc(a.src)}</td>
      <td>${a.st==='on'?'<span class="pill g">开放</span>':a.st==='prep'?'<span class="pill w">准备中</span>':'<span class="pill">未开放</span>'}</td>
      </tr>`).join('')}</tbody></table>
    <p class="cap">开放一个新地区 = 导入这个地区的官方区名数据（一次性脚本）→ 抽查几个区的位置 → 随版本发布。</p></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>推荐的区</b> <span class="pill nodot">仅展示</span><small>选区时排在「常用区域」最前面；其余按真实球局数自动排序</small></div>
      <div class="chips">${S.pins.map(p=>`<span class="pill nodot">${esc(p)}</span>`).join(' ')}</div></div>
    <div class="card"><div class="ch"><b>中文别名</b> <span class="pill nodot">仅展示</span><small>用户输入中文名也能找到区</small></div>
      <table><tbody>${S.alias.map(a=>`<tr><td>${esc(a[0])}</td><td style="color:var(--mut)">→</td><td>${esc(a[1])}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card sec"><div class="ch"><b>服务范围以外的需求</b> <span class="pill nodot">未上线</span></div>
    <p class="cap" style="margin:0">区外的用户目前看到「南伴球目前只在大墨尔本开放」。区外留资和「搜索没找到」还没有做，上线后在这里看下一个该开放哪里。</p></div>`}
const _pageRegions7=pageRegions;function pageRegions7(){return _pageRegions7()+areasHTML()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ar]');if(!b)return;e.stopPropagation();const k=b.dataset.ar,i=+b.dataset.i,v=id=>(document.getElementById(id)||{}).value?.trim();
  if(k==='pause'){AREAS[i].st='off';S.audit.unshift(['Han','area.pause',AREAS[i].n,'刚刚'])}
  if(k==='prep'){AREAS[i].st='prep';AREAS[i].sub=AREAS[i].k==='geelong'?54:0;AREAS[i].lga=AREAS[i].k==='geelong'?2:0;AREAS[i].src='ABS 2021 · Australia Post · 刚刚导入'}
  if(k==='open'){AREAS[i].st='on';S.audit.unshift(['Han','area.open',AREAS[i].n,'刚刚'])}
  if(k==='unpin')S.pins.splice(i,1);
  if(k==='pin'){const x=v('arPin');if(x&&!S.pins.includes(x))S.pins.push(x)}
  if(k==='unalias')S.alias.splice(i,1);
  if(k==='alias'){const a=v('arA1'),c=v('arA2');if(a&&c)S.alias.push([a,c])}
  render();const c=document.getElementById('pg-areas');c&&c.scrollIntoView({block:'start'})},true);

