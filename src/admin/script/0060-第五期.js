/* =====================================================================
 * 第五期：区域页 · 「此刻」面板（每小时更新）· 导航分组
 * ===================================================================== */
// 原型：补全墨尔本主要区域
[['Bentleigh',.24],['Burwood',.22],['Ashburton',.2],['Prahran',.28],['Elsternwick',.17],['Doncaster',.26],['Blackburn',.15],['Mount Waverley',.27],['Oakleigh',.19],['Caulfield',.23],['Armadale',.18],['Northcote',.21],['Brunswick',.2],['Fitzroy',.16],['Port Melbourne',.18],['South Melbourne',.22],['Essendon',.12],['Williamstown',.1],['Point Cook',.13],['Werribee',.08],['Ringwood',.14],['Croydon',.07],['Frankston',.06],['Dandenong',.09]].forEach(x=>SUBURBS.push(x));

/* ---------- 区域 ---------- */
const RDEF='活跃度 = 打上的球局 × 3 + 发布的球局 × 1 + 申请加入次数 × 0.5（和球场活跃度同一口径，只是按球场所在区汇总）';
const RSORT=[['score','活跃度'],['games','球局'],['played','打上的'],['players','活跃球友'],['nu','新注册'],['chg','环比']];
document.addEventListener('click',e=>{const b=e.target.closest('[data-rs]');if(!b)return;e.stopPropagation();S.rsort=b.dataset.rs;S.pg.regions=1;render()},true);

// 球局页：区域明细移到「区域」页，这里只留前 5

/* ---------- 今天（原「此刻」）：见 nowPanel 上方说明 ---------- */

