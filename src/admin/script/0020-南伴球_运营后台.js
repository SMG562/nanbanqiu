/* =====================================================================
 * 南伴球 · 运营后台（原型）
 * 数据来源（上线后）：events 原始事件 → daily_metrics 汇总 + 若干视图（见 schema.sql「数据与后台」）
 * 本原型用固定种子生成 90 天的模拟数据，「实时动态」每隔几秒模拟一条新事件
 * ===================================================================== */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let SEED=20261002;const rnd=()=>{SEED=(SEED*1664525+1013904223)>>>0;return SEED/4294967296};
const pick=(a,w)=>{if(!w)return a[Math.floor(rnd()*a.length)];let s=w.reduce((x,y)=>x+y,0),r=rnd()*s;for(let i=0;i<a.length;i++){r-=w[i];if(r<=0)return a[i]}return a[a.length-1]};
const fmt=n=>n>=10000?(n/10000).toFixed(1)+'万':Math.round(n).toLocaleString('en-US');
const pct=x=>(x*100).toFixed(x<.1?1:0)+'%';
const NOW=new Date();const dayAt=o=>{const d=new Date(NOW);d.setHours(0,0,0,0);d.setDate(d.getDate()+o);return d};
const md=d=>`${d.getMonth()+1}/${d.getDate()}`;const WD='日一二三四五六';
const dark=()=>document.documentElement.dataset.theme==='dark'||(document.documentElement.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
// 单色顺序色阶（绿）：浅色模式由浅到深；深色模式由暗到亮
const RAMP_L=['#E6F2EA','#C6E3D0','#9BCEAF','#69B38B','#3E966C','#217A55','#0F5C40'];
const RAMP_D=['#1A2A21','#1F3D2D','#265A3F','#2F7A53','#3E9C69','#5BBF86','#8FDDAE'];
const ramp=t=>{const R=dark()?RAMP_D:RAMP_L;return R[Math.max(0,Math.min(R.length-1,Math.round(t*(R.length-1))))]};

/* ---------------- 基础字典 ---------------- */
const ANIMALS=[["dragon","龙"],["lion","狮子"],["tiger","虎"],["rabbit","兔"],["ox","牛"],["rat","鼠"],["snake","蛇"],["horse","马"],["sheep","羊"],["monkey","猴"],["rooster","鸡"],["dog","狗"],["pig","猪"],["cat","猫"],["bear","熊"],["koala","考拉"],["roo","袋鼠"],["elephant","大象"],["hedgehog","刺猬"],["bird","鸟"],["swallow","燕子"],["whale","鲸"],["turtle","乌龟"],["duck","鸭子"],["bee","蜜蜂"],["ant","蚂蚁"]];
const AW=[7,3,6,4,2,1.5,1.5,3,1.5,2.5,1.5,5,2,8,6,9,8.5,2,3,2.5,2,3,2,2.5,1.5,1];
const SEALS=[['bw-rd','白文'],['bw-rd-m:linen','布纹'],['zw-rd','朱文'],['bw-rd-g','毛玻璃'],['bw-rd-m:rim','积墨边'],['bw-rd-m:dry','飞白'],['free','无框'],['bw-rd-m:press','偏压']];
const SW=[34,9,8,12,7,11,6,9];
const COLORS=[["coral","珊瑚","#F0674A"],["amber","琥珀","#E08A12"],["rose","樱粉","#E0548A"],["wine","酒红","#A8325A"],["violet","紫罗兰","#7B68EE"],["sky","天蓝","#2C98EC"],["teal","湖青","#11A394"],["slate","石墨","#3A4252"]];
const CW=[22,15,14,6,10,13,12,8];
const THEMES=[["court","南伴绿","#0F7A5C"],["hard","硬地","#1C82E0"],["clay","红土","#E4572A"],["grass","草地","#66A23F"],["night","夜场","#1B2540"]];
const TW=[46,17,14,9,14];
const SUBURBS=[['Glen Iris',1],['Malvern',.92],['South Yarra',.88],['Hawthorn',.8],['Camberwell',.74],['Kew',.6],['Richmond',.55],['Box Hill',.52],['Melbourne CBD',.5],['Brighton',.45],['St Kilda',.42],['Glen Waverley',.4],['Balwyn',.37],['Toorak',.33],['Carlton',.3],['Docklands',.25],['Footscray',.21],['Clayton',.2]];
const VENUES=[["v1", "South Camberwell Tennis Club", "South Camberwell TC", "Glen Iris", "official", null, "verified", 1, 8, 1, "Camberwell", "名录"],
 ["v2", "Glendearg All Saints Malvern Tennis Club", "Glendearg All Saints TC", "Malvern", "official", null, "verified", 0.9, 10, 1],
 ["v3", "Chadstone Tennis Club", "Chadstone TC", "Malvern East", "official", null, "verified", 0.3, 6, 1],
 ["v4", "Hawthorn Tennis Club", "Hawthorn TC", "Hawthorn", "official", null, "verified", 0.72, 9, 1],
 ["v5", "Fawkner Park Tennis Centre", "Fawkner Park TC", "South Yarra", "official", null, "verified", 0.86, 6, 1],
 ["v6", "Kooyong Lawn Tennis Club", "Kooyong LTC", "Kooyong", "official", null, "verified", 0.4, 12, 1],
 ["v7", "Camberwell Junction Tennis Club", "Camberwell Junction TC", "Camberwell", "official", null, "verified", 0.68, 7, 1],
 ["v8", "Melbourne Park Tennis Centre", "NTC", "Melbourne CBD", "official", null, "verified", 0.6, 24, 1],
 ["v9", "East Malvern Tennis Club", "East Malvern TC", "Malvern East", "official", null, "verified", 0.28, 6, 1],
 ["v10", "Ardrie Park Tennis Club", "Ardrie Park TC", "Malvern East", "official", null, "verified", 0.22, 4, 1],
 ["v11", "MCC Glen Iris Valley Tennis Club", "MCC Glen Iris Valley TC", "Mount Waverley", "official", null, "verified", 0.07, 4, 1],
 ["v12", "Mount Waverley Tennis Club", "Mount Waverley TC", "Mount Waverley", "official", null, "verified", 0.08, 4, 1],
 ["v13", "Essex Heights Tennis Club", "Essex Heights TC", "Mount Waverley", "official", null, "verified", 0.02, 4, 1],
 ["v14", "Syndal Tennis Club", "Syndal TC", "Mount Waverley", "official", null, "verified", 0.03, 4, 1],
 ["v15", "Tally Ho Tennis Club", "Tally Ho TC", "Mount Waverley", "official", null, "verified", 0.04, 4, 1],
 ["v16", "Mayfield Park Tennis Club", "Mayfield Park TC", "Mount Waverley", "official", null, "verified", 0.05, 4, 1],
 ["v17", "Mount Waverley Reserve Public Tennis Court", "Mt Waverley Reserve", "Glen Waverley", "user", "Leo Z.", "pending", 0.08, 2, 1, "Mount Waverley", "user"],
 ["v18", "Glen Waverley Tennis Club", "Glen Waverley TC", "Glen Waverley", "official", null, "verified", 0.06, 4, 1],
 ["v19", "Glenburn Tennis Club", "Glenburn TC", "Glen Waverley", "official", null, "verified", 0.07, 4, 1],
 ["v20", "Glenvale Tennis Club", "Glenvale TC", "Glen Waverley", "official", null, "verified", 0.08, 4, 1],
 ["v21", "Legend Park Tennis Club", "Legend Park TC", "Glen Waverley", "official", null, "verified", 0.02, 4, 1],
 ["v22", "Notting Hill Pinewood Tennis Club", "Notting Hill Pinewood TC", "Glen Waverley", "official", null, "verified", 0.03, 4, 1, "Mount Waverley", "名录"],
 ["v23", "Whites Lane Mulgrave Tennis Club", "Whites Lane Mulgrave TC", "Glen Waverley", "official", null, "verified", 0.04, 4, 1],
 ["v24", "Glen Waverley Uniting Church Tennis Club", "Glen Waverley Uniting TC", "Glen Waverley", "official", null, "verified", 0.05, 4, 1],
 ["v25", "Wheelers Hill Tennis Club", "Wheelers Hill TC", "Wheelers Hill", "official", null, "verified", 0.06, 4, 1],
 ["v26", "Lum Reserve Tennis Club", "Lum Reserve TC", "Wheelers Hill", "official", null, "verified", 0.07, 4, 1],
 ["v27", "Wellington Tennis Club", "Wellington TC", "Mulgrave", "official", null, "verified", 0.08, 4, 1],
 ["v28", "Gladeswood Reserve Tennis Club", "Gladeswood TC", "Mulgrave", "official", null, "verified", 0.02, 4, 1],
 ["v29", "Aqualink Tennis Courts", "Aqualink Box Hill", "Box Hill", "official", null, "verified", 0.03, 4, 1],
 ["v30", "St Francis Xavier Tennis Club", "St Francis Xavier TC", "Box Hill", "official", null, "verified", 0.04, 4, 1],
 ["v31", "Box Hill Tennis Club", "Box Hill TC", "Box Hill South", "official", null, "verified", 0.46, 10, 1, "Box Hill", "名录"],
 ["v32", "North Box Hill Tennis Club", "North Box Hill TC", "Box Hill North", "official", null, "verified", 0.05, 4, 1],
 ["v33", "Blackburn Tennis Club", "Blackburn TC", "Blackburn", "official", null, "verified", 0.06, 4, 1],
 ["v34", "Burwood Tennis Club", "Burwood TC", "Burwood", "official", null, "verified", 0.07, 4, 1],
 ["v35", "East Burwood Tennis Club", "East Burwood TC", "Burwood East", "official", null, "verified", 0.08, 4, 1],
 ["v36", "Ashburton Tennis Club", "Ashburton TC", "Ashburton", "official", null, "verified", 0.02, 4, 1],
 ["v37", "Ashburton Uniting Church Tennis Club", "Ashburton Uniting TC", "Ashburton", "official", null, "verified", 0.03, 4, 1],
 ["v38", "St Michaels Tennis Club", "St Michaels TC", "Ashburton", "official", null, "verified", 0.04, 4, 1],
 ["v39", "St Rochs Tennis Club", "St Rochs TC", "Glen Iris", "official", null, "verified", 0.05, 4, 1],
 ["v40", "St Cecilias Tennis Club", "St Cecilias TC", "Glen Iris", "official", null, "verified", 0.06, 4, 1],
 ["v41", "Camberwell United Tennis Club", "Camberwell United TC", "Camberwell", "official", null, "verified", 0.07, 4, 1],
 ["v42", "City of Camberwell Tennis Club", "City of Camberwell TC", "Camberwell", "official", null, "verified", 0.08, 4, 1],
 ["v43", "Hartwell Tennis Club", "Hartwell TC", "Camberwell", "official", null, "verified", 0.02, 4, 1],
 ["v44", "East Camberwell Tennis Club", "East Camberwell TC", "Camberwell", "official", null, "verified", 0.03, 4, 1],
 ["v45", "Shenley Tennis Club", "Shenley TC", "Canterbury", "official", null, "verified", 0.04, 4, 1],
 ["v46", "Canterbury Tennis Club", "Canterbury TC", "Surrey Hills", "official", null, "verified", 0.05, 4, 1],
 ["v47", "Bluebell Hill Tennis Club", "Bluebell Hill TC", "Surrey Hills", "official", null, "verified", 0.06, 4, 1],
 ["v48", "Balwyn Park Tennis Club", "Balwyn Park TC", "Balwyn", "user", "Sarah L.", "pending", 0.06, 6, 1],
 ["v49", "Balwyn Community Centre Tennis Courts", "Balwyn Community", "Balwyn", "official", null, "verified", 0.07, 4, 1],
 ["v50", "North Balwyn Tennis Club", "North Balwyn TC", "Balwyn North", "official", null, "verified", 0.08, 4, 1],
 ["v51", "Greythorn Park Tennis Club", "Greythorn Park TC", "Balwyn North", "official", null, "verified", 0.02, 4, 1],
 ["v52", "St Aidans Tennis Club", "St Aidans TC", "Balwyn North", "official", null, "verified", 0.03, 4, 1, "Surrey Hills", "名录"],
 ["v53", "Boroondara TC", "Boroondara TC", "Balwyn North", "official", null, "verified", 0.04, 4, 1],
 ["v54", "Kew Tennis Club", "Kew TC", "Kew", "user", "Grace L.", "verified", 0.52, 6, 1],
 ["v55", "North Kew Tennis Club", "North Kew TC", "Kew", "official", null, "verified", 0.05, 4, 1],
 ["v56", "Victoria Park Tennis Club", "Victoria Park TC", "Kew", "official", null, "verified", 0.06, 4, 1],
 ["v57", "Our Lady of Good Counsel Tennis Club", "OLGC TC", "Kew", "official", null, "verified", 0.07, 4, 1],
 ["v58", "Grace Park Hawthorn Club Tennis", "Grace Park Hawthorn TC", "Hawthorn", "official", null, "verified", 0.08, 4, 1],
 ["v59", "Doncaster Tennis Club", "Doncaster TC", "Doncaster", "official", null, "verified", 0.02, 4, 1],
 ["v60", "Penpraze Park Tennis Courts", "Penpraze Park", "Malvern", "official", null, "verified", 0.03, 4, 1],
 ["v61", "Royal South Yarra Lawn Tennis Club", "Royal South Yarra LTC", "Toorak", "official", null, "verified", 0.04, 4, 1],
 ["v62", "Malvern TC", "Malvern TC", "Armadale", "official", null, "verified", 0.05, 4, 1],
 ["v63", "Princes Gardens Tennis Courts", "Princes Gardens", "Prahran", "official", null, "verified", 0.06, 4, 1],
 ["v64", "Orrong Park Tennis Centre", "Orrong Park TC", "Prahran", "official", null, "verified", 0.07, 4, 1],
 ["v65", "Hawksburn Tennis Club", "Hawksburn TC", "South Yarra", "user", "Tom W.", "verified", 0.48, 4, 1],
 ["v66", "Tennis World Melbourne Olympic Park", "Tennis World", "Melbourne CBD", "official", null, "verified", 0.08, 4, 1],
 ["v67", "Albert Park Lawn Tennis Club", "Albert Park LTC", "Albert Park", "official", null, "verified", 0.02, 4, 1],
 ["v68", "Albert Park Tennis and Hockey Centre", "Albert Park TC", "Albert Park", "user", "Jason W.", "verified", 0.36, 13, 1],
 ["v69", "Carmelite Middle Park Tennis Club", "Carmelite Middle Park TC", "Middle Park", "official", null, "verified", 0.03, 4, 1],
 ["v70", "MCC Tennis Roy Street Courts", "MCC Roy St", "St Kilda", "official", null, "verified", 0.04, 4, 1],
 ["v71", "Caulfield Park Tennis Club", "Caulfield Park TC", "Caulfield North", "official", null, "verified", 0.05, 4, 1],
 ["v72", "Glen Eira Tennis Club", "Glen Eira TC", "Caulfield South", "official", null, "verified", 0.06, 4, 1],
 ["v73", "Brooklyn Avenue Tennis Courts", "Brooklyn Ave Courts", "Caulfield South", "official", null, "verified", 0.07, 4, 1],
 ["v74", "Lauriston Lawn Tennis Club", "Lauriston LTC", "Carnegie", "official", null, "verified", 0.08, 4, 1],
 ["v75", "Murrumbeena Tennis Club", "Murrumbeena TC", "Murrumbeena", "official", null, "verified", 0.02, 4, 1],
 ["v76", "Caulfield Recreation Tennis Club", "Caulfield Rec TC", "Murrumbeena", "official", null, "verified", 0.03, 4, 1],
 ["v77", "St Patricks Tennis Club", "St Patricks TC", "Murrumbeena", "official", null, "verified", 0.04, 4, 1],
 ["v78", "Oakleigh Tennis Club", "Oakleigh TC", "Oakleigh", "official", null, "verified", 0.05, 4, 1],
 ["v79", "Bayview Tennis Club", "Bayview TC", "Chadstone", "official", null, "verified", 0.06, 4, 1],
 ["v80", "Monash University Clayton Tennis Courts", "Monash Clayton Courts", "Clayton", "official", null, "verified", 0.07, 4, 1],
 ["v81", "Victory Park Tennis Club", "Victory Park TC", "Bentleigh", "official", null, "verified", 0.08, 4, 1],
 ["v82", "St Pauls Tennis Club", "St Pauls TC", "Bentleigh", "official", null, "verified", 0.02, 4, 1],
 ["v83", "Bentleigh Reserve Tennis Courts", "Bentleigh Reserve", "Bentleigh", "official", null, "verified", 0.03, 4, 1],
 ["v84", "Middle Brighton Tennis Club", "Middle Brighton TC", "Brighton", "user", "Mia C.", "verified", 0.34, 5, 1],
 ["v85", "St James Tennis Club", "St James TC", "Brighton", "official", null, "verified", 0.04, 4, 1],
 ["v86", "St Leonards Tennis Club", "St Leonards TC", "Brighton", "official", null, "verified", 0.05, 4, 1],
 ["v87", "Elsternwick Park Tennis Centre", "Elsternwick Park TC", "Brighton", "official", null, "verified", 0.06, 4, 1],
 ["v88", "Princes Hill Tennis Club", "Princes Hill TC", "Carlton North", "user", "Alex M.", "pending", 0.12, 4, 1],
 ["v89", "Albert Reserve Tennis Centre (Tennis World)", "Albert Reserve TC", "Melbourne CBD", "official", null, "verified", 0.02, 10, 1],
 ["v90", "Flagstaff Gardens Tennis Courts", "Flagstaff Gardens Courts", "West Melbourne", "official", null, "verified", 0.02, 2, 1],
 ["v91", "Parkville Tennis Club", "Parkville TC", "Parkville", "official", null, "verified", 0.02, 6, 1],
 ["v92", "Princes Park Public Tennis Courts", "Princes Park Courts", "Parkville", "official", null, "verified", 0.02, 2, 1],
 ["v93", "Carlton Gardens Tennis Club", "Carlton Gardens TC", "Carlton", "official", null, "verified", 0.02, 4, 1],
 ["v94", "Kensington Banks Tennis Courts", "Kensington Banks Courts", "Kensington", "official", null, "verified", 0.02, 2, 1],
 ["v95", "Edinburgh Gardens Tennis Courts", "Edinburgh Gardens Courts", "Fitzroy North", "official", null, "verified", 0.02, 2, 1],
 ["v96", "Richmond Tennis Club", "Richmond TC", "Richmond", "official", null, "verified", 0.02, 4, 1],
 ["v97", "Clifton Hill Tennis Club", "Clifton Hill TC", "Clifton Hill", "official", null, "verified", 0.02, 4, 1],
 ["v98", "Collingwood Tennis Club", "Collingwood TC", "Abbotsford", "official", null, "verified", 0.02, 6, 1],
 ["v99", "Powlett Reserve Tennis Centre", "Powlett Reserve TC", "East Melbourne", "official", null, "verified", 0.02, 5, 1],
 ["v100", "South Hawthorn Tennis Club", "South Hawthorn TC", "Hawthorn East", "official", null, "verified", 0.02, 6, 1],
 ["v101", "Camberwell Tennis Club", "Camberwell TC", "Camberwell", "official", null, "verified", 0.02, 6, 1],
 ["v102", "Willison Park Tennis Club", "Willison Park TC", "Camberwell", "official", null, "verified", 0.02, 6, 1],
 ["v103", "Gardiner Tennis Club", "Gardiner TC", "Glen Iris", "official", null, "verified", 0.02, 5, 1],
 ["v104", "Balwyn Tennis Club", "Balwyn TC", "Balwyn", "official", null, "verified", 0.02, 6, 1],
 ["v105", "Balwyn North Tennis Club", "Balwyn North TC", "Balwyn North", "official", null, "verified", 0.02, 8, 1],
 ["v106", "Deepdene Tennis Club", "Deepdene TC", "Balwyn", "official", null, "verified", 0.02, 4, 1],
 ["v107", "Surrey Hills Tennis Club", "Surrey Hills TC", "Surrey Hills", "official", null, "verified", 0.02, 6, 1],
 ["v108", "Blackburn North Tennis Club", "Blackburn North TC", "Blackburn North", "official", null, "verified", 0.02, 6, 1],
 ["v109", "Blackburn South Tennis Club", "Blackburn South TC", "Blackburn South", "official", null, "verified", 0.02, 6, 1],
 ["v110", "Eley Park Tennis Club", "Eley Park TC", "Blackburn South", "official", null, "verified", 0.02, 8, 1],
 ["v111", "Nunawading Tennis Club", "Nunawading TC", "Nunawading", "official", null, "verified", 0.02, 6, 1],
 ["v112", "Koonung Park Tennis Club", "Koonung Park TC", "Box Hill North", "official", null, "verified", 0.02, 6, 1, "Blackburn North", "名录"],
 ["v113", "Monash Tennis Centre (GW Sports Hub)", "Monash TC", "Glen Waverley", "official", null, "verified", 0.02, 18, 1],
 ["v114", "Monash University Tennis Club", "Monash University TC", "Clayton", "official", null, "verified", 0.02, 8, 1],
 ["v115", "Princes Park Tennis Facility", "Princes Park", "Caulfield South", "official", null, "verified", 0.02, 4, 1],
 ["v116", "Bentleigh Recreation Tennis Club", "Bentleigh Recreation TC", "Bentleigh", "official", null, "verified", 0.02, 6, 1],
 ["v117", "Centenary Park Tennis Club", "Centenary Park TC", "Bentleigh East", "official", null, "verified", 0.02, 6, 1],
 ["v118", "Coatesville Tennis Club", "Coatesville TC", "Bentleigh East", "official", null, "verified", 0.02, 4, 1],
 ["v119", "Maccabi Tennis Club", "Maccabi TC", "Caulfield", "official", null, "verified", 0.02, 8, 1, "Bentleigh East", "名录"],
 ["v120", "Brighton Tennis Club", "Brighton TC", "Brighton", "official", null, "verified", 0.02, 8, 1],
 ["v121", "Dendy Park Tennis Club", "Dendy Park TC", "Brighton East", "official", null, "verified", 0.02, 10, 1],
 ["v122", "Hurlingham Park Tennis Club", "Hurlingham Park TC", "Brighton", "official", null, "verified", 0.02, 6, 1, "Brighton East", "名录"],
 ["v123", "Sandringham Tennis Club", "Sandringham TC", "Sandringham", "official", null, "verified", 0.02, 8, 1],
 ["v124", "Hampton Tennis Club", "Hampton TC", "Hampton", "official", null, "verified", 0.02, 6, 1],
 ["v125", "Beaumaris Lawn Tennis Club", "Beaumaris LTC", "Beaumaris", "official", null, "verified", 0.02, 12, 1],
 ["v126", "Black Rock Tennis Club", "Black Rock TC", "Black Rock", "official", null, "verified", 0.02, 4, 1],
 ["v127", "Mentone Tennis Club", "Mentone TC", "Mentone", "official", null, "verified", 0.02, 8, 1],
 ["v128", "Mordialloc Tennis Club", "Mordialloc TC", "Mordialloc", "official", null, "verified", 0.02, 6, 1],
 ["v129", "Parkdale Tennis Club", "Parkdale TC", "Parkdale", "official", null, "verified", 0.02, 6, 1],
 ["v130", "Aspendale Tennis Club", "Aspendale TC", "Aspendale", "official", null, "verified", 0.02, 4, 1],
 ["v131", "Edithvale Tennis Club", "Edithvale TC", "Edithvale", "official", null, "verified", 0.02, 6, 1],
 ["v132", "Chelsea Tennis Club", "Chelsea TC", "Chelsea", "official", null, "verified", 0.02, 6, 1],
 ["v133", "Long Beach Tennis Club", "Long Beach TC", "Carrum", "official", null, "verified", 0.02, 6, 1],
 ["v134", "Dingley Tennis Club", "Dingley TC", "Dingley Village", "official", null, "verified", 0.02, 8, 1],
 ["v135", "Northcote Tennis Club", "Northcote TC", "Northcote", "official", null, "verified", 0.02, 6, 1],
 ["v136", "Preston Tennis Club", "Preston TC", "Preston", "official", null, "verified", 0.02, 6, 1],
 ["v137", "Reservoir Tennis Club", "Reservoir TC", "Reservoir", "official", null, "verified", 0.02, 6, 1],
 ["v138", "Keon Park Tennis Club", "Keon Park TC", "Reservoir", "official", null, "verified", 0.02, 4, 1],
 ["v139", "Kingsbury Tennis Club", "Kingsbury TC", "Kingsbury", "official", null, "verified", 0.02, 4, 1],
 ["v140", "Brunswick Tennis Club", "Brunswick TC", "Brunswick", "official", null, "verified", 0.02, 6, 1],
 ["v141", "Coburg Tennis Club", "Coburg TC", "Coburg", "official", null, "verified", 0.02, 10, 1],
 ["v142", "East Coburg Tennis Club", "East Coburg TC", "Coburg", "official", null, "verified", 0.02, 4, 1],
 ["v143", "Pascoe Vale Tennis Club", "Pascoe Vale TC", "Pascoe Vale", "official", null, "verified", 0.02, 6, 1],
 ["v144", "Glenroy Tennis Club", "Glenroy TC", "Glenroy", "official", null, "verified", 0.02, 6, 1],
 ["v145", "Ivanhoe Tennis Club", "Ivanhoe TC", "Ivanhoe", "official", null, "verified", 0.02, 8, 1],
 ["v146", "Eaglemont Tennis Club", "Eaglemont TC", "Eaglemont", "official", null, "verified", 0.02, 6, 1, "Ivanhoe East", "名录"],
 ["v147", "Banyule Tennis Club", "Banyule TC", "Heidelberg", "official", null, "verified", 0.02, 6, 1],
 ["v148", "Macleod Tennis Club", "Macleod TC", "Macleod", "official", null, "verified", 0.02, 6, 1],
 ["v149", "Rosanna Tennis Club", "Rosanna TC", "Rosanna", "official", null, "verified", 0.02, 6, 1],
 ["v150", "Bundoora Tennis Club", "Bundoora TC", "Bundoora", "official", null, "verified", 0.02, 6, 1],
 ["v151", "Epping Tennis Club", "Epping TC", "Epping", "official", null, "verified", 0.02, 6, 1],
 ["v152", "Prism Park Tennis Courts", "Prism Park Courts", "Epping", "official", null, "verified", 0.02, 4, 1],
 ["v153", "Mill Park Tennis Club", "Mill Park TC", "Mill Park", "official", null, "verified", 0.02, 8, 1],
 ["v154", "Lalor Tennis Club", "Lalor TC", "Lalor", "official", null, "verified", 0.02, 4, 1],
 ["v155", "Henry Turner Memorial Reserve South", "Henry Turner Courts", "Footscray", "official", null, "verified", 0.02, 3, 1],
 ["v156", "Yarraville Tennis Club", "Yarraville TC", "Yarraville", "official", null, "verified", 0.02, 4, 1],
 ["v157", "Williamstown Tennis Club", "Williamstown TC", "Williamstown", "official", null, "verified", 0.02, 6, 1],
 ["v158", "Liston Tennis Club", "Liston TC", "Williamstown", "official", null, "verified", 0.02, 6, 1],
 ["v159", "Altona Tennis Club", "Altona TC", "Altona", "official", null, "verified", 0.02, 10, 1],
 ["v160", "Altona Meadows Tennis Club", "Altona Meadows TC", "Altona Meadows", "official", null, "verified", 0.02, 6, 1],
 ["v161", "Point Cook Tennis Club", "Point Cook TC", "Point Cook", "official", null, "verified", 0.02, 8, 1],
 ["v162", "Hoppers Crossing Tennis Club", "Hoppers Crossing TC", "Hoppers Crossing", "official", null, "verified", 0.02, 8, 1],
 ["v163", "Werribee Tennis Club", "Werribee TC", "Werribee", "official", null, "verified", 0.02, 8, 1],
 ["v164", "Sunshine Park Tennis Club", "Sunshine Park TC", "Sunshine", "official", null, "verified", 0.02, 6, 1],
 ["v165", "Keilor Tennis Club", "Keilor TC", "Keilor", "official", null, "verified", 0.02, 6, 1],
 ["v166", "St Albans Tennis Club", "St Albans TC", "St Albans", "official", null, "verified", 0.02, 4, 1],
 ["v167", "Taylors Lakes Tennis Club", "Taylors Lakes TC", "Taylors Lakes", "official", null, "verified", 0.02, 6, 1],
 ["v168", "Essendon Tennis Club", "Essendon TC", "Essendon", "official", null, "verified", 0.02, 8, 1],
 ["v169", "Buckley Park Tennis Club", "Buckley Park TC", "Essendon", "official", null, "verified", 0.02, 6, 1],
 ["v170", "Boeing Reserve Tennis Courts", "Boeing Reserve Courts", "Strathmore Heights", "official", null, "verified", 0.02, 2, 1],
 ["v171", "Avondale Heights Tennis Club", "Avondale Heights TC", "Avondale Heights", "official", null, "verified", 0.02, 6, 1],
 ["v172", "Broadmeadows Tennis Club", "Broadmeadows TC", "Broadmeadows", "official", null, "verified", 0.02, 6, 1],
 ["v173", "Craigieburn Tennis Club", "Craigieburn TC", "Craigieburn", "official", null, "verified", 0.02, 8, 1],
 ["v174", "Greenvale Tennis Club", "Greenvale TC", "Greenvale", "official", null, "verified", 0.02, 6, 1],
 ["v175", "Sunbury Tennis Club", "Sunbury TC", "Sunbury", "official", null, "verified", 0.02, 8, 1],
 ["v176", "Templestowe Tennis Club", "Templestowe TC", "Templestowe", "official", null, "verified", 0.02, 8, 1],
 ["v177", "Bulleen Tennis Club", "Bulleen TC", "Bulleen", "official", null, "verified", 0.02, 6, 1],
 ["v178", "Ringwood Tennis Club", "Ringwood TC", "Ringwood", "official", null, "verified", 0.02, 8, 1],
 ["v179", "Croydon Tennis Club", "Croydon TC", "Croydon", "official", null, "verified", 0.02, 8, 1],
 ["v180", "Knox City Tennis Club", "Knox City TC", "Wantirna", "official", null, "verified", 0.02, 10, 1, "Wantirna South", "名录"],
 ["v181", "Berwick Tennis Club", "Berwick TC", "Berwick", "official", null, "verified", 0.02, 8, 1],
 ["v182", "Cranbourne Tennis Club", "Cranbourne TC", "Cranbourne", "official", null, "verified", 0.02, 6, 1],
 ["v183", "Frankston Centenary Tennis Club", "Frankston Centenary TC", "Frankston", "official", null, "verified", 0.02, 12, 1],
 ["v184", "Bruce Park Tennis Club", "Bruce Park TC", "Frankston South", "official", null, "verified", 0.02, 6, 1, "Frankston", "名录"],
 ["v185", "Mount Eliza Tennis Club", "Mount Eliza TC", "Mount Eliza", "official", null, "verified", 0.02, 8, 1],
 ["v186", "Mornington Tennis Club", "Mornington TC", "Mornington", "official", null, "verified", 0.02, 12, 1],
 ["v187", "Dromana Tennis Club", "Dromana TC", "Dromana", "official", null, "verified", 0.02, 4, 1],
 ["v188", "Rosebud Tennis Club", "Rosebud TC", "Rosebud", "official", null, "verified", 0.02, 6, 1],
 ["v189", "Sorrento Tennis Club", "Sorrento TC", "Sorrento", "official", null, "verified", 0.02, 6, 1],
 ["v190", "Bayswater Tennis Club", "Bayswater TC", "Bayswater", "official", null, "verified", 0.02, 0, 1],
 ["v191", "Bayswater North Tennis Club", "Bayswater North TC", "Bayswater North", "official", null, "verified", 0.02, 0, 1],
 ["v192", "Boronia Tennis Club", "Boronia TC", "Boronia", "official", null, "verified", 0.02, 0, 1],
 ["v193", "Currawong Tennis Club", "Currawong TC", "Donvale", "official", null, "verified", 0.02, 0, 1],
 ["v194", "Donvale Tennis Club", "Donvale TC", "Donvale", "official", null, "verified", 0.02, 0, 1],
 ["v195", "East Croydon Kilsyth Tennis Club", "East Croydon Kilsyth TC", "Croydon", "official", null, "verified", 0.02, 0, 1],
 ["v196", "Eildon Park Tennis Club", "Eildon Park TC", "Rowville", "official", null, "verified", 0.02, 0, 1],
 ["v197", "Ferntree Gully Tennis Club", "Ferntree Gully TC", "Ferntree Gully", "official", null, "verified", 0.02, 0, 1],
 ["v198", "Heathmont Tennis Club", "Heathmont TC", "Heathmont", "official", null, "verified", 0.02, 0, 1],
 ["v199", "Kilsyth Tennis Club", "Kilsyth TC", "Kilsyth", "official", null, "verified", 0.02, 0, 1],
 ["v200", "Mountain Gate Tennis Club", "Mountain Gate TC", "Ferntree Gully", "official", null, "verified", 0.02, 0, 1],
 ["v201", "North Ringwood Tennis Club", "North Ringwood TC", "Ringwood", "official", null, "verified", 0.02, 0, 1],
 ["v202", "Park Orchards Tennis Club", "Park Orchards TC", "Park Orchards", "official", null, "verified", 0.02, 0, 1],
 ["v203", "Ringwood Central Tennis Club", "Ringwood Central TC", "Ringwood", "official", null, "verified", 0.02, 0, 1],
 ["v204", "Rowville Tennis Club", "Rowville TC", "Rowville", "official", null, "verified", 0.02, 0, 1],
 ["v205", "St John The Baptist Tennis Club", "St John The Baptist TC", "Ferntree Gully", "official", null, "verified", 0.02, 0, 1],
 ["v206", "Templestowe Park Tennis Club", "Templestowe Park TC", "Templestowe", "official", null, "verified", 0.02, 0, 1],
 ["v207", "Warrandyte Tennis Club", "Warrandyte TC", "Warrandyte", "official", null, "verified", 0.02, 0, 1],
 ["v208", "Wonga Park Tennis Club", "Wonga Park TC", "Wonga Park", "official", null, "verified", 0.02, 0, 1],
 ["v209", "Wantirna Tennis Club", "Wantirna TC", "Wantirna", "official", null, "verified", 0.02, 0, 1],
 ["v210", "Badger Creek Tennis Club", "Badger Creek TC", "", "official", null, "nosub", 0.02, 0, 1],
 ["v211", "Chirnside Park Tennis Club", "Chirnside Park TC", "Chirnside Park", "official", null, "verified", 0.02, 0, 1],
 ["v212", "Coldstream Tennis Club", "Coldstream TC", "Coldstream", "official", null, "verified", 0.02, 0, 1],
 ["v213", "Emerald Tennis Club", "Emerald TC", "Emerald", "official", null, "verified", 0.02, 0, 1],
 ["v214", "Healesville Tennis Club", "Healesville TC", "", "official", null, "nosub", 0.02, 0, 1],
 ["v215", "Lilydale Tennis Club", "Lilydale TC", "Lilydale", "official", null, "verified", 0.02, 0, 1],
 ["v216", "Monbulk Tennis Club", "Monbulk TC", "Monbulk", "official", null, "verified", 0.02, 0, 1],
 ["v217", "Mooroolbark Tennis Club", "Mooroolbark TC", "Mooroolbark", "official", null, "verified", 0.02, 0, 1],
 ["v218", "Mount Evelyn Tennis Club", "Mount Evelyn TC", "Mount Evelyn", "official", null, "verified", 0.02, 0, 1],
 ["v219", "Seville Tennis Club", "Seville TC", "Seville", "official", null, "verified", 0.02, 0, 1],
 ["v220", "Silvan Tennis Club", "Silvan TC", "Silvan", "official", null, "verified", 0.02, 0, 1],
 ["v221", "Upwey Tecoma Tennis Club", "Upwey Tecoma TC", "Tecoma", "official", null, "verified", 0.02, 0, 1],
 ["v222", "Wandin Tennis Club", "Wandin TC", "", "official", null, "nosub", 0.02, 0, 1],
 ["v223", "Yarra Glen Tennis Club", "Yarra Glen TC", "Yarra Glen", "official", null, "verified", 0.02, 0, 1],
 ["v224", "Yarra Junction Tennis Club", "Yarra Junction TC", "Yarra Junction", "official", null, "verified", 0.02, 0, 1],
 ["v225", "Beaconsfield Tennis Club", "Beaconsfield TC", "Beaconsfield", "official", null, "verified", 0.02, 0, 1],
 ["v226", "Cranbourne South Tennis Club", "Cranbourne South TC", "Cranbourne South", "official", null, "verified", 0.02, 0, 1],
 ["v227", "Dandenong Tennis Club", "Dandenong TC", "Dandenong", "official", null, "verified", 0.02, 0, 1],
 ["v228", "Dandenong North Tennis Club", "Dandenong North TC", "Dandenong North", "official", null, "verified", 0.02, 0, 1],
 ["v229", "Dandenong West Tennis Club", "Dandenong West TC", "Dandenong", "official", null, "verified", 0.02, 0, 1],
 ["v230", "Hallam Tennis Club", "Hallam TC", "Hallam", "official", null, "verified", 0.02, 0, 1],
 ["v231", "Hampton Park Tennis Club", "Hampton Park TC", "Hampton Park", "official", null, "verified", 0.02, 0, 1],
 ["v232", "Narre Warren Tennis Club", "Narre Warren TC", "Narre Warren", "official", null, "verified", 0.02, 0, 1],
 ["v233", "Narre Warren North Tennis Club", "Narre Warren North TC", "Narre Warren North", "official", null, "verified", 0.02, 0, 1],
 ["v234", "Noble Park Tennis Club", "Noble Park TC", "Noble Park", "official", null, "verified", 0.02, 0, 1],
 ["v235", "Pearcedale Tennis Club", "Pearcedale TC", "Pearcedale", "official", null, "verified", 0.02, 0, 1],
 ["v236", "Rosswood Tennis Club", "Rosswood TC", "Dandenong North", "official", null, "verified", 0.02, 0, 1],
 ["v237", "Settlers Run Tennis Club", "Settlers Run TC", "Cranbourne South", "official", null, "verified", 0.02, 0, 1],
 ["v238", "Springvale Tennis Club", "Springvale TC", "Springvale", "official", null, "verified", 0.02, 0, 1],
 ["v239", "Carrum Beach Tennis Club", "Carrum Beach TC", "Carrum", "official", null, "verified", 0.02, 0, 1],
 ["v240", "Clarinda Tennis Club", "Clarinda TC", "Clarinda", "official", null, "verified", 0.02, 0, 1],
 ["v241", "Elwood Park Tennis Club", "Elwood Park TC", "Elwood", "official", null, "verified", 0.02, 0, 1],
 ["v242", "Patterson Lakes Tennis Club", "Patterson Lakes TC", "Patterson Lakes", "official", null, "verified", 0.02, 0, 1],
 ["v243", "St Joan of Arc Tennis Club", "St Joan of Arc TC", "Brighton", "official", null, "verified", 0.02, 0, 1],
 ["v244", "St Kilda Park Tennis Club", "St Kilda Park TC", "St Kilda", "official", null, "verified", 0.02, 0, 1],
 ["v245", "Brunswick Park Tennis Club", "Brunswick Park TC", "Brunswick", "official", null, "verified", 0.02, 0, 1],
 ["v246", "Corpus Christi Tennis Club", "Corpus Christi TC", "Glenroy", "official", null, "verified", 0.02, 0, 1],
 ["v247", "Epping North Tennis Club", "Epping North TC", "Epping", "official", null, "verified", 0.02, 0, 1],
 ["v248", "Fitzroy Tennis Club", "Fitzroy TC", "Fitzroy", "official", null, "verified", 0.02, 0, 1],
 ["v249", "Grace Valley Tennis Club", "Grace Valley TC", "Greensborough", "official", null, "verified", 0.02, 0, 1],
 ["v250", "Karingal Drive Tennis Club", "Karingal Drive TC", "Greensborough", "official", null, "verified", 0.02, 0, 1],
 ["v251", "Merlynston Tennis Club", "Merlynston TC", "Coburg North", "official", null, "verified", 0.02, 0, 1],
 ["v252", "Norris Bank Tennis Club", "Norris Bank TC", "Bundoora", "official", null, "verified", 0.02, 0, 1],
 ["v253", "St James Tennis Club", "St James TC", "Brighton", "official", null, "verified", 0.04, 4, 1],
 ["v254", "Thomastown Tennis Club", "Thomastown TC", "Thomastown", "official", null, "verified", 0.02, 0, 1],
 ["v255", "West Lalor Tennis Club", "West Lalor TC", "Lalor", "official", null, "verified", 0.02, 0, 1],
 ["v256", "Whittlesea Tennis Club", "Whittlesea TC", "Whittlesea", "official", null, "verified", 0.02, 0, 1],
 ["v257", "Bulla Tennis Club", "Bulla TC", "Bulla", "official", null, "verified", 0.02, 0, 1],
 ["v258", "Diamond Creek Tennis Club", "Diamond Creek TC", "Diamond Creek", "official", null, "verified", 0.02, 0, 1],
 ["v259", "Eltham Tennis Club", "Eltham TC", "Eltham", "official", null, "verified", 0.02, 0, 1],
 ["v260", "Gladstone Park Tennis Club", "Gladstone Park TC", "Gladstone Park", "official", null, "verified", 0.02, 0, 1],
 ["v261", "Hurstbridge Tennis Club", "Hurstbridge TC", "Hurstbridge", "official", null, "verified", 0.02, 0, 1],
 ["v262", "Keilor East Tennis Club", "Keilor East TC", "Keilor East", "official", null, "verified", 0.02, 0, 1],
 ["v263", "Mickleham Tennis Club", "Mickleham TC", "Mickleham", "official", null, "verified", 0.02, 0, 1],
 ["v264", "Overnewton Tennis Club", "Overnewton TC", "Keilor", "official", null, "verified", 0.02, 0, 1],
 ["v265", "Research Tennis Club", "Research TC", "Research", "official", null, "verified", 0.02, 0, 1],
 ["v266", "St Peter's Parish Tennis Club", "St Peter's Parish TC", "Keilor East", "official", null, "verified", 0.02, 0, 1],
 ["v267", "Westmeadows Tennis Club", "Westmeadows TC", "Westmeadows", "official", null, "verified", 0.02, 0, 1],
 ["v268", "Yarrambat Tennis Club", "Yarrambat TC", "Yarrambat", "official", null, "verified", 0.02, 0, 1],
 ["v269", "Altona North Tennis Club", "Altona North TC", "Altona North", "official", null, "verified", 0.02, 0, 1],
 ["v270", "Albion Tennis Club", "Albion TC", "Albion", "official", null, "verified", 0.02, 0, 1],
 ["v271", "Cambridge Tennis Club", "Cambridge TC", "Hoppers Crossing", "official", null, "verified", 0.02, 0, 1],
 ["v272", "Deer Park Tennis Club", "Deer Park TC", "Deer Park", "official", null, "verified", 0.02, 0, 1],
 ["v273", "Derrimut Tennis Club", "Derrimut TC", "Derrimut", "official", null, "verified", 0.02, 0, 1],
 ["v274", "Werribee Centrals Tennis Club", "Werribee Centrals TC", "Werribee", "official", null, "verified", 0.02, 0, 1],
 ["v275", "Balnarring Tennis Club", "Balnarring TC", "Balnarring", "official", null, "verified", 0.02, 0, 1],
 ["v276", "Baxter Tennis Club", "Baxter TC", "Baxter", "official", null, "verified", 0.02, 0, 1],
 ["v277", "Belvedere Park Tennis Club", "Belvedere Park TC", "Seaford", "official", null, "verified", 0.02, 0, 1],
 ["v278", "Carrum Downs Tennis Club", "Carrum Downs TC", "Carrum Downs", "official", null, "verified", 0.02, 0, 1],
 ["v279", "Crib Point Tennis Club", "Crib Point TC", "Crib Point", "official", null, "verified", 0.02, 0, 1],
 ["v280", "Flinders Tennis Club", "Flinders TC", "Flinders", "official", null, "verified", 0.02, 0, 1],
 ["v281", "Hastings Tennis Club", "Hastings TC", "Hastings", "official", null, "verified", 0.02, 0, 1],
 ["v282", "Karingal Tennis Club", "Karingal TC", "Frankston", "official", null, "verified", 0.02, 0, 1],
 ["v283", "Main Ridge Tennis Club", "Main Ridge TC", "Main Ridge", "official", null, "verified", 0.02, 0, 1],
 ["v284", "Mount Martha Tennis Club", "Mount Martha TC", "Mount Martha", "official", null, "verified", 0.02, 0, 1],
 ["v285", "Overport Park Tennis Club", "Overport Park TC", "Frankston South", "official", null, "verified", 0.02, 0, 1],
 ["v286", "Peninsula Tennis Club", "Peninsula TC", "", "official", null, "nosub", 0.02, 0, 1],
 ["v287", "Ranelagh Club", "Ranelagh Club", "Mount Eliza", "official", null, "verified", 0.02, 0, 1],
 ["v288", "Rye Tennis Club", "Rye TC", "Rye", "official", null, "verified", 0.02, 0, 1],
 ["v289", "Somers Tennis Club", "Somers TC", "Somers", "official", null, "verified", 0.02, 0, 1],
 ["v290", "Tyabb Tennis Club", "Tyabb TC", "Tyabb", "official", null, "verified", 0.02, 0, 1],
 ["v291", "Yamala Park Tennis Club", "Yamala Park TC", "Frankston South", "official", null, "verified", 0.02, 0, 1],
 ["v292", "Avenel Tennis Club", "Avenel TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v293", "Bacchus Marsh Tennis Club", "Bacchus Marsh TC", "Bacchus Marsh", "official", null, "verified", 0.02, 0, 1],
 ["v294", "Ballan Tennis Club", "Ballan TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v295", "Diggers Rest Tennis Club", "Diggers Rest TC", "Diggers Rest", "official", null, "verified", 0.02, 0, 1],
 ["v296", "Melton South Tennis Club", "Melton South TC", "Melton South", "official", null, "verified", 0.02, 0, 1],
 ["v297", "Melton Central Tennis Club", "Melton Central TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v298", "Macedon Tennis Club", "Macedon TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v299", "Riddells Creek Tennis Club", "Riddells Creek TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v300", "Romsey Tennis Club", "Romsey TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v301", "Toolern Vale Tennis Club", "Toolern Vale TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v302", "Wallan Tennis Club", "Wallan TC", "", "official", null, "outside", 0.02, 0, 1],
 ["v303", "Woodend Tennis Club", "Woodend TC", "", "official", null, "outside", 0.02, 0, 1]];
const VPC={"Glen Iris": "3146", "Malvern": "3144", "Malvern East": "3145", "Hawthorn": "3122", "South Yarra": "3141", "Kooyong": "3144", "Camberwell": "3124", "Melbourne CBD": "3000", "Mount Waverley": "3149", "Glen Waverley": "3150", "Wheelers Hill": "3150", "Mulgrave": "3170", "Box Hill": "3128", "Box Hill South": "3128", "Box Hill North": "3129", "Blackburn": "3130", "Burwood": "3125", "Burwood East": "3151", "Ashburton": "3147", "Canterbury": "3126", "Surrey Hills": "3127", "Balwyn": "3103", "Balwyn North": "3104", "Kew": "3101", "Doncaster": "3108", "Toorak": "3142", "Armadale": "3143", "Prahran": "3181", "Albert Park": "3206", "Middle Park": "3206", "St Kilda": "3182", "Caulfield North": "3161", "Caulfield South": "3162", "Carnegie": "3163", "Murrumbeena": "3163", "Oakleigh": "3166", "Chadstone": "3148", "Clayton": "3168", "Bentleigh": "3204", "Brighton": "3186", "Carlton North": "3054", "West Melbourne": "3003", "Parkville": "3052", "Carlton": "3053", "Kensington": "3031", "Fitzroy North": "3068", "Richmond": "3121", "Clifton Hill": "3068", "Abbotsford": "3067", "East Melbourne": "3002", "Hawthorn East": "3123", "Blackburn North": "3130", "Blackburn South": "3130", "Nunawading": "3131", "Bentleigh East": "3165", "Caulfield": "3162", "Brighton East": "3187", "Sandringham": "3191", "Hampton": "3188", "Beaumaris": "3193", "Black Rock": "3193", "Mentone": "3194", "Mordialloc": "3195", "Parkdale": "3195", "Aspendale": "3195", "Edithvale": "3196", "Chelsea": "3196", "Carrum": "3197", "Dingley Village": "3172", "Northcote": "3070", "Preston": "3072", "Reservoir": "3073", "Kingsbury": "3083", "Brunswick": "3056", "Coburg": "3058", "Pascoe Vale": "3044", "Glenroy": "3046", "Ivanhoe": "3079", "Eaglemont": "3084", "Heidelberg": "3084", "Macleod": "3085", "Rosanna": "3084", "Bundoora": "3083", "Epping": "3076", "Mill Park": "3082", "Lalor": "3075", "Footscray": "3011", "Yarraville": "3013", "Williamstown": "3016", "Altona": "3018", "Altona Meadows": "3028", "Point Cook": "3030", "Hoppers Crossing": "3029", "Werribee": "3030", "Sunshine": "3020", "Keilor": "3036", "St Albans": "3021", "Taylors Lakes": "3038", "Essendon": "3040", "Strathmore Heights": "3041", "Avondale Heights": "3034", "Broadmeadows": "3047", "Craigieburn": "3064", "Greenvale": "3059", "Sunbury": "3429", "Templestowe": "3106", "Bulleen": "3105", "Ringwood": "3134", "Croydon": "3136", "Wantirna": "3152", "Berwick": "3806", "Cranbourne": "3977", "Frankston": "3199", "Frankston South": "3199", "Mount Eliza": "3930", "Mornington": "3931", "Dromana": "3936", "Rosebud": "3939", "Sorrento": "3943", "Bayswater": "3153", "Bayswater North": "3153", "Boronia": "3155", "Donvale": "3111", "Rowville": "3178", "Ferntree Gully": "3156", "Heathmont": "3135", "Kilsyth": "3137", "Park Orchards": "3114", "Warrandyte": "3113", "Wonga Park": "3115", "Chirnside Park": "3116", "Coldstream": "3770", "Emerald": "3782", "Lilydale": "3140", "Monbulk": "3793", "Mooroolbark": "3138", "Mount Evelyn": "3796", "Seville": "3139", "Silvan": "3795", "Tecoma": "3160", "Yarra Glen": "3775", "Yarra Junction": "3797", "Beaconsfield": "3807", "Cranbourne South": "3977", "Dandenong": "3175", "Dandenong North": "3175", "Hallam": "3803", "Hampton Park": "3976", "Narre Warren": "3805", "Narre Warren North": "3804", "Noble Park": "3174", "Pearcedale": "3912", "Springvale": "3171", "Clarinda": "3169", "Elwood": "3184", "Patterson Lakes": "3197", "Fitzroy": "3065", "Greensborough": "3088", "Coburg North": "3058", "Thomastown": "3074", "Whittlesea": "3757", "Bulla": "3428", "Diamond Creek": "3089", "Eltham": "3095", "Gladstone Park": "3043", "Hurstbridge": "3099", "Keilor East": "3033", "Mickleham": "3064", "Research": "3095", "Westmeadows": "3049", "Yarrambat": "3091", "Altona North": "3025", "Albion": "3020", "Deer Park": "3023", "Derrimut": "3026", "Balnarring": "3926", "Baxter": "3911", "Seaford": "3198", "Carrum Downs": "3201", "Crib Point": "3919", "Flinders": "3929", "Hastings": "3915", "Main Ridge": "3928", "Mount Martha": "3934", "Rye": "3941", "Somers": "3927", "Tyabb": "3913", "Bacchus Marsh": "3340", "Diggers Rest": "3427", "Melton South": "3338", "Wantirna South": "3152", "Ivanhoe East": "3079"};
const NAMES=['Han L.','Jason W.','Grace L.','Tom W.','Mia C.','Alex M.','Sarah L.','Chris T.','Leo Z.','Amy Q.','Kevin H.','Lily S.','Eric Y.','Nina P.','Ryan G.','Zoe X.','Ben K.','Ivy D.','Oscar F.','Cathy M.','David N.','Emma R.','Frank J.','Gina O.','Henry B.','Iris T.','Jack V.','Kate U.','Luke E.','Mandy A.','Nick I.','Olive W.','Peter Y.','Queenie Z.','Rose H.','Sam C.','Tina L.','Victor S.','Wendy G.','Yuki M.'];
const SRC=[['share','球局分享链接'],['card','球员卡二维码'],['xhs','小红书'],['wechat','微信群'],['search','搜索'],['direct','直接访问']];
const SRCW=[30,14,22,20,6,8];

/* ---------------- 90 天历史 ---------------- */
const LAUNCH=158;  // 上线以来的天数（原型用；上线后取第一条事件的日期）
// HIST：只保留日期行；数字一律由数据层汇总 B3.ROLL 提供（core3b 用 getter 接管）。这里的生成保留，只为不改变其他演示内容用到的随机序列
const HIST=[];(function(){for(let i=-LAUNCH;i<=0;i++){const d=dayAt(i),wd=d.getDay(),g=Math.pow((i+LAUNCH+1)/(LAUNCH+1),1.35),season=(wd===0||wd===6)?1.32:wd===3?1.06:wd===5?.94:1,
  noise=.9+rnd()*.2,dau=Math.round((45+585*g)*season*noise),nu=Math.round(dau*(.05+rnd()*.03)),games=Math.round(dau*(.1+rnd()*.03)*(season>1.2?1.15:1)),apps=Math.round(games*(2.1+rnd()*.5)),
  appr=Math.round(apps*(.58+rnd()*.08)),fill=.64+rnd()*.12+g*.04,msgs=Math.round(dau*(1.2+rnd()*.5)),inv=Math.round(dau*(.04+rnd()*.025)),shares=Math.round(dau*(.08+rnd()*.04)),sessions=Math.round(dau*(1.7+rnd()*.3)),visitors=Math.round(dau*(2.4+rnd()*.5));
  HIST.push({d,dau,nu,games,apps,applicants:Math.round(apps*(.68+rnd()*.06)),appr,fill,msgs,inv,shares,sessions,visitors,noshow:.03+rnd()*.025})}})();
// 今天按小时进度只显示一部分，并随实时事件增长
const hourShape=h=>[.1,.05,.03,.02,.03,.08,.35,.7,.75,.55,.45,.45,.5,.45,.4,.45,.6,.85,1,.95,.8,.6,.4,.2][h];
const T=HIST[HIST.length-1];
const Y=HIST[HIST.length-2];
/* ---------------- 用户 ---------------- */
const USERS=NAMES.map((n,i)=>{const sub=pick(SUBURBS.map(s=>s[0]),SUBURBS.map(s=>s[1])),utr=+(1.5+rnd()*8.5).toFixed(1),played=Math.round(rnd()*rnd()*120)+1;
  return {id:'u'+(i+1),no:i===0?1:Math.round(2+rnd()*2400),name:n,sub,utr,lv:Math.min(5,1+Math.floor(played/22)),played,hosted:Math.round(played*rnd()*.6),att:.82+rnd()*.18,
  last:Math.round(rnd()*rnd()*96*60),src:pick(SRC,SRCW),col:COLORS[i%8][2],hosted7:Math.round(rnd()*rnd()*6),applied7:Math.round(rnd()*7),inv7:Math.round(rnd()*rnd()*5),imp7:Math.round(rnd()*9),days7:1+Math.floor(rnd()*7),
  status:i===23?'suspended':'ok',spark:Array.from({length:14},()=>Math.round(rnd()*rnd()*9))}});
USERS.forEach(u=>u.score=u.hosted7*3+u.applied7*2+u.inv7*2+u.imp7+u.days7);

/* ---------------- 状态 ---------------- */
const S={page:'overview',range:7,plat:'all',metric:'dau',pending:VENUES.filter(v=>v[6]==='pending').length,
  reports:[
    {id:'r1',who:'Grace L.',target:'Kevin H.',type:'用户',src:'in_app',via:'card',rc:'no_show',note:'周六的局没来，也没提前说',at:'2 小时前',status:'open'},
    {id:'r2',who:'Amy Q.',target:'「周六早上女生局」',type:'球局',src:'email',rc:'gender_fake',note:'疑似冒用女生身份申请',at:'5 小时前',status:'open'},
    {id:'r3',who:'Tom W.',target:'Ryan G.',type:'用户',src:'in_app',via:'chat',rc:'other',note:'私信里推销课程',at:'昨天 21:40',status:'open'},
    {id:'r4',who:'Lily C.',target:'「周四晚上双打」聊天',type:'球局',src:'in_app',via:'chat',rc:'harass',note:null,at:'昨天 19:05',status:'open'},
  ],
  audit:[['Han','venue.approve','Albert Reserve TC','昨天 18:02'],['Amy','report.dismiss','#r0 重复举报','昨天 11:20'],['Han','data.export','近 30 天球局（不含用户 ID）','10/1 09:12'],['Amy','venue.merge','Malvern TC 2 → Malvern TC','9/30 16:45'],['Leo','login','—','9/30 09:03']],
  feed:[],live:{online:0}};
const PF=()=>S.plat==='all'?1:S.plat==='pwa'?PSPLIT.dau:1-PSPLIT.dau   // 只用于演示的「实时在线」;
const RANGES=[[1,'今天'],[7,'7 天'],[30,'30 天'],[90,'90 天'],[LAUNCH,'全部']];
// 7 / 30 / 90 天只算已经过完的整天（不含今天），避免今天只过了一半把均值拉低
const inRange=()=>S.range===1?[T]:HIST.slice(-S.range-1,-1);
const prevRange=()=>S.range===1?[Y]:HIST.slice(-2*S.range-1,-S.range-1);
const sum=(arr,k)=>arr.reduce((a,x)=>a+x[k],0);
const avg=(arr,k)=>arr.length?sum(arr,k)/arr.length:0;

/* ---------------- 提示框 ---------------- */
const tip=$('#tip');
function showTip(e,v,l){tip.innerHTML='';const b=document.createElement('b');b.textContent=v;const s=document.createElement('span');s.textContent=l;tip.append(b,s);tip.style.opacity=1;
  const x=Math.min(innerWidth-tip.offsetWidth-12,e.clientX+14),y=Math.max(8,e.clientY-tip.offsetHeight-10);tip.style.left=x+'px';tip.style.top=y+'px'}
const hideTip=()=>tip.style.opacity=0;
document.addEventListener('pointermove',e=>{const t=e.target.closest('[data-tv]');if(t)showTip(e,t.dataset.tv,t.dataset.tl||'');else if(!e.target.closest('.lc'))hideTip()});

/* ---------------- 图表 ---------------- */
function spark(vals){const w=120,h=30,mx=Math.max(...vals,1),mn=Math.min(...vals),pts=vals.map((v,i)=>[i/(vals.length-1)*w,h-3-(v-mn)/((mx-mn)||1)*(h-8)]);
  return `<svg class="sp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--g)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`}
function lineChart(el,pts,label,fmtv,partial){const W=el.clientWidth||700,H=250,L=44,R=12,Tp=12,B=26,n=pts.length,mx=Math.max(...pts.map(p=>p[1]))*1.12||1;
  const nice=(()=>{const s=Math.pow(10,Math.floor(Math.log10(mx/4)));const st=[1,2,2.5,5,10].map(k=>k*s).find(k=>mx/k<=5);return st})();const top=Math.ceil(mx/nice)*nice;
  const X=i=>L+(n<2?.5:i/(n-1))*(W-L-R),Yv=v=>Tp+(1-v/top)*(H-Tp-B);
  let g='';for(let v=0;v<=top+1e-9;v+=nice){g+=`<line x1="${L}" x2="${W-R}" y1="${Yv(v)}" y2="${Yv(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${Yv(v)+4}" text-anchor="end" font-size="11" fill="var(--mut)">${fmtv(v)}</text>`}
  const step=Math.max(1,Math.ceil(n/7));let xl='';pts.forEach((p,i)=>{if(i%step===0||i===n-1)xl+=`<text x="${X(i)}" y="${H-6}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}" font-size="11" fill="var(--mut)">${p[0]}</text>`});
  const path=pts.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Yv(p[1]).toFixed(1)}`).join(''),solid=partial?pts.slice(0,-1).map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Yv(p[1]).toFixed(1)}`).join(''):path;
  el.innerHTML=`<svg class="lc" width="${W}" height="${H}" style="display:block;touch-action:none"><defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--g)" stop-opacity=".16"/><stop offset="1" stop-color="var(--g)" stop-opacity="0"/></linearGradient></defs>${g}
    <path d="${path}L${X(n-1)} ${Yv(0)}L${X(0)} ${Yv(0)}Z" fill="url(#ag)"/><path d="${solid}" fill="none" stroke="var(--g)" stroke-width="2" stroke-linejoin="round"/>${partial?`<path d="M${X(n-2)} ${Yv(pts[n-2][1])}L${X(n-1)} ${Yv(pts[n-1][1])}" fill="none" stroke="var(--g)" stroke-width="2" stroke-dasharray="4 4"/><circle cx="${X(n-1)}" cy="${Yv(pts[n-1][1])}" r="3.5" fill="var(--sf)" stroke="var(--g)" stroke-width="2"/><text x="${X(n-1)-6}" y="${Yv(pts[n-1][1])-10}" text-anchor="end" font-size="11" fill="var(--mut)">今天（截至现在）</text>`:''}${xl}
    <line id="xh" y1="${Tp}" y2="${H-B}" stroke="var(--ink)" stroke-opacity=".35" stroke-width="1" style="display:none"/><circle id="xd" r="4.5" fill="var(--g)" stroke="var(--sf)" stroke-width="2" style="display:none"/>
    <rect x="${L}" y="0" width="${W-L-R}" height="${H}" fill="transparent" id="hit"/></svg>`;
  const svg=el.querySelector('svg'),xh=svg.querySelector('#xh'),xd=svg.querySelector('#xd');
  svg.querySelector('#hit').addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),x=e.clientX-r.left,i=Math.max(0,Math.min(n-1,Math.round((x-L)/(W-L-R)*(n-1))));
    xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));xh.style.display='';xd.setAttribute('cx',X(i));xd.setAttribute('cy',Yv(pts[i][1]));xd.style.display='';showTip(e,fmtv(pts[i][1],1),`${pts[i][2]||pts[i][0]} · ${label}`)});
  svg.querySelector('#hit').addEventListener('pointerleave',()=>{xh.style.display='none';xd.style.display='none';hideTip()})}
