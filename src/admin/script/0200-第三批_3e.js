/* =====================================================================
 * 第三批 · 3e：每张卡片的数据源（ⓘ）—— 页面 → 卡片标题 → [数据源（schema 里的表 / 视图 / 函数）, 口径]
 * 上线时：每个数据源对应一个后台接口 GET /admin/api/<名字>?from=&to=&device=，返回的字段与原型里 DB / Q 一致
 * 没有标题的卡片用「#标签名」（例如待审核的两个标签）
 * ===================================================================== */
const CARDSRC={
 overview:{
  '实时在线':[['sessions'],'5 分钟内有操作的人（演示数据，上线接 /admin/api/realtime）'],
  '日均活跃':[['daily_metrics','active_users()'],'每天至少有一个事件的人（含未登录访客），区间取每天的平均'],
  '今日活跃':[['daily_metrics','active_users()'],'今天至少有一个事件的人（含未登录访客）'],
  '新注册':[['users','daily_metrics'],'完成手机验证、填完资料的人（signup_complete），按注册时用的设备'],
  '新球局':[['games','daily_metrics'],'发起成功的公开球局，按发起时间、发起时用的设备'],
  '申请加入（次数）':[['game_participants','v_applications_daily'],'申请次数（不含发起人自己）；申请人数按整段时间去重'],
  '开打时人齐':[['v_game_fill','fill_rate()'],'到了开打时间、没取消的局里，开打时已通过人数够的比例；全站只有这一个算法'],
  '活跃用户趋势':[['daily_metrics','metric_sum()'],'每天的汇总；今天截至此刻'],
  '新注册趋势':[['daily_metrics'],'每天的汇总'],'新球局趋势':[['daily_metrics'],'每天的汇总'],'申请加入（次数）趋势':[['daily_metrics'],'每天的汇总'],'申请人数趋势':[['daily_metrics'],'每天去重的申请人数'],'消息趋势':[['daily_metrics','messages'],'每天的消息数'],
  '最活跃的球友':[['user_activity()','activity_weights'],'活跃分 = 发起并成局×4 + 到场打球×3 + 申请×1 + 邀约×1 + 留印象×0.5 + 活跃天数×1 − 爽约×5'],
  '今天':[['today_board()'],'今天还没开打的局、还缺人、想打没打上、等确认的申请；不受上方筛选影响'],
  '最活跃的球场':[['venue_activity()'],'按开打时间统计；活跃度 = 打上的球局×3 + 发布 + 申请×0.5'],
  '哪个区约球最多':[['suburb_activity()'],'按球场所在区；区的数字 = 区里各球场之和 + 自己填写场地的局'],
  '大家几点打球':[['start_heatmap()'],'到了开打时间的球局（含取消），按星期 × 小时'],
  '从来访到打上球':[['visit_funnel()'],'按人去重；每一步都是上一步里的人'],
 },
 users:{
  '总注册球友':[['users'],'上线以来注册的人，按注册时用的设备'],
  '月活':[['active_users()'],'近 30 天至少有一个事件（含未登录访客）'],'周活':[['active_users()'],'近 7 天至少有一个事件（含未登录访客）'],
  '次日 / 7 日 / 30 日留存':[['v_user_retention'],'近 90 天注册的人，第 1 / 7 / 30 天又来了'],
  '性别':[['users','gender_changes'],'用户自己确认的；只用于女生局'],'UTR 分布':[['users'],'注册时填的 UTR'],
  '新用户留存':[['v_user_retention'],'按注册周分组'],'球友名单':[['player_cards','user_activity()','user_status_log'],'全部球友；活跃分按所选时间范围'],
  '账号状态说明':[['users','user_status_log'],'状态取值与 users.status 一致'],
 },
 cards:{
  '球员卡被查看':[['card_views()'],'card_view，不含看自己'],'球员卡被分享':[['share_attribution()'],'card_share（朋友圈 / 小红书 / 复制链接）'],
  '站外打开球员卡':[['link_visits','card_views()'],'从分享链接打开球员卡；带来的注册 = 打开当天注册'],'头像选了动物':[['users'],'当前头像类型'],
  '被看最多的球员卡':[['card_views()'],'按被查看次数'],'球员卡怎么被分享的':[['share_attribution()','card_views()'],'分享渠道；查看来源 = card_view.via'],
  '动物':[['users'],'当前在用的头像（快照）'],'印样':[['users'],'选了动物的人当前停在哪一枚'],'头像底色':[['users'],'12 种'],'卡面':[['users'],'当前卡面主题'],
  '值得改进的地方':[['card_views()','share_attribution()','invites'],'满足条件才出现'],
 },
 games:{
  '新球局':[['games'],'发起成功的公开球局'],'单打 : 双打':[['games'],'game_type'],'女生局':[['games'],'tags 含 women'],
  '申请':[['game_participants'],'申请次数；平均每局 = 申请 ÷ 新球局'],'申请通过率':[['application_outcomes()'],'通过（含之后退出）÷ 申请'],
  '开打时人齐':[['v_game_fill','fill_rate()'],'到了开打时间、没取消的局里，开打时已通过人数够的比例'],
  '申请的结果':[['application_outcomes()'],'互斥，加起来 = 申请次数'],'发布的玩法':[['games'],'按发起时用的设备'],
  '球局标签':[['games'],'tags；节奏二选一、适合谁可多选'],'最活跃的区域':[['suburb_activity()'],'活跃度 = 人齐的局×3 + 发布 + 申请×0.5'],
 },
 venues:{
  '已收录球场':[['venues'],'status = verified'],'可以直接打':[['venues','venue_fees'],'公开订场或 Social，不用入会'],'用户提交':[['venue_suggestions'],'发起球局时添加'],
  '资料还不全':[['venues','venue_fees'],'缺订场方式、价格或场地条件'],'先补哪些':[['venues','venue_activity()'],'近 30 天发局数 × 缺的信息'],
  '最活跃的球场':[['venue_activity()'],'按开打时间；只算已核实的球场'],'区域待核实':[['venues','suburbs'],'名录里的区和定位不一致'],'区域 × 球场':[['venues','suburbs'],'每个区收录了几个球场'],
  '#venues':[['venues','venue_fees'],'球场数据库（价格、评价前台未上线）'],'#walls':[['hitting_walls'],'练习墙（前台未上线）'],
 },
 regions:{
  '有球局的区域':[['suburb_activity()'],'区间内至少有一局'],'最活跃':[['suburb_activity()'],'活跃度最高的区'],'增长最快':[['suburb_activity()'],'新球局环比（上一周期 ≥3 局才算）'],
  '开打时人齐':[['v_game_fill','fill_rate()'],'全站同一个算法'],'全部区域':[['suburb_activity()'],'按球场所在区；新注册按球友填的所在区'],
  '服务范围':[['service_areas'],'仅展示：写在前台代码里'],'推荐的区':[['suburbs'],'仅展示'],'中文别名':[['suburb_aliases'],'仅展示'],'服务范围以外的需求':[['area_demand'],'未上线：前台还没有区外留资'],
 },
 life:{
  '新球局':[['games'],'按发起时间'],'开打时人齐':[['v_game_fill','fill_rate()'],'全站同一个算法'],'开打时还缺人':[['v_game_fill'],'到了开打时间、没取消、人不够的局；照常打了 = 至少 2 人打完'],'开打前取消':[['games'],'cancelled_at 在开打前'],
  '值得关注':[['v_game_fill','games','game_participants'],'只列有明显差异的'],'一局球的去向':[['v_game_fill'],'按开打时间'],'从开打到打完':[['v_game_fill','v_counted_games','game_feel'],'每一步都是上一步里的局'],
  '开打时段':[['v_game_fill'],'按开打时间所在时段'],'星期几':[['games'],'到了开打时间的球局'],
  '申请':[['application_outcomes()'],'申请次数与通过率'],'超时失效':[['game_participants','application_deadline()'],'status = expired'],'满员自动结束':[['game_participants'],'decline_reason = full_auto'],'发起人婉拒':[['game_participants'],'decline_reason in (known, level, pass)'],
  '申请截止':[['application_deadline()'],'失效时间 = min(max(申请时间, 开打前 60 分钟) + 15 分钟, 开打)'],'超时与退出':[['game_participants'],'退出 = status left；10 分钟内不算临时退出；改时间后退出不算'],
  '临时发布的局':[['games'],'开打前 2 小时内发布'],'开了「不用我确认」':[['games'],'join_mode = instant'],'直接加入':[['game_participants'],'不经过申请直接通过'],'临时局开打时人齐的比例':[['v_game_fill'],'临时局按 join_mode 分'],
  '发起人改了什么':[['game_changes'],'按修改时间'],'取消发生在':[['games'],'开打时间 − cancelled_at'],
  '4 人以上申请的局':[['v_multi_applicant_games'],'申请人数 ≥4（不含发起人）'],'这些局开打时人齐':[['v_multi_applicant_games','v_game_fill'],'与 1–3 人申请的局对比'],'发起人处理用时（中位数）':[['v_multi_applicant_games'],'发起人亲自处理（不含直接加入、自动结束）'],
  '人齐后自动结束的申请':[['game_participants'],'4 人以上申请的局里 full_auto'],'申请多了以后':[['v_multi_applicant_games'],'按发起时间'],
  '发出的邀约':[['invites'],'按发出时间、发出时用的设备'],'接受率':[['v_invite_outcomes'],'已有结果（接受 / 婉拒 / 失效）里的接受'],'回复用时（中位数）':[['v_invite_outcomes'],'发出到接受 / 婉拒'],'邀约成局后打完':[['invites','v_counted_games'],'约好的私人局里已打完的'],
  '邀约的结果':[['v_invite_outcomes'],'互斥'],'约谁更容易成':[['v_invite_outcomes'],'一起打过 = 之前同场打完过'],
 },
 after:{
  '打完的人次':[['v_counted_games'],'结束时间在区间内的计入场次'],'赛后提醒打开':[['notification_deliveries'],'kind = recap；打开 ÷ 送出'],'填写了赛后卡片':[['game_feel','player_prefs','impressions'],'含从球局详情进入'],'平均每次标了':[['player_prefs'],'多遇到 + 少遇到，每次填写'],
  '值得关注':[['player_prefs','game_feel','follow_notices'],'只列有明显差异的'],'赛后提醒':[['notification_deliveries'],'结束 1 小时后；没送出的原因'],'以后想多遇到吗':[['player_prefs'],'每位同场球友各算一次；随缘 = 没选'],
  '这局对你来说':[['game_feel'],'偏难 / 刚好 / 偏轻松；按和同场最高 UTR 的差'],'留下的好印象':[['impressions'],'一键点赞也写 impressions'],
  '被标「少遇到」较多的球友':[['player_prefs','v_confirmed_noshow','reports'],'全部时间；至少 3 人标记'],'少遇到拦下的直接加入':[['less_effect_counts()'],'less_effect type = join'],'拦下的邀约':[['less_effect_counts()'],'type = invite'],'静音的私信':[['less_effect_counts()'],'type = dm'],'排序后移的球局':[['less_effect_counts()'],'type = rank'],
  '被标「多遇到」最多':[['player_prefs'],'全部时间；至少 3 人标记'],'TA 发了新球局':[['follow_notices','notification_deliveries'],'同一人每 7 天最多一次；不适合的不发'],
  '发出的提醒':[['notifications','notification_route()'],'按到达时间（夜间顺延的按 8 点）；按提醒最后到达的设备'],'点开':[['notifications'],'read_at 不为空 ÷ 发出'],'开打前 30 分钟提醒':[['notifications'],'kind = soon；点开 ÷ 发出'],'出发类同时推手机':[['notification_deliveries'],'reason = go_kind'],
  '提醒去了哪里':[['notification_route()','notification_deliveries'],'每条提醒的第一去向（notification_deliveries 第一行）'],
  '爽约反馈':[['noshow_reports'],'结束后 48 小时内'],'确认爽约':[['v_confirmed_noshow'],'发起人，或两人局另一位，或 ≥2 人反馈'],'申诉':[['noshow_appeals'],''],'申诉成立':[['noshow_appeals'],'status = upheld'],'谁反馈的':[['v_confirmed_noshow'],'每位被反馈的人算一次'],
 },
 grow:{
  '打过至少 1 场':[['v_counted_games'],'计入场次的口径'],'达到 10 场':[['v_counted_games'],'按第 10 场的时间'],'达到 50 场':[['v_counted_games'],'按第 50 场的时间'],'Lv2 及以上':[['users','user_level_log'],'现在的等级'],
  '值得关注':[['v_level_stuck','v_counted_games'],'只列有明显差异的'],'场次分布':[['v_counted_games'],''],'场次里程碑':[['v_counted_games'],'从第 1 场起的平均用时（≥5 人才显示）'],
  '等级分布':[['users','user_level_log'],'与前台 v3 门槛一致'],'场次够了、还没升上去':[['v_level_stuck'],'卡在哪一项（可多项）'],'好评率分布':[['user_kudos_v2'],'等级口径'],'赴约率分布':[['v_counted_games','v_confirmed_noshow'],'等级口径'],
  '徽章':[['user_badges','v_badge_rarity'],'稀有度 = 拥有的人 ÷ 打过至少 1 场的人'],'徽章分享':[['user_badges','events'],'badge_view → badge_share'],'分享渠道':[['events'],'badge_share.to'],'卡面主题':[['users'],''],'头像类型':[['users','events'],'card_customize'],
 },
 traffic:{
  '页面访问':[['page_traffic()'],'page_view 人次'],'站外进入':[['entry_sources()'],'session_start.entry = share / external'],'直接打开':[['entry_sources()'],'主屏幕 / 收藏 / 输入网址'],'分享带来注册':[['share_attribution()'],'打开分享链接当天注册'],
  '每个页面':[['page_traffic()'],'人数按整段时间去重（含未登录）；停留来自 page_time'],'怎么进来的':[['entry_sources()'],'每次会话的进入方式'],'站外：分享链接按渠道':[['link_visits','share_attribution()'],'按打开时间'],'站内：从哪里点进球局':[['game_view_via()'],'game_view.via'],
 },
 growth:{
  '新注册':[['users'],''],'球局被分享':[['share_attribution()'],'game_share'],'球员卡被分享':[['share_attribution()'],'card_share'],'分享带来注册':[['share_attribution()'],'打开分享链接当天注册'],
  '球局分享':[['share_attribution()','link_visits'],'链接 ?s= 归因'],'球员卡分享':[['share_attribution()','link_visits'],'card_share.channel'],'新球友从哪来':[['users'],'首次打开时的来源（users.source）'],'每日新注册':[['daily_metrics'],''],
 },
 platform:{
  '每日活跃 · 手机 / 电脑':[['daily_metrics'],'按设备'],'关键指标对比':[['device_compare()'],'每项都按当时用的设备'],'各页面访问':[['page_traffic()'],'按设备'],'发布的玩法':[['games'],'按发起时用的设备'],'手机上从哪打开':[['env_usage()'],'手机会话'],
 },
 env:{
  '已添加到主屏幕':[['pwa_install_funnel()','users'],'pwa_first_launch / pwa_installed，按人去重'],'微信内打开':[['env_usage()'],'占手机会话'],'小红书内打开':[['env_usage()'],'占手机会话'],'推送 / 通知开启':[['push_subscriptions','users'],'手机为系统推送，电脑为浏览器通知'],
  '会话从哪打开':[['env_usage()'],'按环境分组'],'各环境每日会话':[['env_usage()'],'已过完的整天'],'每种环境':[['env_usage()','v_env_30d'],'看球局 → 申请、次日还来、推送按在这个环境里出现过的球友'],
  '添加到主屏幕':[['pwa_install_funnel()'],'在手机浏览器里用过的球友'],'微信 / 小红书里的球友去哪了':[['inapp_handoff_funnel()'],'按登录后的用户 ID 串起不同环境'],
  '系统':[['env_usage()'],'按会话'],'主屏幕用户 vs 手机浏览器用户':[['env_usage()','v_counted_games'],''],'电脑':[['env_usage()'],'浏览器，按会话'],
 },
 review:{'#venues':[['venue_suggestions'],'用户提交的球场；已被使用 = 提交人发局时用过几次'],'#reports':[['reports'],'站内 + 邮件录入'],'#sideline':[['sb_photos','reports','sb_posts','sb_replies'],'场边：被打码送审的照片（自动识别可疑 / 被举报）+ 场边举报（reports.via = sideline）'] },
 safety:{
  '看到球友约定':[['events'],'pact_view(via=gate)'],'同意约定':[['events'],'pact_accept'],'举报':[['reports'],''],'屏蔽':[['blocks'],''],'高风险用户':[['user_risk','risk_alerts'],'风险分 ≥ 60'],'需要看一下':[['risk_alerts'],'待处理'],
  '潜在风险用户':[['user_risk','risk_rules','risk_alerts'],'风险分 = 满足的规则权重之和，≥30 列出'],'处理阶梯':[['user_status_log'],''],'风险规则':[['risk_rules','user_risk'],'现在满足的人'],
 },
 cities:{'城市':[['admin_city_overview()'],'每个城市的上线状态、区和球场导入情况、开放时通知我；只负责部分城市的人只看到这些城市'],'上线检查清单':[['city_checklist()'],'进入筹备 / 试运行 / 正式前必须通过的项'] },
 admin:{'管理员':[['admin_users','admin_perms','admin_health'],''],'系统状态':[['monitor_checks()','monitor_alerts','ops_drills'],'每 5 分钟'],'操作日志':[['admin_audit_log'],'所有操作，保存 2 年'] },
 events:{'#events':[['event_definitions','daily_metrics'],'事件字典 = tests/spec/events_spec.md'],'#metrics':[['event_definitions'],'指标口径'],'#flow':[['event_definitions'],'事件流程'],'#cards':[['CARDSRC'],'本页清单 = 后台每张卡片的数据源登记；上线时逐个换成接口'] },
};
// 卡片标题（去掉 ? 和标签）
const cardKey=el=>{const t=el.cloneNode(true);t.querySelectorAll('.hp,.pill,.live,small').forEach(x=>x.remove());return t.textContent.trim()};
function cardSrcOf(page,card){const M=CARDSRC[page]||{},kl=card.classList.contains('kpi')?card.querySelector('.l'):card.querySelector(':scope > .ch > b')||card.querySelector('.ch b');
  let k=kl?cardKey(kl):null;if(!k||!M[k]){const tab=page==='venues'?S.vtab||'venues':S.tab2||(page==='events'?'events':'venues');if(!k||!M[k])k='#'+tab}
  return M[k]?{k,src:M[k][0],def:M[k][1]}:null}
