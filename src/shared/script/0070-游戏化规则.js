const LV=[[0,'初见'],[40,'相伴'],[60,'常伴'],[75,'挚友'],[88,'南伴之光']];   // 球友等级（阈值是后台社区分，用户看不到）
const LVCOLOR=['#9A6B45','#7D8B95','#1E8A60','#C9982D','#1A1A1A'];
const RULES=[['打完一场球','+10'],['组织一场球（至少 1 位球友加入并打完）','+20'],['被球友点赞','+5'],['连续每周都有打球','+5 / 周'],['邀请的新朋友打完第一场','+20'],['开打前 24 小时内退出','−10']];
const BADGES=[
  ['first','首场','完成第 1 场','#1',1,s=>s.played],['ten','十场','完成 10 场','#10',10,s=>s.played],['fifty','半百','完成 50 场','#50',50,s=>s.played],['hundred','百场','完成 100 场','#100',100,s=>s.played],
  ['host10','组局达人','组织 10 场','📣',10,s=>s.hosted],['night','夜场常客','晚场 10 场','🌙',10,s=>s.night],['early','早起鸟','早场 10 场','🐦',10,s=>s.early],['surface','全场地','硬地 · 红土 · 草地','🎾',3,s=>s.surfaces],
  ['explorer','Club 探险家','去过 5 个 Club','🧭',5,s=>s.clubs],['streak','四周连打','连续 4 周打球','🔥',4,s=>s.streak],['kudos','好球友','收到 30 次好评','👍',30,s=>s.kudos],['partner','黄金搭档','同一搭档打 10 场','🤝',10,s=>s.partner||0]];
// 徽章：绿底六边形；场次只放数字，其余放一枚拟物图形（系统彩色图标，手机上就是立体的样子）
function bdgHex(icon,got){const n=icon[0]==='#'?icon.slice(1):null;return n?`<span class="bg-n${n.length>2?' s':''}">${n}</span>`:`<span class="bg-e">${icon}</span>`}
function bdgMini(icon){const n=icon[0]==='#'?icon.slice(1):null;return n?`<b class="bm-n">${n}</b>`:`<span class="bm-e">${icon}</span>`}

