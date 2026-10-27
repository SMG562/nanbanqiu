/* ===== 数据 ===== */
const R=(x,t,f={})=>Object.assign({x,t:NOW-t},f);
const norm=a=>a.map(x=>{if(x.pics)x.pic=x.pics[0];else if(x.pic)x.pics=[x.pic];return x});
const ME='nana.court';
const seed=()=>norm([
  {id:1,t:NOW-2*M,x:'红土 3、4 号空着，快来',w:'Kooyong',km:1.2,b:4,r:[]},
  {id:2,t:NOW-8*M,x:'风好大，高球全飘了',w:'Glen Iris',km:.8,b:2,r:[R('今天适合练截击',5*M)]},
  {id:9,t:NOW-24*M,x:'捡到一个蓝色水杯，放前台了',w:'Kooyong',km:1.2,b:2,pic:'cup',r:[R('是我的！谢谢',12*M)]},
  {id:20,t:NOW-35*M,x:'今天的配色：奶白 + 一点网球绿',w:'Kooyong',km:1.2,b:126,pics:['outfit','shadow','clay'],tone:'warm',u:{n:'Lily',c:'#E3D5C3',lv:'3.5',area:'Kooyong',g:31},topic:'ootd',floor:31,r:[R('裙子好好看，哪里买的？',20*M),R('去年的款，Kew 那家店',18*M,{op:1}),R('网球绿太可爱了',6*M)]},
  {id:21,t:NOW-72*M,x:'下午四点的影子，比我打得好看',w:'Glen Iris',km:.8,b:64,pics:['shadow'],tone:'film',mine:true,views:312,topic:'love',floor:486,r:[R('这张构图绝了',50*M),R('影子都在挥拍',30*M),R('明天这个时间还去吗',10*M)]},
  {id:5,t:NOW-48*M,x:'今天的晚霞，最后一局刚好赶上',w:'Albert Park',km:3.4,b:48,pic:'sunset',topic:'sunset',floor:153,r:[R('好看',30*M),R('这是几号场？',22*M),R('6 号，靠湖那边',20*M,{op:1}),R('明天也去',9*M)]},
  {id:3,t:NOW-55*M,x:'武网决赛打到第三盘抢七，熬夜值了',w:'',km:null,b:31,r:[R('反手直线那一分全场都站起来了',40*M),R('我也没睡',20*M)]},
  {id:10,t:NOW-2*H,x:'刚下了一阵雨，草地暂时关了',w:'Kooyong',km:1.2,b:3,pic:'rain',r:[R('红土还开着',100*M)]},
  {id:4,t:NOW-3*H,x:'出 Blade 98 v8，九成新 $180，球场当面看',w:'Glen Iris',km:.8,b:6,r:[R('还在吗',2.6*H),R('在的，今晚 7 点后在 Glen Iris',2.5*H,{op:1}),R('线是新的吗？',2*H),R('上周刚穿，RPM 52 磅',1.9*H,{op:1}),R('我 7 点半到',40*M,{me:1})]},
  {id:6,t:NOW-6*H,x:'8 号场的灯还是暗的',w:'Hawthorn',km:3.1,b:3,r:[R('订 1–6 号吧',5*H)]},
  {id:12,t:NOW-7*H,x:'夜场灯一开，像在拍电影',w:'NTC',km:2.1,b:27,pic:'night',r:[]},
  {id:14,t:NOW-4*H,x:'谁的白色发带落在 2 号场椅子上了？',w:'Glen Iris',km:.8,b:1,r:[]},
  {id:7,t:NOW-9*H,x:`${CITY.zh}哪里穿线当天能拿？`,w:'',km:null,b:5,r:[R('Kew 那家，早上送下午拿',8*H)]},
  {id:11,t:NOW-14*H,x:'清晨的红土，第一个到',w:'Kooyong',km:1.2,b:19,pic:'clay',r:[]},
  {id:8,t:NOW-20*H,x:'外场有职业球员在加练，发球像打雷',w:'NTC',km:2.1,b:22,r:[]},
  {id:40,t:NOW-15*H,x:'今天穿什么上场？拍一张发上来。',w:'',km:null,b:58,r:[],topic:'ootd',floor:1,ed:true},
  {id:41,t:NOW-6*M,x:'白色永远不会错',w:'Albert Park',km:3.4,b:3,r:[],pics:['shoes'],tone:'dawn',topic:'ootd',floor:37},
  {id:42,t:NOW-25*M,x:'没拍照，但今天穿了粉色',w:'Glen Iris',km:.8,b:4,r:[],topic:'ootd',floor:33},
  {id:43,t:NOW-80*M,x:'今天的发带和球一个颜色',w:'Hawthorn',km:3.1,b:14,r:[R('好会配',60*M)],pics:['outfit'],tone:'film',topic:'ootd',floor:29},
  {id:44,t:NOW-2.2*H,x:'新鞋第一次上红土，心疼',w:'Kooyong',km:1.2,b:9,r:[R('一会儿就习惯了',2*H)],pics:['shoes'],tone:'warm',topic:'ootd',floor:26},
  {id:45,t:NOW-3.5*H,x:'奶油色球裙，配一把旧球拍',w:'NTC',km:2.1,b:22,r:[],pics:['outfit','gear'],tone:'dawn',topic:'ootd',floor:21},
  {id:46,t:NOW-5*H,x:'装备也算穿搭吧',w:'Fawkner Park',km:5.2,b:9,r:[],pics:['gear'],tone:'',topic:'ootd',floor:17},
  {id:47,t:NOW-7*H,x:'早场，穿了件旧卫衣',w:'Glen Iris',km:.8,b:17,r:[],pics:['shadow'],tone:'film',topic:'ootd',floor:12},
  {id:48,t:NOW-9*H,x:'鞋带系成了蝴蝶结',w:'Albert Park',km:3.4,b:6,r:[],pics:['shoes'],tone:'film',topic:'ootd',floor:8},
  {id:49,t:NOW-12*H,x:'第一个穿上周五的网球裙',w:'Hawthorn',km:3.1,b:11,r:[],pics:['outfit'],tone:'',topic:'ootd',floor:4},
  {id:22,t:NOW-23*H,x:'早上七点，整块场只有我',w:'Kooyong',km:1.2,b:41,pics:['clay'],tone:'dawn',mine:true,views:520,r:[R('好安静',22*H)]},
  {id:13,t:NOW-23.3*H,x:'昨晚的月亮，挂在 3 号场的灯上',w:'Glen Iris',km:.8,b:9,r:[]},
]);
const INCOMING=[
  {x:'草地刚开，脚感太好了',w:'Royal South Yarra',km:3.9},
  {x:'新网球裙到了，白色百褶永远不会错',w:'Glen Iris',km:.8,pic:'outfit',tone:'dawn',topic:'ootd'},
  {ball:21,by:'Coco'},
  {reply:2,x:'对，底线球全飘出去了'},
  {x:'开始下小雨了，大家在收拍子',w:'Kooyong',km:1.2,pic:'rain'},
  {reply:21,x:'这张我存了，影子太好看'},
  {x:'有人捡到一支黑色 Yonex 吗？',w:'Fawkner Park',km:5.2},
  {ball:21,by:'Leo'},
  {reply:4,x:'还在的话我也想看看'},
  {reply:4,x:'好，我也差不多那个点到',to:'Nana'},
  {x:'第一次打满三盘，腿已经不是自己的了',w:'Glen Iris',km:.8},
  {x:'夜场开灯了，人不多',w:'Kooyong',km:1.2,pic:'night'},
];
// 底栏的问题：只问此刻；跟着时间、跟着你在看什么
const SLOT=[['早上的场，人多吗？','今天的第一拍，打得怎么样？'],['今天的太阳，晒不晒？','午休偷偷打了一场？'],['今天的晚霞……','最后一局了吗？'],['夜场的灯亮了吗？','今天的球，打得怎么样？']];
const SLOTT=CFG.slots.map(s=>s.topics);
const slotNow=()=>{const h=+melNow().h;const i=CFG.slots.findIndex(s=>s.from<s.to?h>=s.from&&h<s.to:h>=s.from||h<s.to);return i<0?0:i};
// 球场距离（演示数据）
const KM={'Glen Iris':.8,'Kooyong':1.2,'NTC':2.1,'Hawthorn':3.1,'Albert Park':3.4,'Royal South Yarra':3.9,'Fawkner Park':5.2};
const fkm=v=>v<1?Math.round(v*1000)+' m':v.toFixed(1)+' km';
const COURTS={'Kooyong':{n:'Kooyong Lawn',area:'Glen Iris 附近 · 1.2 km',f:[['草地','6 片'],['红土','4 片'],['硬地','2 片'],['灯光','到 22:00']],games:'今天 3 局'},
  'Glen Iris':{n:'Glen Iris Park',area:'主场 · 800 m',f:[['硬地','4 片'],['灯光','到 21:30'],['Social','周三晚'],['停车','免费']],games:'今天 2 局'},
  'Albert Park':{n:'Albert Park',area:'附近 · 3.4 km',f:[['硬地','8 片'],['灯光','到 22:30'],['订场','线上'],['停车','收费']],games:'今天 4 局'},
  'Hawthorn':{n:'Hawthorn',area:'打过 · 3.1 km',f:[['硬地','8 片'],['灯光','到 22:00'],['Social','周六早'],['停车','免费']],games:'今天 1 局'},
  'NTC':{n:'National Tennis Centre',area:'附近 · 2.1 km',f:[['硬地','16 片'],['室内','8 片'],['灯光','到 23:00'],['订场','线上']],games:'今天 5 局'},
  'Royal South Yarra':{n:'Royal South Yarra',area:'附近 · 3.9 km',f:[['草地','10 片'],['红土','4 片'],['会员','需要'],['停车','收费']],games:'暂无'},
  'Fawkner Park':{n:'Fawkner Park',area:'5.2 km',f:[['硬地','6 片'],['灯光','到 22:00'],['订场','线上'],['停车','路边']],games:'今天 2 局'}};
