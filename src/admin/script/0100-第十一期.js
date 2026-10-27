/* =====================================================================
 * 第十一期：体验与成长 —— 一局球从发布到打完、打完之后、长期成长的全链路监控
 * 口径与前台规则一一对应（见「数据口径 → 事件流程」）
 * ===================================================================== */
IC.life='<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
IC.after='<path d="M4 6h16v10H9l-5 4z"/><path d="M8.5 11h7"/>';
IC.grow='<path d="M12 20v-8"/><path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 14.5c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5z"/>';
(()=>{const i=PAGES.findIndex(p=>p[0]==='h'&&p[1]==='来源与使用');PAGES.splice(i,0,['h','体验与成长'],['life','球局全流程'],['after','打完之后'],['grow','成长与徽章']);
  TITLES.life='球局全流程';TITLES.after='打完之后';TITLES.grow='成长与徽章'})();

const nG=()=>Math.round(sum(inRange(),'games')*PFm('games'));
const sec=t=>`<div class="sec11">${t}</div>`;
const ins11=rows=>rows.length?`<div class="card ins11"><div class="ch"><b>值得关注</b><small>${rangeTxt()} · 只列有明显差异的</small></div>${rows.map(r=>`<div class="i11"><p>${r[0]}</p>${r[1]?`<small>→ ${r[1]}</small>`:''}</div>`).join('')}</div>`:'';
const tbl11=(head,rows)=>`<table><thead><tr>${head.map((h,i)=>`<th class="${i?'r':''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'r num':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/* ---------------- 球局全流程 ---------------- */
function pairBars2(rows){const mx=Math.max(...rows.map(r=>r[1]));return barsH(rows.map((r,i)=>({n:r[0],v:r[1],c:i===2?'var(--line)':''})),{lw:150,fv:pct})}

/* ---------------- 打完之后 ---------------- */
const IMP_A=[['守时','🌞'],['友善','😊'],['好搭子','🎾'],['认真','💪'],['有趣','😄'],['乐于分享','🤲'],['新手友好','❤️']];

/* ---------------- 成长与徽章 ---------------- */

/* ---------------- 事件：补齐前台新规则 ---------------- */

/* 数据口径：第三个标签「事件流程」，按一局球的顺序列出前台规则与事件 */
const FLOW11=[];   // 事件流程见文件末尾 B1

/* ---------- 第十二期：通知送达 · 球友约定 ---------- */