function barsH(rows,o={}){const mx=Math.max(...rows.map(r=>r.v),1);
  return `<div class="bars" style="--lw:${o.lw||96}px">${rows.map(r=>`<div class="bar" data-tv="${o.fv?o.fv(r.v):fmt(r.v)}" data-tl="${esc(r.n)}${r.sub?' · '+esc(r.sub):''}"><span class="n">${r.sw?`<i class="sw" style="background:${r.sw}"></i>`:''}${esc(r.n)}</span><span class="t"><i style="width:${(r.v/mx*100).toFixed(1)}%;${r.c?`background:${r.c}`:''}"></i></span><span class="v num">${o.fv?o.fv(r.v):fmt(r.v)}</span></div>`).join('')}</div>`}
function share(names,w,total){const s=w.reduce((a,b)=>a+b,0);return names.map((n,i)=>({...n,v:Math.round(total*w[i]/s*(.9+rnd()*.2))})).sort((a,b)=>b.v-a.v)}

/* ---------------- 导航 ---------------- */
const IC={
 overview:'<path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6"/>',
 games:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6.5a9 9 0 0 1 0 11M18 6.5a9 9 0 0 0 0 11"/>',
 venues:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 cards:'<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="3.2"/><path d="M8.5 16.5h7"/>',
 growth:'<path d="M4 19 10 13l4 4 6-8"/><path d="M15 9h5v5"/>',
 review:'<path d="M9 12l2 2 4-4"/><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/>',
 events:'<path d="M5 4h14M5 9h14M5 14h9M5 19h6"/>',
 platform:'<rect x="2.5" y="5" width="13" height="10" rx="1.5"/><path d="M6 19h6M9 15v4"/><rect x="16.5" y="8" width="5" height="11" rx="1.2"/>',
 env:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
 traffic:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
 safety:'<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M12 8v5M12 16.5v.5"/>',
 regions:'<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
 cities:'<path d="M3 21h18M5 21V9l5-3v15M10 21V4l9 4v13"/><path d="M13 10h3M13 14h3M7 12h1M7 16h1"/>',
 admin:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M19 4l1.5 1.5L23 3"/>',
};
const PAGES=[['h','总览'],['overview','概览'],['h','球友'],['users','球友'],['cards','球员卡'],['h','约球'],['games','球局'],['venues','球场'],['regions','区域'],['h','来源与使用'],['traffic','访问与页面'],['growth','分享与拉新'],['platform','手机与电脑'],['env','打开方式'],['h','管理'],['review','待审核'],['safety','风险用户'],['cities','城市'],['admin','管理员'],['events','数据口径']];
document.addEventListener('click',e=>{const b=e.target.closest('[data-pg],[data-rg],[data-pl],[data-mt],[data-act],[data-tab2]');if(!b)return;const d=b.dataset;
  if(d.pg){S.page=d.pg;scrollTo(0,0)}if(d.rg)S.range=+d.rg;if(d.pl)S.plat=d.pl;if(d.mt)S.metric=d.mt;if(d.tab2)S.tab2=d.tab2;if(d.act)return act(d);render()});