let UID=1000;
// 用户：球场昵称 + 头像（默认首字母），不是真名
const NAMES=['Mia','阿杰','Coco','Ray','小鹿','Kevin','Yuki','老周','Iris','Ben','安安','Leo','Zoe','Tom'];
const AVC=['#CBD5C6','#E3D5C3','#D9C6BC','#C7CED6','#DACFE0','#D2DCD5','#E6DCC8'];
const hsh=v=>[...String(v)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
const ME_U={n:'Nana',c:'#D9C6BC',lv:'3.0',area:'Glen Iris',g:12,me:1};
const ANON_U={n:'一位球友',c:'#E6E3DC',anon:1};
const OFF_U={n:'场边',c:'#141516',off:1};
const uOf=k=>{const h=hsh(k);return {n:NAMES[h%NAMES.length],c:AVC[(h>>3)%AVC.length],lv:['2.5','3.0','3.5','4.0'][(h>>5)%4],area:['Glen Iris','Hawthorn','Kew','South Yarra','Malvern'][(h>>7)%5],g:3+(h>>9)%40}};
const U=x=>x.u||(x.u=x.mine?ME_U:x.anon?ANON_U:x.ed?OFF_U:uOf('p'+x.id));
const RU=(r,x)=>r.u||(r.u=r.me?ME_U:r.op?U(x):uOf('r'+r.x));
const catOf=x=>/出 |\$|二手|转让/.test(x.x)?'二手':/捡到|丢了|谁的|有人捡/.test(x.x)?'失物':x.topic?'#'+TOPICS[x.topic].t:/雨|风|晒|热|冷|晚霞|月亮/.test(x.x)?'天气':/场地|空着|灯|干了|关了|开着|号场/.test(x.x)?'场地':x.pic?'照片':'闲聊';
const CIC=x=>({'天气':'i-weather','场地':'i-court','二手':'i-tag','失物':'i-found'})[catOf(x)];
const UREG={};const regU=u=>{const k='u'+hsh(u.n);UREG[k]=u;return k};
const av=(u,s=18)=>`<span class="av${u.anon?' an':''}${u.off?' of':''}" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.46)}px;background:${u.c}">${u.anon||u.off?'':esc([...u.n][0])}</span>`;
const unb=u=>`<b class="un"${u.anon||u.off?'':` data-user="${regU(u)}"`}>${esc(u.n)}</b>`;
const DAY=d=>new Date(2026,d[0]-1,d[1],8).getTime();
const ALBUM=()=>norm([
  {id:'a1',t:DAY([10,21]),x:'第一次赢了 6:4',w:'Albert Park',b:33,r:[],pics:['sunset'],tone:'warm'},
  {id:'a2',t:DAY([10,19]),x:'新鞋',w:'Kooyong',b:18,r:[],pics:['shoes'],tone:'dawn'},
  {id:'a3',t:DAY([10,17]),x:'下雨也要来看一眼',w:'Kooyong',b:9,r:[],pics:['rain'],tone:'film'},
  {id:'a4',t:DAY([10,12]),x:'第一次打满三盘',w:'Glen Iris',b:12,r:[]},
  {id:'a5',t:DAY([10,8]),x:'奶白配网球绿',w:'NTC',b:57,r:[],pics:['outfit'],tone:'warm'},
  {id:'a6',t:DAY([9,28]),x:'夜场的灯',w:'NTC',b:21,r:[],pics:['night'],tone:''},
  {id:'a7',t:DAY([9,22]),x:'换了新手胶',w:'Glen Iris',b:7,r:[],pics:['gear'],tone:''},
  {id:'a8',t:DAY([9,15]),x:'影子',w:'Glen Iris',b:40,r:[],pics:['shadow'],tone:'film'},
  {id:'a9',t:DAY([9,3]),x:'清晨的红土',w:'Kooyong',b:26,r:[],pics:['clay'],tone:'warm'}]);
const TODAY=sbToday();
const TOPICS={ootd:{t:'网球人的OOTD',k:'今日推荐 · 周五',q:'今天穿什么上场？拍一张发上来。',ask:'今天穿什么上场？',fills:['今天这身是','第一次穿网球裙上场，','这双鞋终于到了，'],n:37,left:'9 小时',daily:1},
  love:{t:'别人在恋爱，而我在打球',k:'常驻话题',q:'周末的约会对象：一块场，一筐球。',ask:'周末和网球约会了吗？',fills:['这个周末的约会对象，是','别人在约会，我在','今天又和球拍待了一下午，'],n:486},
  gear:{t:'我的新装备',k:'常驻话题',q:'新拍子、新鞋、新手胶，拆开的那一刻。',ask:'最近换了什么装备？',fills:['换了新拍子，','新鞋第一次上场，','纠结了一个月，终于入手了'],n:212},
  sunset:{t:'场边的晚霞',k:'常驻话题',q:'最后一局，抬头看一眼。',ask:'今天的晚霞……',fills:['打完最后一局，抬头','今天的晚霞','夜场的灯亮起来的时候，'],n:153},
  pet:{t:'带着宠物去打球',k:'常驻话题',q:'来看球的、来捡球的，都算。',ask:'今天带它来了吗？',fills:['今天带狗狗来看球，','它在场边乖乖等了','它捡球比我还积极，'],n:96},
  spot:{t:'宝藏球场',k:'常驻话题',q:'人少、灯亮、地面好，悄悄分享。',ask:'最近发现了哪块好场？',fills:['发现一块宝藏球场：','这块场人少，而且','周末不用抢的场：'],n:131},
  good:{t:'实用网球好物',k:'常驻话题',q:'不贵，但真的好用。',ask:'最近离不开的小东西？',fills:['用了就回不去的：','十几块钱买的','球包里一定会带的'],n:88},
  dopa:{t:'多巴胺太爽了',k:'常驻话题',q:'那一拍打出去的时候。',ask:'今天哪一拍最爽？',fills:['今天终于赢了一盘，','第一次发球直接得分，','打了两个小时，'],n:174},
  brain:{t:'脑子会了，身体没会',k:'常驻话题',q:'教学视频看了十遍，手还是不听话。',ask:'今天哪个动作又没跟上？',fills:['看了十遍教学视频，','教练说的我都懂，就是','今天的反手又'],n:207},
  trip:{t:'带着球拍去旅行',k:'常驻话题',q:'换一座城市，换一块场。',ask:'这次带球拍去了哪？',fills:['这次旅行带上了球拍，','出门在外也没忘了打球，','找到一块海边的球场，'],n:58},
  u1:{t:'反手终于开窍了',k:'由 Yuki 发起',q:'',ask:'',fills:[],n:23,user:1,by:'Yuki'},
  u2:{t:'下班后的夜场',k:'由 阿杰 发起',q:'',ask:'',fills:[],n:41,user:1,by:'阿杰'},
  u3:{t:'第一次打红土',k:'由 Mia 发起',q:'',ask:'',fills:[],n:12,user:1,by:'Mia'}};
sbApplyTopics(TOPICS);
const PSUG={outfit:'ootd',shoes:'ootd',shadow:'love',night:'love',gear:'gear',sunset:'sunset',clay:'love'};

