/* =====================================================================
 * 第八批 A1：场边 24h 后台四页（场边数据 · 话题 · 今日推荐排期 · 引导文案）并入正式后台
 *   原设计稿 南伴球_后台_场边.html（第七批，已并入，稿子不再单独维护）。
 *   配置（话题 / 相似词 / 太宽的词 / 规则 / 周历 / 特别安排 / 问题 / 时段 / 设置）的结构 = 数据库 sb_config 第 1 版；
 *   演示数据：统计是模拟的；配置改了只留在页面里。真实环境：读 admin_sb_config_draft()，写 admin_sb_config_set / _discard / _publish / _rollback，
 *   提前放出话题 admin_sb_topic_release；每个写操作带页面上看到的版本号，别人刚发布过 → admin_config_stale。
 *   权限：写操作要 sideline.config（超级管理员、运营）；只读能看，不能改。操作记进操作日志（action = sideline.config）。
 * ===================================================================== */
const SB={tab:'all',topicSort:'posts',courtSort:'posts',edit:null,dirty:0,slot:2,tr:'posts'};

/* ---------- 可配置的内容（与前端 v35 的数据结构一一对应） ---------- */
const SB_TOPICS=[
 {id:'ootd',t:'网球人的OOTD',kind:'常驻',q:'今天穿什么上场？拍一张发上来。',ask:'今天穿什么上场？',fills:['今天这身是','第一次穿网球裙上场，','这双鞋终于到了，'],photo:['穿搭','鞋'],on:true,sug:true},
 {id:'brain',t:'脑子会了，身体没会',kind:'常驻',q:'教学视频看了十遍，手还是不听话。',ask:'今天哪个动作又没跟上？',fills:['看了十遍教学视频，','教练说的我都懂，就是','今天的反手又'],photo:[],on:true,sug:true},
 {id:'dopa',t:'多巴胺太爽了',kind:'常驻',q:'那一拍打出去的时候。',ask:'今天哪一拍最爽？',fills:['今天终于赢了一盘，','第一次发球直接得分，','打了两个小时，'],photo:[],on:true,sug:true},
 {id:'pet',t:'带着宠物去打球',kind:'常驻',q:'来看球的、来捡球的，都算。',ask:'今天带它来了吗？',fills:['今天带狗狗来看球，','它在场边乖乖等了','它捡球比我还积极，'],photo:['宠物'],on:true,sug:true},
 {id:'trip',t:'带着球拍去旅行',kind:'常驻',q:'换一座城市，换一块场。',ask:'这次带球拍去了哪？',fills:['这次旅行带上了球拍，','出门在外也没忘了打球，','找到一块海边的球场，'],photo:['风景'],on:true,sug:true},
 {id:'gear',t:'我的新装备',kind:'常驻',q:'新拍子、新鞋、新手胶，拆开的那一刻。',ask:'最近换了什么装备？',fills:['换了新拍子，','新鞋第一次上场，','纠结了一个月，终于入手了'],photo:['球拍','球包'],on:true,sug:true},
 {id:'spot',t:'宝藏球场',kind:'常驻',q:'人少、灯亮、地面好，悄悄分享。',ask:'最近发现了哪块好场？',fills:['发现一块宝藏球场：','这块场人少，而且','周末不用抢的场：'],photo:['球场'],on:true,sug:true},
 {id:'good',t:'实用网球好物',kind:'常驻',q:'不贵，但真的好用。',ask:'最近离不开的小东西？',fills:['用了就回不去的：','十几块钱买的','球包里一定会带的'],photo:[],on:true,sug:true},
 {id:'sunset',t:'场边的晚霞',kind:'常驻',q:'最后一局，抬头看一眼。',ask:'今天的晚霞……',fills:['打完最后一局，抬头','今天的晚霞','夜场的灯亮起来的时候，'],photo:['晚霞'],on:true,sug:true},
 {id:'love',t:'别人在恋爱，而我在打球',kind:'常驻',q:'周末的约会对象：一块场，一筐球。',ask:'周末和网球约会了吗？',fills:['这个周末的约会对象，是','别人在约会，我在','今天又和球拍待了一下午，'],photo:['影子'],on:true,sug:true},
 {id:'ao',t:'AO来了',kind:'限时',q:'墨尔本的一月，全城都在看球。',ask:'今年去看 AO 了吗？',fills:['今年的 AO，','在场边看到了','回家第一件事是'],photo:[],on:false,sug:true,from:'2027-01-12',to:'2027-02-01'},
 {id:'u2',t:'下班后的夜场',kind:'大家发起',by:'阿杰',q:'',ask:'',fills:[],photo:[],on:true,sug:false,people:41},
 {id:'u1',t:'反手终于开窍了',kind:'大家发起',by:'Yuki',q:'',ask:'',fills:[],photo:[],on:true,sug:false,people:23},
 {id:'u3',t:'第一次打红土',kind:'大家发起',by:'Mia',q:'',ask:'',fills:[],photo:[],on:true,sug:false,people:12},
 {id:'u4',t:'周末夜场',kind:'大家发起',by:'Leo',q:'',ask:'',fills:[],photo:[],on:true,sug:false,people:2,pending:true},
 {id:'u5',t:'雨后的红土',kind:'大家发起',by:'安安',q:'',ask:'',fills:[],photo:[],on:true,sug:false,people:1,pending:true},
];
const SB_ALIAS=[['神仙球场','spot'],['好场','spot'],['穿搭','ootd'],['宠物','pet'],['狗','pet'],['旅行','trip'],['装备','gear'],['好物','good'],['日落','sunset'],['学不会','brain']];
const SB_GENERIC=['网球','墨尔本','打球','运动','日常','tennis','健身','生活'];
const SB_RULES={min:2,max:12,people:3,days:7,sink:30};
const SB_WEEK=[['周一','dopa','周末的余温'],['周二','gear','周末刚买的'],['周三','@hot','大家发起的本周最热'],['周四','spot','为周末找场'],['周五','ootd','周末前的打扮'],['周六','pet','周末带它出门'],['周日','sunset','和 #实用网球好物 隔周轮换']];
const SB_EVENTS=[{id:'ao',from:'2027-01-12',to:'2027-02-01',note:'澳网期间每天推荐，盖过周历'},{id:'',name:'第一场雨后',trig:'天气：雨停 2 小时内',ask:'场地干了吗？',note:'自动，最多一天一次'}];
const SB_GENQ=[{t:'场边有什么新鲜事？',on:true,k:'通用'},{t:'捡到东西了？',on:true,k:'失物招领'}];
const SB_SLOTS=[{n:'早上',f:5,to:11,tp:['brain','gear']},{n:'中午',f:11,to:16,tp:['good','spot']},{n:'傍晚',f:16,to:20,tp:['sunset','dopa']},{n:'晚上',f:20,to:5,tp:['dopa','love']}];
const SB_COURTQ=[{t:'{球场} 现在怎么样？',on:true},{t:'{球场} 有空场吗？',on:true,day:true},{t:'{球场} 的灯亮了吗？',on:true,night:true}];
const SB_COURTF=['{球场} 现在有空场，','{球场} 风好大，','刚下过雨，{球场} 的场地'];
const SB_LOSTF=['在 {球场} 捡到一个','有没有人在 {球场} 看到一个'];
const SB_SET={every:4,hold:4,sugN:3,hlen:12};
const SB_VERS=[['v14','Amy','把周三改成「大家发起的本周最热」','10-24 18:20'],['v13','Han','#脑子会了，身体没会 上线','10-22 11:05'],['v12','Amy','底栏问题：去掉「有拍子要出？」（点进率 0.4%）','10-19 09:40']];