/* ---------------- 页面：概览 ---------------- */
const METRICS=[['dau','活跃用户',v=>fmt(v)],['nu','新注册',v=>fmt(v)],['games','新球局',v=>fmt(v)],['apps','申请加入（次数）',v=>fmt(v)],['applicants','申请人数',v=>fmt(v)],['msgs','消息',v=>fmt(v)]];
const av=u=>`<span class="a" style="background:${u.col}">${esc(u.name[0])}</span>`;
function feedHTML(){return S.feed.slice(0,9).map(f=>`<div class="ev"><time class="num">${f.t}</time><div>${f.h}</div></div>`).join('')||'<div class="empty">等待新的动态…</div>'}
function userTable(list,compact){return `<table><thead><tr><th>球友</th><th>区域</th><th class="r">UTR</th>${compact?'':'<th>等级</th><th class="r">场次</th>'}<th class="r">发起</th><th class="r">申请</th>${compact?'':'<th class="r">赴约率</th><th>来源</th>'}<th class="r">近 14 天</th><th class="r">活跃分</th>${compact?'':'<th>最近活跃</th><th>状态</th>'}</tr></thead><tbody>
  ${list.map(u=>`<tr><td><div class="who">${av(u)}<div><b>${esc(u.name)}</b><small class="num">#${String(u.no).padStart(4,'0')}</small></div></div></td><td>${esc(u.sub)}</td><td class="r num">${(+u.utr).toFixed(1)}</td>${compact?'':`<td>Lv${u.lv}</td><td class="r num">${u.played}</td>`}<td class="r num">${u.hosted7}</td><td class="r num">${u.applied7}</td>${compact?'':`<td class="r num">${pct(u.att)}</td><td>${u.src[1]}</td>`}
  <td class="r" style="width:110px">${spark(u.spark)}</td><td class="r num"><b>${u.score}</b></td>${compact?'':`<td>${u.last<60?u.last+' 分钟前':u.last<1440?Math.round(u.last/60)+' 小时前':Math.round(u.last/1440)+' 天前'}</td><td>${u.status==='ok'?'<span class="pill g">正常</span>':'<span class="pill c">已暂停</span>'}</td>`}</tr>`).join('')}</tbody></table>`}

