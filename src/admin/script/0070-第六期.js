/* =====================================================================
 * 第六期：球场数据库（为球友真正关心的信息服务）· 练习墙 · 风险处理阶梯 · 球员卡只留有用的发现
 * ===================================================================== */

/* ---------- 球员卡：只留能指导下一步改进的发现；规则不成立就不显示 ---------- */

/* ---------- 球场数据库 ----------
 * 球友选球场时真正想知道的：在哪、什么场地、场地好不好、能不能订、多少钱、要不要入会、环境怎么样、别人怎么评价。
 * 夜灯不再单独统计（墨尔本的球场基本都有）。字段对应 schema.sql 里 venues / venue_fees / venue_reviews。 */
const VTYPE={club:'俱乐部',public:'公共球场',school:'学校',commercial:'商业球馆'};
const VSURF={hard:'硬地',synthetic:'人造草',synclay:'人工红土',clay:'红土',grass:'草地'};
const VFAC={park:'停车',toilet:'洗手间',club:'会所',water:'饮水',shade:'遮阳',coach:'教练',shop:'球拍穿线',cafe:'咖啡'};
const VVIS={open:['公开订场','g','任何人都能在线订，按小时付费'],social:['Social 球局','w','固定时段到场付费就能打，不用入会'],guest:['会员带入','w','要会员带着一起来'],members:['仅会员','','只对会员开放']};
//            类型      场地                     片 室内 条件 设施                                        年费  对外      $/h 订场方式            评分 评价 练习墙 核实
const VATTR={
 v1: ['club',  ['synthetic','hard'],       8, 0, 4, ['park','toilet','club','water'],               420, 'open',   28,'Book a Court',      4.5,38,1,'9/12'],
 v2: ['club',  ['synclay','hard'],        10, 0, 5, ['park','toilet','club','water','coach','shop'], 560, 'guest',  null,'会员带入',          4.6,29,0,'9/20'],
 v5: ['public',['hard','synthetic'],       6, 0, 3, ['toilet','water','coach'],                     null,'open',   30,'Book a Court',      4.1,52,1,'8/30'],
 v4: ['club',  ['synthetic'],              9, 0, 4, ['park','toilet','club','coach'],               480, 'social', 15,'周六上午 Social',   4.3,21,0,'9/02'],
 v7: ['club',  ['synthetic','hard'],       7, 0, 3, ['park','toilet','club'],                       390, 'open',   25,'Book a Court',      4.0,17,1,'7/18'],
 v8: ['public',['hard'],                  24, 8, 5, ['park','toilet','water','shop','coach','cafe'],null,'open',   45,'官网订场',          4.4,64,0,'9/25'],
 v6: ['club',  ['grass','hard','clay'],   12, 2, 5, ['park','toilet','club','shop','coach','cafe'], 1600,'members',null,'仅会员',            4.8,12,0,'6/11'],
 v54:['club',  ['synthetic'],              6, 0, 3, ['toilet','club'],                              350, 'open',   22,'Book a Court',      3.9, 9,0,'8/14'],
 v65:['club',  ['hard'],                   4, 0, 2, ['toilet'],                                     300, 'open',   20,'Book a Court',      3.6, 8,1,'5/03'],
 v31:['club',  ['hard','synthetic'],      10, 0, 4, ['park','toilet','club','coach'],               410, 'open',   26,'ClubSpark',         4.2,15,0,'9/09'],
 v3: ['club',  ['hard'],                   6, 0, 3, ['park','toilet'],                              320, 'open',   22,'Book a Court',      3.8,11,0,'4/22'],
 v68:['public',['hard'],                  13, 0, 4, ['park','toilet','water','coach'],              null,'open',   34,'Book a Court',      4.2,26,0,'9/18'],
 v84:['club',  ['synthetic','synclay'],    5, 0, 3, ['toilet','club'],                              450, 'guest',  null,'会员带入',          4.0, 6,0,'3/30'],
 v88:['club',  ['synthetic'],              4, 0, 0, [],                                             null,null,     null,null,                0, 0,0,null],
 v17:['public',['hard'],                   2, 0, 0, [],                                             null,'open',   0,'免费，先到先打',     0, 0,1,null],
 v48:['club',  ['synthetic'],              6, 0, 0, ['park'],                                       null,null,     null,null,                0, 0,0,null],
 v9:["club", ["synthetic"], 10, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v11:["club", ["clay"], 12, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v18:["club", ["synthetic"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v20:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v21:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v22:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v33:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v34:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v40:["club", ["clay"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v41:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v42:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v50:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v51:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v52:["club", ["synthetic"], 3, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v58:["club", ["clay", "hard"], 10, 0, 0, [], null, "members", null, null, 0, 0, 0, null],
 v59:["club", ["synthetic", "clay"], 12, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v61:["club", ["clay", "grass", "hard"], 24, 0, 0, [], null, "members", null, null, 0, 0, 0, null],
 v71:["club", ["synthetic", "clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v78:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v89:["public", ["synclay", "hard"], 10, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v90:["public", ["hard"], 2, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v91:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v92:["public", ["hard"], 2, 0, 0, [], null, "open", 0, "免费，先到先打", 0, 0, 0, null],
 v93:["club", ["synthetic"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v94:["public", ["synthetic"], 2, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v95:["public", ["hard"], 2, 0, 0, [], null, "open", 0, "免费，先到先打", 0, 0, 0, null],
 v96:["club", ["clay"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v97:["club", ["synthetic"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v98:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v99:["public", ["synthetic"], 5, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v100:["club", ["synclay", "clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v101:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v102:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v103:["club", ["clay"], 5, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v104:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v105:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v106:["club", ["clay"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v107:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v108:["club", ["synthetic", "hard"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v109:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v110:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v111:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v112:["club", ["synclay", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v113:["public", ["synthetic"], 18, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v114:["public", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v115:["public", ["hard"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v116:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v117:["club", ["clay", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v118:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v119:["club", ["clay"], 8, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v120:["club", ["clay", "synthetic"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v121:["club", ["clay"], 10, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v122:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v123:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v124:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v125:["club", ["clay", "grass"], 12, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v126:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v127:["club", ["synthetic", "clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v128:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v129:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v130:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v131:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v132:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v133:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v134:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v135:["club", ["synthetic", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v136:["club", ["synthetic", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v137:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v138:["club", ["synthetic", "hard"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v139:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v140:["club", ["synthetic", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v141:["club", ["synthetic", "hard"], 10, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v142:["club", ["clay"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v143:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v144:["club", ["synthetic", "hard"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v145:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v146:["club", ["clay"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v147:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v148:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v149:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v150:["club", ["synthetic"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v151:["club", ["hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v152:["public", ["hard"], 4, 0, 0, [], null, "open", 0, "免费，先到先打", 0, 0, 0, null],
 v153:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v154:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v155:["public", ["hard"], 3, 0, 0, [], null, "open", 0, "免费，先到先打", 0, 0, 0, null],
 v156:["club", ["hard"], 4, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v157:["club", ["clay", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v158:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v159:["club", ["clay", "hard"], 10, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v160:["club", ["hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v161:["club", ["hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v162:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v163:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v164:["club", ["clay", "hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v165:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v166:["club", ["hard"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v167:["club", ["hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v168:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v169:["club", ["clay"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v170:["public", ["hard"], 2, 0, 0, [], null, "open", 0, "免费，先到先打", 0, 0, 0, null],
 v171:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v172:["public", ["hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v173:["club", ["hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v174:["club", ["synthetic", "hard"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v175:["club", ["hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v176:["club", ["clay"], 8, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v177:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v178:["club", ["clay", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v179:["club", ["clay"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v180:["club", ["synthetic", "clay"], 10, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v181:["club", ["synthetic", "hard"], 8, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v182:["club", ["hard"], 6, 0, 0, [], null, "open", null, null, 0, 0, 0, null],
 v183:["club", ["synthetic", "hard"], 12, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v184:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v185:["club", ["clay", "synthetic"], 8, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v186:["club", ["clay", "hard"], 12, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v187:["club", ["synthetic"], 4, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v188:["club", ["synthetic", "hard"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
 v189:["club", ["synthetic"], 6, 0, 0, [], null, null, null, null, 0, 0, 0, null],
};
const VREV=[['准时开灯，场地很平','v1',5,['场地平整','好停车']],['周末很难订到','v1',4,['难订']],['人造草有点旧了','v7',3,['场地旧']],['风有点大，但视野很好','v5',4,['风大']],['设施一流，价格也一流','v8',5,['设施好','贵']],['停车不太好找','v65',3,['停车难']]];
const vA=v=>{const a=VATTR[v[0]]||['club',[],null,0,0,[],null,null,null,null,0,0,0,null];   // 新导入的球场：场地信息未知，等运营补充
  return {type:a[0],surf:a[1],courts:a[2],indoor:a[3],cond:a[4],fac:a[5],fee:a[6],vis:a[7],price:a[8],book:a[9],rating:a[10],reviews:a[11],wall:a[12],checked:a[13]}};
// 完整度：球友最常看的 7 项有没有填
const vDone=a=>[a.surf.length,a.cond,a.fac.length,a.vis,a.vis==='open'||a.vis==='social'?a.price!=null:true,a.type==='public'||a.fee!=null,a.book].filter(Boolean).length/7;
const stars=n=>n?`<span class="stars" title="${n} / 5">${'★'.repeat(Math.round(n))}<i>${'★'.repeat(5-Math.round(n))}</i></span>`:'<span style="color:var(--mut)">—</span>';
const visPill=a=>a.vis?`<span class="pill ${VVIS[a.vis][1]} nodot">${VVIS[a.vis][0]}${a.price?` · $${a.price}/h`:a.price===0?' · 免费':''}</span>`:'<span class="pill w">待补充</span>';

/* ---------- 练习墙：为「墨尔本网球墙地图」准备（原型为示例数据） ---------- */
const WTYPE={concrete:'混凝土墙',board:'专用回弹板',brick:'砖墙'};
//          名称                         区域            附属球场 墙 面数 地面          对外  条件 评分 评价 素材 状态
const WALLS=[
 ['w1','Fawkner Park 练习墙',        'South Yarra',   'v5', 'concrete',2,'硬地','public',3,4.3,18,4,'verified'],
 ['w2','South Camberwell TC 练习墙','Glen Iris',     'v1', 'board',   1,'人造草','members',4,4.5,6,2,'verified'],
 ['w3','Princes Park 练习墙',        'Carlton North', null, 'concrete',1,'硬地','public',3,4.0,11,3,'verified'],
 ['w4','Elsternwick Park 练习墙',    'Elwood',        null, 'board',   2,'硬地','public',4,4.4,9,2,'verified'],
 ['w5','Camberwell Junction 练习墙','Camberwell',    'v7', 'brick',   1,'人造草','members',2,3.5,4,1,'verified'],
 ['w6','Mt Waverley Reserve 练习墙','Mount Waverley','v17','concrete',1,'硬地','public',4,4.1,7,0,'pending'],
 ['w7','Hawksburn TC 练习墙','South Yarra','v65','brick',   1,'硬地','members',2,3.2,3,0,'verified'],
 ['w8','Jells Park 练习墙',          'Wheelers Hill', null, 'concrete',1,'硬地','public',0,0,0,0,'pending'],
];

const vtabs=t=>`<div class="tabs" style="margin-bottom:12px"><button class="${t==='venues'?'on':''}" data-vtab="venues">球场数据库 <span style="color:var(--mut);font-weight:500">${VENUES.length}</span></button><button class="${t==='walls'?'on':''}" data-vtab="walls">练习墙 <span class="pill nodot" style="margin-left:4px">未上线</span></button></div>`;

/* ---------- 球场详情 / 编辑（抽屉） ---------- */
function vdHTML(v){const a=vA(v),seg=(k,opts,cur)=>`<div class="ud-st">${Object.entries(opts).map(([x,l])=>`<button class="${cur===x?'on':''}" data-vset="${k}" data-x="${x}">${Array.isArray(l)?l[0]:l}</button>`).join('')}</div>`;
  const rev=VREV.filter(r=>r[1]===v[0]);
  return `<div class="ud-h"><div><b style="font-size:18px">${esc(v[1])}</b><small style="display:block;color:var(--mut);margin-top:2px">${esc(v[2])} · ${esc(v[3])} · ${v[4]==='user'?esc(v[5])+' 提交':'官方录入'}</small></div><button class="ud-x" data-udx>×</button></div>
  <div class="ud-k" style="margin-top:14px">${[['场地条件',a.cond?a.cond+' / 5':'—'],['完整度',pct(vDone(a))]].map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>
  <div class="ud-sec"><b>类型</b>${seg('type',VTYPE,a.type)}</div>
  <div class="ud-sec"><b>场地</b><div class="chips">${Object.entries(VSURF).map(([k,l])=>`<button class="${a.surf.includes(k)?'on':''}" data-vtog="surf" data-x="${k}">${l}</button>`).join('')}</div>
    <div class="vd-row"><label>片数<input class="search" value="${a.courts??''}" placeholder="—"></label><label>其中室内<input class="search" value="${a.indoor}"></label><label>场地条件<select class="search">${[0,1,2,3,4,5].map(n=>`<option ${a.cond===n?'selected':''}>${n?n+' 分':'未评估'}</option>`).join('')}</select></label></div>
    <p class="cap" style="margin-top:6px">场地条件：5 = 新铺 / 刚翻修，3 = 能打但有磨损，1 = 有积水、裂缝或坑。最后核实 ${a.checked||'—'}</p></div>
  <div class="ud-sec"><b>不是会员能打吗</b>${seg('vis',VVIS,a.vis)}<p class="cap" style="margin-top:6px">${a.vis?VVIS[a.vis][2]:'还没核实'}</p>
    <div class="vd-row"><label>每小时（$）<input class="search" value="${a.price??''}" placeholder="—"></label><label>订场方式<input class="search" value="${esc(a.book||'')}" placeholder="例如 Book a Court"></label></div>
    <div class="vd-row"><label>订场链接<input class="search" style="width:100%" placeholder="https://" value="${a.book==='Book a Court'?'https://www.bookacourt.com.au/…':''}"></label></div></div>
  ${a.type!=='public'?`<div class="ud-sec"><b>入会费用（每年）</b><table class="vd-fee"><tbody>${a.fee?[['成人',a.fee],['学生 / 青少年',Math.round(a.fee*.45)],['家庭',Math.round(a.fee*1.9)],['Social（不打比赛）',Math.round(a.fee*.6)]].map(r=>`<tr><td>${r[0]}</td><td class="r num">$${fmt(r[1])}</td></tr>`).join(''):'<tr><td style="color:var(--mut)">还没有填写</td><td class="r"><button class="btn sm">添加</button></td></tr>'}</tbody></table></div>`:''}
  <div class="ud-sec"><b>环境与设施</b><div class="chips">${Object.entries(VFAC).map(([k,l])=>`<button class="${a.fac.includes(k)?'on':''}" data-vtog="fac" data-x="${k}">${l}</button>`).join('')}<button class="${a.wall?'on':''}" data-vtog="wall">练习墙</button></div></div>
  <div class="ud-sec"><b>球友评价</b> <span class="pill nodot">未上线</span><p class="cap" style="margin-top:6px">球场页上线后，打完球的人可以评价。价格、入会费和订场方式目前只在后台整理，前台暂不显示。</p></div>
  <div class="ud-sec"><b>位置与来源</b><p class="cap" style="margin:4px 0 0">Google place_id <span class="mono">ChIJ${v[0].toUpperCase()}x9…</span> · 坐标来自 Google 地图<br>${v[4]==='user'?`由 ${esc(v[5])} 在发起球局时添加 · 系统检查：150 米内没有已收录的球场`:'官方录入'}</p></div>
  <div style="display:flex;gap:8px;margin-top:20px"><button class="btn p" data-vsave="${v[0]}">保存</button><button class="btn" data-udx>取消</button></div>`}
function openVD(id){const v=VENUES.find(x=>x[0]===id);if(!v)return;S.ud=null;let d=document.getElementById('ud');if(!d){d=document.createElement('div');d.id='ud';document.body.appendChild(d)}
  d.innerHTML=`<div class="ud-bg" data-udx></div><aside class="ud">${vdHTML(v)}</aside>`;requestAnimationFrame(()=>d.classList.add('show'))}
document.addEventListener('click',e=>{const t=e.target;
  const tb=t.closest('[data-vtab]');if(tb){S.vtab=tb.dataset.vtab;render();return}
  const vf=t.closest('[data-vf]');if(vf){S.vf=vf.dataset.vf;S.pg.vdb=1;render();return}
  const r=t.closest('tr[data-vd]');if(r&&!t.closest('button')){openVD(r.dataset.vd);return}
  const sg=t.closest('[data-vset]');if(sg){sg.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===sg));return}
  const tg=t.closest('[data-vtog]');if(tg){tg.classList.toggle('on');return}
  const sv=t.closest('[data-vsave]');if(sv){const v=VENUES.find(x=>x[0]===sv.dataset.vsave);S.audit.unshift(['Han','venue.update',v[2],'刚刚']);closeUD();sv.disabled=true;return}},true);

/* ---------- 风险用户：处理阶梯 ----------
 * 受限 vs 暂停：
 *   受限 = 只拿走「容易出问题的那部分」功能（女生局、私信 / 邀约没打过球的人），普通球局照常；长期有效，由管理员手动解除。针对「对谁有风险」。
 *   暂停 = 冷静期：在期限内不能发起、申请、邀约和发消息，只能登录查看；到期自动恢复。针对「行为严重但能改」。 */
UST.limited[2]='长期有效，由管理员手动解除 · 不能报名女生局，不能私信或邀约没一起打过球的人；普通球局照常发起和申请';
UST.suspended[2]='有期限，到期自动恢复 · 期间只能登录查看，不能发起、申请、邀约和发消息；待处理的申请自动撤回，已确认的球局保留';
UST.limited[2]='长期有效，由管理员手动解除 · 不能报名女生局，不能私信、邀约没一起打过球的人，也不能接受他们的邀约；普通球局照常发起和申请';
UST.deleted[2]='本人申请注销：已加入的球局自动退出，发起的未开打球局取消并通知其他人；30 天内用同一手机号登录可恢复，之后资料匿名化，只保留统计数据';
UST.banned[2]='不能登录；待处理的申请撤回，已加入的球局自动退出，发起的未开打球局自动取消并通知其他人';
const RSUG=s=>{const k=s.sig.map(x=>x[0]).join('|');
  if(/爽约/.test(k))return['suspended','暂停 7 天','近 30 天确认爽约 2 次（等级上限按近 90 天）'];
  if(/约定/.test(k))return['suspended','暂停','违反球友约定，按情节 1–180 天'];
  if(/性别|女生/.test(k))return['review','待核实','女生局相关'];
  if(/链接|私信/.test(k))return['limited','受限','对陌生人发消息有风险'];
  if(/婉拒/.test(k))return['limited','受限','反复打扰同一批发起人'];
  return['watch','观察','单一信号，先看看']};
RISK.forEach((r,i)=>{let u=USERS.find(x=>x.name===r.u);
  if(!u){const b=USERS[(i*13+5)%60];u={...b,id:'ur'+(i+1),name:r.u,sub:r.sub,no:1200+i*37,uid:(b.uid||'0000000000000000').split('').reverse().join(''),st:'active',hist:[],until:null,col:'#667085'};USERS.push(u)}
  r.uid=u.id;if(r.st==='limited'){u.st='limited';r.st='handled'}});
function pageSafety6(){const h=pageSafety(),a=h.indexOf('<div class="card sec"><div class="ch"><b>潜在风险用户</b>'),b=h.indexOf('<div class="grid g2 sec">',a);
  const lv=s=>s>=60?'<span class="pill c">高</span>':s>=30?'<span class="pill w">中</span>':'<span class="pill">低</span>';
  const RS={open:'<span class="pill w">待处理</span>',watching:'<span class="pill nodot">观察中</span>',handled:'<span class="pill g">已处理</span>',ignored:'<span class="pill nodot" style="color:var(--mut)">已忽略</span>'};
  const tbl=`<div class="card sec"><div class="ch"><b>潜在风险用户</b><small>规则自动打分，每小时更新；只是提醒，怎么处理由人决定</small></div><table><thead><tr><th>球友</th><th>用户 ID</th><th class="r">风险分</th><th>触发的信号</th><th>现在的账号</th><th>建议</th><th>进度</th><th></th></tr></thead><tbody>
    ${RISK.map((r,i)=>{const u=USERS.find(x=>x.id===r.uid),sg=RSUG(r);return `<tr><td><div class="who">${av(u)}<div><b>${esc(u.name)}</b><small>#${String(u.no).padStart(4,'0')} · ${esc(r.sub)} · ${r.age}</small></div></div></td><td>${idCell(u)}</td>
      <td class="r"><b class="num">${r.score}</b> ${lv(r.score)}</td><td>${r.sig.map(s=>`<span class="pill nodot" style="margin:2px 4px 2px 0">${esc(s[0])} × ${s[1]}</span>`).join('')}</td><td>${stPill(u)}</td>
      <td><b style="font-weight:600">${sg[1]}</b><br><small style="color:var(--mut)">${sg[2]}</small></td><td>${RS[r.st]||RS.open}</td>
      <td><div class="rowacts"><button class="btn sm p" data-rkgo="${i}">处理</button>${r.st==='open'?`<button class="btn sm" data-rkst="${i}" data-s="watching">观察</button><button class="btn sm" data-rkst="${i}" data-s="ignored">忽略</button>`:''}</div></td></tr>`}).join('')}</tbody></table>
    <p class="cap">「处理」打开账号面板，选状态、原因和时长；「观察」只是内部标记，本人不会知道，7 天后自动再看一次。所有操作写入审计日志。</p></div>`;
  const ladder=[['观察','内部标记，本人无感','7 天后自动复查','分数 30–59，或只有一种信号',''],['待核实','暂时不能报名女生局','24 小时内人工核实','冒用女生身份、资料存疑','w'],['受限','不能报名女生局，不能私信 / 邀约没打过球的人；普通球局照常','长期，由管理员手动解除','骚扰、发广告、反复打扰发起人','w'],['暂停','不能发起、申请、邀约、发消息，只能看','1 / 3 / 7 / 30 / 90 / 180 天，到期自动恢复','多次爽约、言语冲突','c'],['封禁','不能登录，已报名的球局自动退出','永久','严重骚扰、威胁、诈骗；暂停后再犯','c']];
  const lad=`<div class="card sec"><div class="ch"><b>处理阶梯</b><small>从轻到重；一个账号同一时间只有一种状态，每一步都会通知本人原因和期限，本人可在「我的 → 联系我们」申诉</small></div>
    <div class="lad">${ladder.map((x,i)=>`<div><span class="pill ${x[4]}">${i+1} · ${x[0]}</span><p>${x[1]}</p><dl><dt>期限</dt><dd>${x[2]}</dd><dt>用在</dt><dd>${x[3]}</dd></dl></div>`).join('')}</div>
    <div class="insight" style="margin-top:14px"><div><b>受限和暂停的区别</b>：受限是拿走容易出问题的那部分功能（女生局、找陌生人），人还能正常约普通球局，没有期限；暂停是一段冷静期，所有互动都停，到期自动恢复。<br>升级：受限期间再被举报 → 暂停 7 天；一年内第 2 次暂停 → 由管理员决定是否封禁。</div></div></div>`;
  return h.slice(0,a)+tbl+lad+h.slice(b)}
document.addEventListener('click',e=>{const t=e.target;
  const g=t.closest('[data-rkgo]');if(g){const r=RISK[+g.dataset.rkgo];openUD(r.uid);const sg=RSUG(r);setTimeout(()=>{const b=document.querySelector(`[data-udst="${sg[0]}"]`);b&&b.click()},60);return}
  const s=t.closest('[data-rkst]');if(s){const r=RISK[+s.dataset.rkst];r.st=s.dataset.s;S.audit.unshift(['Han','risk.'+r.st,r.u,'刚刚']);render();return}},true);
// 在账号面板里改了状态 → 对应的风险提醒标记为已处理
document.addEventListener('click',e=>{const go=e.target.closest('[data-udgo]');if(!go||!S.ud)return;const r=RISK.find(x=>x.uid===S.ud);if(r)r.st='handled'},true);