/* ---------- 统计（演示数据，口径见每张卡片下方） ---------- */
const sbK=()=>S.range===1?1/7:S.range===7?1:S.range===30?4.2:9;
const SB_COURTS=[['Kooyong Lawn',212],['Glen Iris Park',188],['Albert Park',121],['National Tennis Centre',104],['Hawthorn',77],['Royal South Yarra',58],['Fawkner Park',41],['Melbourne Park',33]];
const SB_TS=SB_TOPICS.filter(t=>t.kind!=='限时').map((t,i)=>{const base={ootd:262,brain:207,dopa:174,pet:96,trip:58,gear:151,spot:131,good:88,sunset:153,love:186,u2:41,u1:23,u3:12,u4:2,u5:1}[t.id]||10;return {...t,posts:base,people:Math.round(base*.78),balls:Math.round(base*7.4),replies:Math.round(base*1.9),views:Math.round(base*41),grow:{ootd:.18,brain:.42,dopa:.07,pet:.21,trip:.35,gear:-.04,spot:.12,good:.03,sunset:-.08,love:.02,u2:.66,u1:.9,u3:.4}[t.id]??0}});
const SB_POSTS=[['今天的配色：奶白 + 一点网球绿','ootd','Kooyong Lawn','Lily','outfit',2840,126,18,41],['下午四点的影子，比我打得好看','love','Glen Iris Park','Nana','shadow',2210,64,9,22],['草地刚开，脚感太好了','','Royal South Yarra','Ben','',1960,58,14,3],['教练说的我都懂，就是反手永远慢半拍','brain','Albert Park','Coco','',1720,88,31,6],['发现一块宝藏球场：Fawkner 7 号，晚上没人','spot','Fawkner Park','Ray','court',1650,47,26,19],['新鞋第一次上场，脚后跟磨破了','gear','Hawthorn','阿杰','shoes',1410,39,17,8],['它捡球比我还积极','pet','Kooyong Lawn','Yuki','dog',1380,92,12,27],['在 Kooyong 捡到一个黑色水壶，放前台了','','Kooyong Lawn','Mia','',1120,21,6,0],['打完最后一局，抬头就是这个','sunset','Albert Park','小鹿','sunset',1090,71,4,33],['第一次发球直接得分，记录一下','dopa','National Tennis Centre','Kevin','',980,44,10,2]];
const SB_PCOL={outfit:'#D9C8AE',shadow:'#5F7068',court:'#5E8A72',shoes:'#7FA79A',dog:'#C9A57E',sunset:'#C88A6B'};
const SB_QS=[['场边有什么新鲜事？','',12400,.061,.52],['今天穿什么上场？','ootd',9800,.094,.63],['Kooyong 现在怎么样？','court',6100,.072,.71],['今天哪个动作又没跟上？','brain',5200,.081,.58],['最近换了什么装备？','gear',4300,.052,.55],['今天的晚霞……','sunset',3900,.066,.61],['捡到东西了？','lost',3800,.014,.81],['周末和网球约会了吗？','love',3500,.038,.49],['最近离不开的小东西？','good',3100,.029,.44]];