/* ---------------- 页面：用户 ---------------- */

/* ---------------- 页面：球局与区域 ---------------- */

/* ---------------- 页面：球场 ---------------- */

/* ---------------- 页面：球员卡 ---------------- */

/* ---------------- 页面：分享与增长 ---------------- */

/* ---------------- 页面：审核 ---------------- */
function act(d){const v=VENUES.find(x=>x[0]===d.id),r=S.reports.find(x=>x.id===d.id),now=`今天 ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  if(d.act==='vok'){v[6]='verified';S.audit.unshift(['Han','venue.approve',v[2],now])}
  if(d.act==='vno'){v[6]='rejected';S.audit.unshift(['Han','venue.reject',v[2],now])}
  if(d.act==='vmerge'){v[6]='merged';S.audit.unshift(['Han','venue.merge',v[2]+' → 附近已有球场',now])}
  if(d.act==='rk'){const r=RISK[+d.i];r.st=d.s;const uu=USERS.find(x=>x.id===r.uid);if(uu&&['limited','suspended'].includes(d.s)){uu.st=d.s;uu.hist.unshift({st:d.s,why:'风险分 '+r.score,by:'Han',at:'刚刚'})}if(uu&&d.s==='cleared'&&uu.st!=='banned'){uu.st='active'}S.audit.unshift(['Han','risk.'+d.s,r.u,now])}
  if(d.act==='rok'){r.status='actioned';S.audit.unshift(['Han','report.action',r.target,now])}
  if(d.act==='rno'){r.status='dismissed';S.audit.unshift(['Han','report.dismiss',r.target,now])}
  S.pending=VENUES.filter(x=>x[6]==='pending').length;render()}

/* 举报原因（与 schema reports.reason、前台 REP_REASONS 一致）：前 5 个是站内举报可选的；后 3 个只在管理员录入邮件举报时使用 */
const REP_RC={pact_violation:'违反球友约定',harass:'骚扰或不当言行',no_show:'爽约',fake_profile:'冒用身份',other:'其他',gender_fake:'冒用女生身份',rude:'态度不好',spam:'广告 / 推销'};
const REP_SRC=r=>r.src==='email'?'邮件录入':r.via==='chat'?'站内 · 聊天':'站内 · 球员卡';
/* ---------------- 页面：埋点字典 ---------------- */
const EVDEF=[];   // 事件字典见文件末尾 B1_EVENTS（唯一来源）

/* ---------------- 页面：账号与权限 ---------------- */
// 系统状态（5d）：与数据库 monitor_thresholds 逐条相同（代码 · 区域 · 名称 · 警告 · 严重）；真实环境读 monitor_checks()，这里是演示值
const MON_CHECKS=[["jobs_stale","系统","定时任务没在跑",1,1],["notif_backlog","系统","提醒积压",1,20],["push_fail_rate","系统","推送失败率",0.1,0.3],["email_bounce","系统","邮件退信率",0.05,0.1],["email_failed","系统","邮件发送失败",5,20],["otp_fail","系统","验证码输错激增",50,200],["rate_hit_spike","系统","频率限制触发激增",3,10],["client_errors","系统","页面报错",3,10],["db_connections","系统","数据库连接数",0.8,0.95],["long_queries","系统","慢查询",1,5],["restore_drill","系统","恢复演练",35,60],["fill_rate_drop","业务","人齐率骤降",0.7,0.5],["signup_drop","业务","新注册骤降",0.5,0.25],["reports_spike","业务","举报激增",3,10],["expiry_rate","业务","申请失效率",0.4,0.6],["sender_stale","系统","发送程序没在跑",10,30]];
const MON_DEMO={"jobs_stale":0,"notif_backlog":0,"push_fail_rate":0.021,"email_bounce":0.008,"email_failed":0,"otp_fail":6,"rate_hit_spike":1.2,"client_errors":0.8,"db_connections":0.18,"long_queries":0,"restore_drill":12,"fill_rate_drop":0.97,"signup_drop":1.08,"reports_spike":0.9,"expiry_rate":0.14,"sender_stale":0.3};
const MON_LOW=new Set(['fill_rate_drop','signup_drop']),MON_PCT=new Set(['push_fail_rate','email_bounce','db_connections','expiry_rate']),MON_X=new Set(['rate_hit_spike','client_errors','reports_spike','fill_rate_drop','signup_drop']);
const monFmt=(c,v)=>v==null?'—':MON_PCT.has(c)?(v*100).toFixed(1)+'%':MON_X.has(c)?(c==='fill_rate_drop'||c==='signup_drop'?(v*100).toFixed(0)+'%':'×'+(+v).toFixed(1)):c==='restore_drill'?v+' 天前':c==='sender_stale'?v+' 分钟前':String(v);
const monLv=(c,v,w,cr)=>v==null?'ok':MON_LOW.has(c)?(cr!=null&&v<=cr?'crit':v<=w?'warn':'ok'):(cr!=null&&v>=cr?'crit':v>=w?'warn':'ok');
function monCard(){const rows=MON_CHECKS.map(([c,a,l,w,cr])=>{const v=MON_DEMO[c],lv=monLv(c,v,w,cr);return {c,a,l,w,cr,v,lv}}),bad=rows.filter(r=>r.lv!=='ok');
  const dot=lv=>`<span class="pill ${lv==='ok'?'g':lv==='warn'?'w':'c'}">${lv==='ok'?'正常':lv==='warn'?'警告':'严重'}</span>`;
  return `<div class="card"><div class="ch"><b>系统状态</b><small>每 5 分钟检查 16 项 · 有警告 / 严重时发邮件给超级管理员 · 处理办法见《出事处理手册》</small></div>
  <p class="cap" style="margin:0 0 8px">${bad.length?`<b style="color:var(--crit)">${bad.length} 项需要处理</b>`:'全部正常'} · 演示数据</p>
  <table><thead><tr><th>状态</th><th>项目</th><th class="r">现在</th><th class="r">警告 / 严重</th></tr></thead><tbody>${['系统','业务'].map(a=>`<tr><td colspan="4" style="color:var(--mut);font-size:12px;padding-top:12px">${a}</td></tr>`+rows.filter(r=>r.a===a).map(r=>`<tr><td>${dot(r.lv)}</td><td>${esc(r.l)}</td><td class="r num">${monFmt(r.c,r.v)}</td><td class="r" style="color:var(--mut)">${monFmt(r.c,r.w)}${r.cr!=null?' / '+monFmt(r.c,r.cr):''}</td></tr>`).join('')).join('')}</tbody></table></div>`}
function pageAdmin(){const AD=[['Han','han@nanbanqiu.app','owner',''],['备用 owner','[待定]','owner','你不在时处理紧急情况、能恢复你的账号'],['Amy','amy@nanbanqiu.app','operator','示例 · 以后按需添加'],['Leo','leo@nanbanqiu.app','viewer','示例 · 以后按需添加']];   // 第 5 项：负责的城市（空 = 全部）
  const owners=AD.filter(a=>a[2]==='owner').length,ck=ok=>ok?'<span style="color:var(--g)">✓</span>':'<span style="color:var(--line)">—</span>';
  return `<div class="grid g12"><div class="card"><div class="ch"><b>管理员</b><div class="r"><button class="btn sm" data-adm="invite">邀请管理员</button></div></div><table><tbody>
  ${AD.map(a=>`<tr><td><div class="who"><span class="a" style="background:var(--g)">${esc(a[0][0])}</span><div><b>${esc(a[0])}</b><small>${esc(a[1])}</small></div></div></td><td><span class="pill nodot">${ROLE_NAME[a[2]]}</span>${a[3]?`<br><small style="color:var(--mut)">${esc(a[3])}</small>`:''}</td><td class="r"><small style="color:var(--mut)">${a[4]?a[4].map(k=>esc((CITY_ADM.find(c=>c.key===k)||{zh:k}).zh)).join('、'):'全部城市'}</small></td></tr>`).join('')}</tbody></table>
  <p style="font-size:12px;color:var(--mut);margin-top:12px">${owners>=2?'超级管理员 2 位 ✓':'<b style="color:var(--crit)">超级管理员少于 2 位</b>：丢了手机和恢复码就进不了后台'} · 登录：邮箱 + 密码 + 两步验证码（或一次性恢复码），连错 5 次锁 15 分钟，12 小时或闲置 1 小时后重新登录。离职立即停用，会话马上失效。运营和只读可以只负责某几个城市：只看到、只能处理这些城市的球友、球局、球场和举报（超级管理员一律全部城市）。</p>
  <div class="ch" style="margin-top:18px"><b>谁能做什么</b><small>与数据库 admin_perms 相同 · ✎ = 必须填理由</small></div>
  <table><thead><tr><th>操作</th><th class="r">超级管理员</th><th class="r">运营</th><th class="r">只读</th></tr></thead><tbody>${ADMIN_PERMS.map(p=>`<tr><td>${esc(p[1])}${p[3]?' <span title="必须填理由">✎</span>':''}</td>${['owner','operator','viewer'].map(r=>`<td class="r">${ck(p[2].includes(r))}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <p style="font-size:12px;color:var(--mut);margin-top:8px">后台不能直接读私信：只有处理举报时能看被举报的那一段对话，要写理由。所有操作和理由都记进操作日志，日志保存 2 年，谁都不能改。</p></div>
  ${admCan('audit.view')?monCard():''}
  ${admCan('audit.view')?`<div class="card" style="grid-column:1/-1"><div class="ch"><b>操作日志</b><small>所有审核、导出、登录、查看手机号和对话都会记录</small></div><table><thead><tr><th>时间</th><th>谁</th><th>操作</th><th>对象</th></tr></thead><tbody>${S.audit.map(a=>`<tr><td>${a[3]}</td><td>${esc(a[0])}</td><td class="mono">${esc(a[1])}</td><td>${esc(a[2])}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`}

/* ---------------- 渲染 ---------------- */
const TITLES=Object.fromEntries(PAGES.filter(p=>p[0]!=='h'));
addEventListener('resize',()=>{clearTimeout(window._rz);window._rz=setTimeout(render,120)});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',render);

/* ---------------- 实时：模拟事件流 ---------------- */
// 演示数据开关：实时动态、在线人数、随机推入待审核的球场都是模拟的。默认开；【上线删除】这一段和 DEMO_LIVE（改为 /admin/api/realtime）
const DEMO_LIVE=true;
// SIM: 上线时替换为 /admin/api/realtime（实时动态和在线人数都是原型里模拟的）
const TPL=[
 [26,()=>{const u=pick(USERS),v=pick(VENUES.filter(x=>x[6]==='verified'));return `<b>${esc(u.name)}</b> 申请加入 ${esc(pick(USERS.filter(x=>x!==u)).name)} 的球局 <small>· ${esc(v[2])}</small>`},'apps'],
 [12,()=>{const u=pick(USERS),v=pick(VENUES.filter(x=>x[6]==='verified'));return `<b>${esc(u.name)}</b> 发起了球局 <small>· ${esc(v[2])} ${pick(['今晚 7:00','明早 8:00','周六 9:00','周日 10:30'])} ${pick(['双打','单打','拉球'])}</small>`},'games'],
 [14,()=>`<b>${esc(pick(USERS.slice(0,20)).name)}</b> 接受了 ${esc(pick(USERS.slice(20)).name)} 的申请`,'appr'],
 [8,()=>`新球友 <b>${esc(pick(['Alice','Bob','Cindy','Dylan','Eason','Fiona','George']))} ${'ABCDEFGHJKLMNPRSTW'[Math.floor(rnd()*18)]}.</b> 注册 <small>· 来自${pick(SRC,SRCW)[1]} · ${pick(SUBURBS.map(s=>s[0]))}</small>`,'nu'],
 [10,()=>`<b>${esc(pick(USERS).name)}</b> 换了一枚印 <small>· ${pick(SEALS,SW)[1]} · ${pick(ANIMALS,AW)[1]}</small>`],
 [7,()=>`<b>${esc(pick(USERS).name)}</b> 把球员卡分享到${pick(['朋友圈','小红书'])}`,'shares'],
 [8,()=>`<b>${esc(pick(USERS).name)}</b> 给 ${esc(pick(USERS.slice(20)).name)} 留了印象 <small>「${pick(IMP_A.map(x=>x[0]))}」</small>`],
 [5,()=>`<b>${esc(pick(USERS.slice(0,20)).name)}</b> 约 ${esc(pick(USERS.slice(20)).name)} 打球 <small>· 1v1 邀约</small>`,'inv'],
 [1,()=>{const n=pick(['Ashburton Park Courts','Gardiner Park Courts','Burwood Tennis Club']);VENUES.push(['v'+(VENUES.length+20),n,n.replace(' Tennis Club',' TC'),pick(['Ashburton','Glen Iris','Burwood']),'user',pick(USERS).name,'pending',.02,3,0]);S.pending++;return `<b>${esc(pick(USERS).name)}</b> 提交了新球场 <small>「${n}」· 待审核</small>`}],
];
// SIM: 上线时替换为 /admin/api/realtime
function tick(){if(!DEMO_LIVE)return;const t=pick(TPL,TPL.map(x=>x[0])),now=new Date();S.feed.unshift({t:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,h:t[1]()});S.feed.length=Math.min(S.feed.length,40);
  const target=Math.round(18+hourShape(now.getHours())*48);S.live.online=Math.max(3,Math.round(S.live.online+(target-S.live.online)*.2+(rnd()-.5)*4));
  const f=$('#feed');if(f)f.innerHTML=feedHTML();const k=$('#kOnline');if(k)k.textContent=fmt(S.live.online*PF());
  if(S.page==='overview'&&S.range===1&&rnd()<.25&&!document.querySelector('.lc:hover'))render();}
// SIM: 上线时替换为 /admin/api/realtime（在线人数初值）
function doLogin(e){e.preventDefault();$('#login').style.display='none';$('#app').style.display='block';S.live.online=DEMO_LIVE?Math.round(18+hourShape(NOW.getHours())*48):0;if(DEMO_LIVE)for(let i=0;i<8;i++)tick();render();clearInterval(window._tk);if(DEMO_LIVE)window._tk=setInterval(tick,2600);S.audit.unshift(['Han','login','—','刚刚']);return false}
function logout(){$('#app').style.display='none';$('#login').style.display='grid';clearInterval(window._tk)}

/* ---------------- 导出 ---------------- */
// CSV 单元格：用户写的文字以 = + - @ 制表符 / 回车开头时前面加 '，防止用 Excel 打开时被当成公式执行（纯数字照常）
const csvCell=c=>{let s=String(c??'');if(typeof c==='string'&&/^[=+\-@\t\r]/.test(s)&&!/^-?\d+(\.\d+)?%?$/.test(s))s="'"+s;return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
function exportCSV(){let rows;
  if(S.page==='venues'||S.page==='review')rows=[['id','name','short','suburb','source','submitted_by','status','type','surfaces','courts','condition','visitor','price_per_hour','annual_fee','booking'],...VENUES.map(v=>{const a=vA(v);return [v[0],v[1],v[2],v[3],v[4],v[5]||'',v[6],a.type,a.surf.join('|'),a.courts,a.cond||'',a.vis||'',a.price??'',a.fee??'',a.book||'']})];
  else if(S.page==='users')rows=[['member_no','name','suburb','utr','level','played','attendance','score_7d','source'],...USERS.map(u=>[u.no,u.name,u.sub,u.utr,u.lv,u.played,u.att.toFixed(2),u.score,u.src[0]])];
  else if(S.page==='cards')rows=[['dim','value','weight'],...ANIMALS.map((a,i)=>['animal',a[0],AW[i]]),...SEALS.map((s,i)=>['seal',s[0],SW[i]]),...COLORS.map((c,i)=>['color',c[0],CW[i]]),...THEMES.map((t,i)=>['theme',t[0],TW[i]])];
  else rows=[['date','dau','new_users','games','applications','approvals','fill_rate','messages','invites','shares'],...inRange().map(x=>[x.d.toLocaleDateString('sv-SE'),x.dau,x.nu,x.games,x.apps,x.appr,x.fill.toFixed(3),x.msgs,x.inv,x.shares])];
  const csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download=`nanbanqiu-${S.page}-${S.range}d.csv`;a.click();
  S.audit.unshift(['Han','data.export',`${TITLES[S.page]} · 近 ${S.range} 天`,'刚刚'])}