function cardSrcDecorate(root){root.querySelectorAll('.card').forEach(c=>{if(c.querySelector(':scope .srci'))return;const x=cardSrcOf(S.page,c);if(!x)return;
  const host=c.classList.contains('kpi')?c.querySelector('.l'):c.querySelector('.ch b')||c.querySelector('.ch')||c.querySelector('.tabs');if(!host)return;
  const ex=host.querySelector('.hp');if(ex){ex.classList.add('srci');ex.dataset.tl=ex.dataset.tl+' · 数据源：'+x.src.join(' · ');return}   // 已经有「?」口径的，数据源并进同一个提示
  host.insertAdjacentHTML('beforeend',`<span class="hp srci" data-tv="数据源" data-tl="${esc(x.src.join(' · ')+(x.def?' — '+x.def:''))}">i</span>`)})}

// 数据口径 → 第四个标签「卡片与数据源」：按左侧导航顺序列出每张卡片用哪些表 / 视图 / 函数
const pageEvents0=pageEvents;
pageEvents=function(){const on=S.tab2==='cards',n=Object.entries(CARDSRC).reduce((a,[k,m])=>a+Object.keys(m).length,0);
  const btn=`<button class="${on?'on':''}" data-tab2="cards">卡片与数据源 (${n})</button></div>`;
  if(!on)return pageEvents0().replace(/(data-tab2="flow">事件流程<\/button>)<\/div>/,'$1'+btn);
  const head=pageEvents0().match(/<div class="tabs">[\s\S]*?<\/div>/)[0].replace(/ class="on"/g,' class=""').replace(/<\/div>$/,btn);
  const order=PAGES.filter(p=>p[0]!=='h'&&CARDSRC[p[0]]).map(p=>p[0]),srcs=new Set();
  const rows=order.map(pg=>Object.entries(CARDSRC[pg]).map(([k,v],i)=>{v[0].forEach(x=>srcs.add(x));return `<tr>${i?'':`<td rowspan="${Object.keys(CARDSRC[pg]).length}" style="vertical-align:top"><b style="font-weight:600">${esc(TITLES[pg]||pg)}</b></td>`}<td>${esc(k[0]==='#'?'（标签）'+k.slice(1):k)}</td><td class="mono">${v[0].map(esc).join('<br>')}</td><td style="color:var(--mut)">${esc(v[1]||'—')}</td></tr>`}).join('')).join('');
  return `<div class="card">${head}<table data-cardsrc><thead><tr><th>页面</th><th>卡片</th><th>数据源</th><th>口径</th></tr></thead><tbody>${rows}</tbody></table></div><p class="cap">共 ${n} 张卡片、${srcs.size} 个数据源，都在 schema.sql 里有定义。每张卡片标题旁的 ⓘ 显示同一份登记；上线时每个数据源对应一个后台接口，返回字段与原型一致。</p>`};

