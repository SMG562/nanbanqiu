/* =====================================================================
 * B1：口径统一
 *  · 事件字典只有一份（B1_EVENTS，与前端埋点、schema.sql 的 event_definitions 一致）；指标口径只引用字典里的事件
 *  · 每个指标一个取数函数，每次渲染只算一次（MM），各页面读同一个结果
 *  · 多天的「人数」按整段时间去重（次数可以相加，人数不能相加）
 *  · 成局率 = Σ开打时人齐 ÷ Σ已开打（未取消），全站只有 b1calc 这一个算法
 *  · 平台按事件里的 device 字段分手机 / 电脑，和用的是哪个版本无关
 * ===================================================================== */
const B1_EVENTS=[   // 与 events_spec.md v2 逐条一致（名称、分类、说明、props、来源 C=client / S=server）；改字典先改 spec
 ["session_start", "访问", "新会话开始（身份恢复之后再发）", "entry(share/external/direct/push), ref, landing(路径+hash), utm_source, utm_medium, utm_campaign, s, f, source(manifest ?source=), standalone, lang, vw", "client"],
 ["page_view", "访问", "切换页面（含首屏、分享落地页）", "screen, entry", "client"],
 ["page_time", "访问", "离开页面时停留时长", "screen, ms", "client"],
 ["app_hide", "访问", "页面转到后台", "", "client"],
 ["app_show", "访问", "页面回到前台", "", "client"],
 ["pwa_install_prompt", "安装", "浏览器给出安装提示", "", "client"],
 ["pwa_installed", "安装", "安装完成", "os", "client"],
 ["pwa_first_launch", "安装", "第一次从主屏幕打开", "os", "client"],
 ["a2hs_open", "安装", "打开「添加到主屏幕」引导", "env", "client"],
 ["analytics_off", "隐私", "关闭使用数据（发完这一条后停止）", "", "client"],
 ["analytics_on", "隐私", "重新打开使用数据", "", "client"],
 ["login_open", "登录", "打开登录（含被动触发）", "trigger(apply/create/invite/chat/manual/sideline/...)", "client"],
 ["login_send_code", "登录", "发送验证码（号码格式通过才发）", "cc", "client"],
 ["login_verify", "登录", "提交验证码", "ok", "client"],
 ["login_success", "登录", "登录成功", "is_new, trigger, entry", "client"],
 ["signup_complete", "登录", "新用户填完资料", "ntrp, clubs_n, gender_given, avatar_kind", "client"],
 ["logout", "登录", "退出登录（之后换新 anon）", "", "client"],
 ["account_blocked", "账号", "点到账号状态不允许的操作，看到说明", "action, status", "client"],
 ["account_delete", "账号", "本人注销账号（确认之后）", "upcoming_left, hosted_cancelled", "client"],
 ["account_restore", "账号", "注销 30 天内登录后恢复账号", "", "client"],
 ["filter_open", "发现", "打开筛选", "", "client"],
 ["filter_reset", "发现", "重置筛选", "", "client"],
 ["filter_utr_band", "发现", "切换 UTR 段", "band, on", "client"],
 ["filter_type", "发现", "切换玩法", "type, on", "client"],
 ["filter_tag", "发现", "切换场景标签", "tag, on", "client"],
 ["filter_radius", "发现", "选距离", "km", "client"],
 ["day_select", "发现", "换日期 / 翻页", "offset, via(strip/pager/next_day)", "client"],
 ["view_mode", "发现", "日程 / 地图切换", "mode", "client"],
 ["loc_suburb_pick", "发现", "选区", "suburb, via(search/recent/hot/letter/club)", "client"],
 ["location_allow", "发现", "定位授权结果", "result(granted/denied/outside)", "client"],
 ["map_day", "发现", "地图上换天", "day", "client"],
 ["map_cluster_open", "发现", "点开地图上的球场", "venue_id", "client"],
 ["game_select", "球局", "列表里选中（未进详情，PWA 预览）", "game_id", "client"],
 ["game_view", "球局", "打开球局详情（每次打开只记一次）", "game_id, venue_id, type, utr, via(list/map/chat/notif/card/mine/detail/link/share_link)", "client"],
 ["women_lock_view", "球局", "看到女生局锁定页", "game_id, logged_in", "client"],
 ["game_create_start", "球局", "打开发起表单", "", "client"],
 ["game_create_submit", "球局", "发布成功", "game_id, type, venue_id, minutes_to_start, dur, utr_min, utr_max, join_mode(approve/instant), hide_done, repeat, spots, women", "client"],
 ["game_edit", "球局", "修改成功", "game_id, fields, minutes_to_start, approved_n", "client"],
 ["game_postpone", "球局", "顺延成功", "game_id, from, to", "client"],
 ["unfilled_action", "球局", "还缺人时发起人的处理", "game_id, action(share/widen/delay/cancel/again)", "client"],
 ["game_cancel_open", "球局", "打开取消球局", "game_id", "client"],
 ["game_cancel", "球局", "取消成功", "game_id, minutes_to_start, approved_n, pending_n", "client"],
 ["game_apply_open", "球局", "打开申请", "game_id", "client"],
 ["game_apply_submit", "球局", "申请成功", "game_id, minutes_to_start, played_n, avatar_kind, has_message", "client"],
 ["game_join_instant", "球局", "直接加入成功", "game_id, minutes_to_start", "client"],
 ["apply_withdraw", "球局", "撤回申请", "game_id", "client"],
 ["game_leave_open", "球局", "打开退出", "game_id", "client"],
 ["game_leave", "球局", "退出成功", "game_id, minutes_to_start, grace, after_change", "client"],
 ["host_decide", "球局", "发起人接受 / 婉拒", "game_id, target_uid, ok, reason(known/level/pass), has_note, viewed_card, ms_since_request", "client"],
 ["host_decline_open", "球局", "打开婉拒理由", "game_id, target_uid", "client"],
 ["req_sort", "球局", "申请列表换排序", "game_id, sort", "client"],
 ["req_expand", "球局", "展开收起的申请", "game_id", "client"],
 ["game_share_open", "分享", "打开球局分享", "game_id", "client"],
 ["share_copy_link", "分享", "复制球局链接", "game_id", "client"],
 ["share_copy_text", "分享", "复制球局文案（发微信群）", "game_id", "client"],
 ["share_system", "分享", "系统分享", "game_id", "client"],
 ["poster_open", "分享", "打开小红书海报", "game_id", "client"],
 ["poster_download", "分享", "保存海报", "game_id", "client"],
 ["share_xhs_copy", "分享", "复制小红书文案", "game_id", "client"],
 ["calendar_add", "球局", "加入日历", "game_id", "client"],
 ["card_view", "球员卡", "查看球员卡", "target_uid, own, via(list/map/chat/notif/card/mine/detail/link/recap/request)", "client"],
 ["card_custom_open", "球员卡", "打开个性化", "days_since_signup", "client"],
 ["card_customize", "球员卡", "改了一项（即时生效）", "field(seal/animal/color/theme/avatar_kind), value", "client"],
 ["card_share_open", "球员卡", "打开分享球员卡", "target_uid", "client"],
 ["card_share", "球员卡", "分享 / 保存 / 复制链接", "channel(moments/xhs), action(go/save/link), ok", "client"],
 ["card_share_error", "球员卡", "分享失败", "reason", "client"],
 ["card_image_render", "球员卡", "分享图生成耗时", "ms, ok", "client"],
 ["pref_set", "打完之后", "多遇到 / 随缘 / 少遇到", "target_uid, value(more/ok/less), prev, via(recap/card)", "client"],
 ["invite_open", "邀约", "打开约 TA 表单", "target_uid, played_together", "client"],
 ["invite_send", "邀约", "邀约发出成功", "invite_id, target_uid, played_together", "client"],
 ["invite_accept", "邀约", "接受邀约", "invite_id", "client"],
 ["invite_decline", "邀约", "婉拒邀约", "invite_id, reason(week/rest/pass), has_note", "client"],
 ["invite_counter_send", "邀约", "提议新时间", "invite_id", "client"],
 ["invite_withdraw", "邀约", "撤回邀约 / 撤回新时间", "invite_id, what(invite/counter)", "client"],
 ["invite_setting", "邀约", "「谁可以约我」", "value(all/played/none)", "client"],
 ["recap_open", "打完之后", "打开赛后卡片", "game_id, via(notif/detail)", "client"],
 ["feel_set", "打完之后", "这局感受", "game_id, value(hard/ok/easy)", "client"],
 ["impression_give", "打完之后", "留个好印象（含撤回）", "target_uid, tag, on, bulk", "client"],
 ["recap_done", "打完之后", "点完成", "game_id, n_set", "client"],
 ["noshow_report", "安全", "反馈 TA 没来", "game_id, target_uid, role(host/player)", "client"],
 ["noshow_undo", "安全", "撤回没来反馈", "game_id, target_uid", "client"],
 ["noshow_appeal", "安全", "爽约申诉", "game_id, reason", "client"],
 ["badge_view", "成长", "打开徽章详情 / 庆祝页", "code, via(ceremony/wall/card/notif)", "client"],
 ["badge_share", "成长", "徽章分享", "code, to(moments/xhs), action(save/copy)", "client"],
 ["level_view", "成长", "看到升级庆祝", "lv", "client"],
 ["level_info_open", "成长", "打开等级说明", "", "client"],
 ["notif_open", "通知", "点开一条通知", "kind, from(push/list/banner), notif_id", "client"],
 ["notif_settings_open", "通知", "打开提醒方式", "", "client"],
 ["push_enable", "通知", "申请推送权限的结果", "result(granted/denied/unsupported), env", "client"],
 ["email_settings_save", "通知", "保存邮件提醒", "on", "client"],
 ["pact_view", "安全", "看到球友约定", "via(gate/soon/safety/detail)", "client"],
 ["pact_accept", "安全", "同意球友约定", "via(apply/create/invite/accept)", "client"],
 ["soon_open", "通知", "打开开打前 30 分钟卡片", "game_id", "client"],
 ["safety_open", "安全", "打开安全须知", "", "client"],
 ["contact_open", "安全", "打开联系我们 / 举报", "", "client"],
 ["report_open", "安全", "打开站内举报（球员卡 / 聊天 / 场边）", "target_type(user/game/sb_post/sb_reply), via(card/chat/sideline)", "client"],
 ["report_submit", "安全", "提交站内举报（不含说明内容）", "target_type, reason, has_note, via", "client"],
 ["user_block", "安全", "屏蔽用户", "target_uid", "client"],
 ["user_unblock", "安全", "解除屏蔽", "target_uid", "client"],
 ["chat_open", "消息", "打开对话", "type(game/dm)", "client"],
 ["chat_send", "消息", "发出消息（不含内容）", "type, quick", "client"],
 ["gender_open", "我的", "打开性别设置", "", "client"],
 ["gender_set", "我的", "保存性别（不记录值）", "first, changed", "client"],
 ["club_add_open", "我的", "打开添加 Club", "", "client"],
 ["home_clubs_save", "我的", "保存我的 Club", "n", "client"],
 ["utr_open", "我的", "打开我的 UTR 弹层（长按看时间那次不算）", "mode(off/self), linked", "client"],
 ["utr_invalid", "我的", "我的 UTR 当场校验没通过（不发请求、不记填的内容）", "reason(empty/format/range/link)", "client"],
 ["utr_save", "我的", "我的 UTR 保存成功（以服务器返回为准，失败不记；不记数值和主页编号）", "mode(off/self), linked, change(up/down/same)", "client"],
 ["racket_picker_open", "我的", "打开选拍弹层（添一把 / 换一把；从系列返回不算）", "mode(add/swap), slot(1-3)", "client"],
 ["racket_brand_pick", "我的", "选拍时点了品牌（品牌名来自产品库或兜底列表；点「其他品牌」记 other；不记手写文字）", "brand", "client"],
 ["racket_save", "我的", "球拍保存成功（以服务器返回为准，失败不记）；source：添 / 换时看是点选（catalog）还是手写（other），设为主力 / 移除时看那把有没有归到产品库", "action(add/swap/main/remove), source(catalog/other), n_after", "client"],
 ["racket_invalid", "我的", "手写拍子名当场没通过校验（不发请求、不记文字）", "reason(empty/long/link/at/digits/dup)", "client"],
 ["community_open", "我的", "打开微信约球群", "", "client"],
 ["series_end", "我的", "停止每周发布", "game_id", "client"],
 ["follow_open", "打完之后", "打开「TA 发了新球局」", "game_id", "client"],
 ["sb_post_view", "场边", "打开一条发布的详情", "post_id, own, via(feed/court/topic/album/notif)", "client"],
 ["sb_post_submit", "场边", "发布成功（含「2 小时后再公开」）", "post_id, photos, topic_kind(none/official/user/new), court, later, via(bar/compose/court)", "client"],
 ["sb_reply_send", "场边", "回复成功（不含内容）", "post_id, own_post, to_someone", "client"],
 ["sb_ball", "场边", "点网球 / 取消", "post_id, on, via(tap/double)", "client"],
 ["sb_photo_view", "场边", "看大图", "post_id", "client"],
 ["sb_topic_view", "场边", "按话题看", "topic(话题代码；大家发起的记 user)", "client"],
 ["sb_court_view", "场边", "按球场看 / 打开球场页", "venue, via(filter/page)", "client"],
 ["sb_hide", "场边", "不感兴趣（之后选了原因再记一条）", "post_id, reason(none/topic/user/far)", "client"],
 ["sb_post_delete", "场边", "删除自己的发布", "post_id", "client"],
 ["sb_replies_toggle", "场边", "开关自己发布的回复", "post_id, open", "client"],
 ["sb_share", "场边", "分享照片 / 话题", "post_id, topic, what(photo/topic), to(save/instagram/xhs)", "client"],
 ["sb_album_open", "场边", "打开场边相册（「我的」页）", "", "client"],
 ["apply_expired", "球局", "申请超时自动结束", "game_id", "server"],
 ["game_start_check", "球局", "开打时检查人数", "game_id, filled, need, applied_n, reason", "server"],
 ["game_counted", "成长", "一局计入场次", "game_id, players", "server"],
 ["recap_notify", "打完之后", "赛后提醒送出", "game_id, delay_min, deferred", "server"],
 ["follow_notify", "打完之后", "TA 发了新局提醒", "host_id, suppressed", "server"],
 ["less_effect", "打完之后", "少遇到生效", "type(join/invite/dm/rank)", "server"],
 ["noshow_confirm", "安全", "爽约确认", "game_id, rule(host/single/2+)", "server"],
 ["badge_earned", "成长", "获得徽章", "code, rarity", "server"],
 ["level_up", "成长", "等级提升", "from, to", "server"],
 ["notif_deliver", "通知", "一条提醒的去向", "kind, channel(in_app/push_mobile/push_desktop/email/none), reason", "server"],
 ["women_apply_blocked", "安全", "非女生请求女生局被 API 拒绝", "game_id", "server"],
 ["account_status_change", "账号", "账号状态变化（后台处理、暂停到期自动恢复、本人注销 / 恢复）", "from, to, reason", "server"]
];
EVDEF.length=0;B1_EVENTS.forEach(e=>EVDEF.push(e));
// 页面清单（page_view.screen）：两端各自的屏幕。Web 没有独立的「我的」页；Web 的通知是弹层（打开时也记 page_view screen=notif）
SCREENS.length=0;[['disc','发现球局',3.2,.62,48,'两端'],['game_detail','球局详情',2.1,.7,35,'两端'],['notif','消息 / 通知',1.4,.84,41,'PWA 页 · Web 弹层'],['mine','我的球局',.9,.74,26,'两端'],['me','我的',.8,.97,22,'仅 PWA'],['player_card','球员卡',.72,.71,14,'两端'],
 ['filter','筛选',.35,.52,12,'两端'],['create','发起球局',.18,.62,71,'两端'],['login','登录',.15,.48,33,'两端'],['game_share','分享球局',.1,.7,15,'两端'],['poster','小红书海报',.04,.72,20,'两端'],['card_share','分享球员卡',.06,.84,18,'两端'],['invite','约 TA 打球',.05,.8,40,'两端'],['safety','安全须知',.045,.7,26,'两端'],['community','微信群',.03,.6,10,'两端']].forEach(x=>SCREENS.push(x));

// 稳定的 0–1 伪随机：只看字符串，不受调用次数影响（同一个区 / 球场在各页面数值一致）
const b1h=s=>{s=String(s);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967296};

/* ---------- 注册总数 = 上线以来每天新注册之和（含今天） ---------- */
function TU(){return HIST.reduce((a,x)=>a+x.nu,0)}
// 等级 v3（与前台 JOURNEY 一致）：逐级满足 场次 / 赴约率（等级口径）/ 好评率 / 好评人数；Lv5 另要求半年内零举报
const B1_LV=[[20,0,0,0],[50,.9,.3,10],[100,.95,.4,25],[200,.98,.5,50]];
function b1lv(u){const k=b1h(u.id+'k'),mates=Math.round(u.played*.6)+2,from=Math.round(mates*(.15+.5*k)),rate=(from+1)/(Math.max(mates,from)+4),att=Math.max(0,u.att-.01*b1h(u.id+'t'));let lv=1;
  for(let i=0;i<B1_LV.length;i++){const[g,a,r,f]=B1_LV[i];if(u.played>=g&&att>=a&&rate>=r&&from>=f&&(i<3||b1h(u.id+'r')>.1))lv=i+2;else break}return lv}

/* ---------- 字典：颜色（与前端 ZAVC 一致，12 种）---------- */
COLORS.length=0;[["paper","米白","#F4EFE3"],["red","红","#E3262B"],["orange","橙","#F07D1A"],["olive","橄榄","#6B8A2E"],["green","绿","#1FA35C"],["teal","湖青","#11A394"],["sky","天蓝","#2C98EC"],["navy","藏青","#24457F"],["violet","紫罗兰","#7B68EE"],["rose","樱粉","#E0548A"],["cocoa","可可","#8A5A44"],["slate","石墨","#3A4252"]].forEach(c=>COLORS.push(c));
CW.length=0;[24,9,8,5,7,8,10,6,7,8,3,5].forEach(w=>CW.push(w));
PLAT_NAME.pwa='手机';PLAT_NAME.web='电脑';
SRC[1][1]='球员卡分享';SRC[2][1]='小红书（非分享链接）';SRC[3][1]='微信（非分享链接）';
REASONS.splice(REASONS.length-1,0,'违反球友约定');
// 电脑浏览器支持通知（手机没开推送时才推到电脑）
[['desk_chrome',.14],['desk_safari',.12],['desk_edge',.1],['desk_other',.06]].forEach(([k,v])=>{const e=ENVS.find(x=>x[0]===k);if(e){e[7]=v;if(k==='desk_chrome')e[8]='多在看地图、挑球局；可以开浏览器通知'}});
RISK.forEach(r=>r.sig.forEach(s=>{if(s[0]==='爽约')s[0]='确认爽约';if(s[0]==='临开局取消')s[0]='发起人临时取消'}));
// 新信号：被多人标少遇到（≥3 人）、30 天内邀约被婉拒 2 次、违反球友约定
(RISK.find(r=>r.u==='Ryan G.')||{sig:[]}).sig.push(['被多人标少遇到',3]);(RISK.find(r=>r.u==='Ben K.')||{sig:[]}).sig.push(['30 天内邀约被婉拒',2]);(RISK.find(r=>r.u==='Nick I.')||{sig:[]}).sig.push(['违反球友约定',1]);
Object.assign(DEF,{
  nu:'新注册：完成手机验证、填完资料的人数（signup_complete）',
  games:'新球局：发起成功的球局数（game_create_submit；取消后重发算两局）',
  apps:'申请加入（次数）：game_apply_submit 的次数，同一人申请 3 个球局记 3 次；直接加入另计',
  applicants:'申请人数：这段时间里至少提交过一次申请的人，按整段时间去重，不是每天的人数相加',
  fill:'开打时人齐（成局率）：未取消且已开打的球局中，开打时「已通过人数（含发起人）+ 线下补位 ≥ 人数」的比例。多天按 Σ人齐 ÷ Σ已开打；今天只算已经到开打时间的。全站只有这一个算法（b1calc），概览、球局全流程、区域、球场引用同一个值',
  dau:'活跃用户：这一天至少有一个事件的人，按人去重（登录用 user_id，未登录用 anon_id，所以含未登录访客）；多天时取每天的平均'});

/* ---------- 基础计算 ---------- */
const b1ush=()=>1;   // 第三批：注册数已按注册时的设备分开计算（HIST.nu 按设备读取），不再按比例拆                    // 按注册时用的设备分手机 / 电脑（与新注册同一个比例，保证 新注册 ≤ 总注册）
// 6:00–22:00 每小时开打的球局（相对）
// 一天的球局去向：开打（未取消）/ 人齐 / 取消；今天只算已经到开打时间的
// 去重人数：每天的人数相加会重复计算同一个人。按「池子」饱和：≤ 每天相加，≥ 单日最多，≤ 池子
let B1C={k:''};
function MM(){const k=[S.range,S.plat,T.games,T.nu,T.apps,T.dau,T.applicants,T.shares].join('|');if(B1C.k===k)return B1C.v;
  const one=S.range===1,prevOK=one||HIST.length-1>=2*S.range,v=b1calc(one?[T]:inRange(),one?null:null);
  v.one=one;v.all=isAll();v.prevOK=prevOK;v.ush=b1ush();v.prev=prevOK?b1calc(one?[Y]:prevRange(),one?'yday':null):null;B1C={k,v};return v}
function b1allPlat(fn){const p=S.plat;S.plat='all';try{return fn()}finally{S.plat=p}}
const b1pf=r=>r==null?'—':pct(r);
const b1fillKpi=()=>{const M=MM();return `<div class="card kpi"><div class="l">开打时人齐${help(DEF.fill)}</div><div class="v num" data-fill>${b1pf(M.rate)}</div><div class="d">${fmt(M.full)} / ${fmt(M.st)} 局开打时人齐</div></div>`};
// 申请的结果（互斥，加起来 = 申请次数）
// 推送开启：按会话加权，手机 / 电脑各一个值，全站只用这一个
function b1push(){const w=a=>a.reduce((s,e)=>s+e[3]*e[7],0)/(a.reduce((s,e)=>s+e[3],0)||1);return {m:w(ENVS.filter(e=>!e[0].startsWith('desk'))),d:w(ENVS.filter(e=>e[0].startsWith('desk')))}}
// 分享带来的注册：全站只用这一个函数（球局分享链接 30%、球员卡二维码 14% 的新注册）

/* ---------- 球场 → 区：区的数字 = 区里各球场之和 + 自己填写的场地 ---------- */
function venueRank(){return b1geo().venues.filter(r=>r.v[6]==='verified').slice().sort((a,b)=>b.score-a.score)}
function regionRows(){return b1geo().regions.map(r=>({...r}))}
function suburbRows(){return regionRows().filter(r=>r.games>0).sort((a,b)=>b.games-a.games).map(r=>({n:r.n,v:r.games}))}

/* ---------- 概览 ---------- */
function kpis(){const M=MM(),one=M.one,all=M.all,P=M.prev||{};
  const k=(key,lab,cur,prev,sp,f=fmt,live,sub,fill)=>{const cmp=!live&&!all&&M.prevOK&&prev>0&&cur!=null,dd=cmp?(cur-prev)/prev:0;
    return `<div class="card kpi"><div class="l">${live?'<span class="live" style="margin:0"><i></i></span>':''}${lab}${help(DEF[key])}</div><div class="v num"${live?' id="kOnline"':''}${fill?' data-fill':''}>${f(cur)}</div><div class="d ${cmp?(dd>.005?'up':dd<-.005?'dn':''):''}">${live?'5 分钟内有操作':cmp?`${dd>=0?'▲':'▼'} ${pct(Math.abs(dd))} ${one?'较昨日同时段':'较上一周期'}`:all?'上线以来':''}${sub?`${cmp||all?' · ':''}${sub}`:''}</div>${sp?spark(sp):''}</div>`};
  const sp=key=>HIST.slice(-15,-1).map(x=>x[key]*PFm(key)),fsp=HIST.slice(-15,-1).map(x=>{const d=b1day(x);return d.st?d.full/d.st:0});
  return `<div class="grid g6">${DEMO_LIVE?k('online','实时在线 <span class="pill w nodot" style="font-size:10.5px">演示数据</span>',S.live.online*PF(),0,null,fmt,1):''}${k('dau',one?'今日活跃':'日均活跃',M.dau,P.dau,sp('dau'))}${k('nu','新注册',M.nu,P.nu,sp('nu'))}${k('games','新球局',M.games,P.games,sp('games'))}
    ${k('apps','申请加入（次数）',M.apps,P.apps,sp('apps'),fmt,0,`${fmt(M.applicants)} 人申请`)}${k('fill','开打时人齐',M.rate,P.rate,fsp,b1pf,0,`${fmt(M.full)} / ${fmt(M.st)} 局`,1)}</div>`}
function funnel(){const F=MM().fun,st=[['访问的人（含未登录）',F.V],['登录的人',F.L],['看了球局详情',F.D],['提交申请',F.A],['申请被接受',F.AC],['打上球',F.PL]],b=st[0][1]||1;
  return `<div class="fun" data-fun="${st.map(s=>Math.round(s[1])).join(',')}">${st.map((s,i)=>`<div class="fs"><span>${s[0]}</span><span class="t"><i style="width:${Math.max(4,s[1]/b*100).toFixed(1)}%;background:${ramp(.9-i*.11)}" data-tv="${fmt(s[1])} 人" data-tl="${s[0]}">${s[1]/b>.12?fmt(s[1]):''}</i></span><span class="p"><b class="num">${fmt(s[1])}</b>${i&&st[i-1][1]?pct(s[1]/st[i-1][1]):''}</span></div>`).join('')}</div>
  <p class="cap">访问的人 = 这段时间的活跃用户（按人去重，含未登录访客）；登录的人含新注册 ${fmt(F.nu)} 人；每一步都是上一步里的人，人数按整段时间去重。</p>`}
function pageOverview(){const m=METRICS.find(x=>x[0]===S.metric)||METRICS[0];
  return `${kpis()}
  <div class="card sec"><div class="ch"><b>${m[1]}趋势</b><small>${S.range===1?'近 14 天，最后一天为今天截至现在':rangeTxt()+' · 已过完的整天'}</small><div class="r chips">${METRICS.map(x=>`<button class="${S.metric===x[0]?'on':''}" data-mt="${x[0]}">${x[1]}</button>`).join('')}</div></div><div id="trend"></div><p class="cap">口径：${esc(DEF[S.metric]||'')}</p></div>
  <div class="grid g21 sec"><div class="card"><div class="ch"><b>最活跃的球友</b><small>${rangeTxt()}</small><div class="r"><span class="chips">${SORTS.map(s=>`<button class="${(S.usort||'score')===s[0]?'on':''}" data-us="${s[0]}">${s[1]}</button>`).join('')}</span><button class="btn sm" data-pg="users">全部 ›</button></div></div>${actDef()}${userTable(topUsers(8),true)}</div>
    ${nowPanel()}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>最活跃的球场</b><small>${rangeTxt()}</small><div class="r"><button class="btn sm" data-pg="venues">全部 ›</button></div></div>${venueTable(venueRank().slice(0,8),true)}<p class="cap">${VDEF}</p></div>
    <div class="card"><div class="ch"><b>哪个区约球最多</b><small>按球场所在区 · 新球局</small><div class="r"><button class="btn sm" data-pg="regions">全部区域 ›</button></div></div>${barsH(suburbRows().slice(0,10),{lw:104})}</div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>大家几点打球</b><small>开打时间分布</small></div>${heat()}</div>
    <div class="card"><div class="ch"><b>从来访到打上球</b><small>${rangeTxt()} · 人数按整段时间去重</small></div>${funnel()}</div></div>`}
/* 今天：只放今天能动手处理的（不受上方时间范围 / 设备筛选影响；真实环境每 10 分钟重算）
 *  今天的球局：还要开打（已人齐 / 今天取消）· 还缺人（2 小时内开打）· 想打没打上 · 申请等处理（15 分钟内失效）
 *  口径：想打没打上 = 今天开打的局里被婉拒、满员自动结束或申请失效，且之后没有加入今天别的局的人（去重）
 *       申请等处理 = 现在还在等发起人确认的申请；15 分钟内失效 = 截止时间在 15 分钟内
 *  需要处理：举报、高风险用户、待审核球场（球局类的已在上面）
 *  值得注意：今天剩余时段的供需缺口、申请最挤的区、最集中的时段 */

/* ---------- 球友 ---------- */
function pageUsers3(){const html=pageUsers(),i=html.indexOf('<div class="card sec"><div class="ch"><b>全部球友</b>'),head=i<0?html:html.slice(0,i);
  const q=(S.q||'').toLowerCase(),k=S.usort||'score',f=S.ust||'all',cnt=st=>USERS.filter(u=>u.st===st).length;
  const list=[...USERS].filter(u=>(f==='all'||u.st===f)&&(!q||u.name.toLowerCase().includes(q)||u.sub.toLowerCase().includes(q)||u.uid.startsWith(q)||String(u.no).includes(q))).map(u=>({u,s:ustat(u)})).sort((a,b)=>b.s[k]-a.s[k]);
  const P=pager('users',list.length);
  return head+`<div class="card sec" id="pg-users"><div class="ch"><b>球友名单</b><small>全部 ${fmt(USERS.length)} 位（不分设备）· 活跃分按${rangeTxt()} · 点一行查看详情和管理</small><div class="r"><input class="search" placeholder="昵称、区域、编号或用户 ID" value="${esc(S.q||'')}" oninput="S.q=this.value;S.pg.users=1;render();const i=document.querySelector('.search');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div></div>
    <div class="tabs">${[['all','全部',USERS.length],...UST_ORDER.map(s=>[s,UST[s][0],cnt(s)])].map(([k2,n,c])=>`<button class="${f===k2?'on':''}" data-ust="${k2}">${n} <span style="color:var(--mut);font-weight:500">${c}</span></button>`).join('')}</div>
    <div class="chips" style="margin-bottom:12px">${SORTS.map(s=>`<button class="${k===s[0]?'on':''}" data-us="${s[0]}">按${s[1]}</button>`).join('')}</div>
    ${userTable(list.slice(P.from,P.to),false,P.from)}${P.html}</div>
  <div class="card sec"><div class="ch"><b>账号状态说明</b><small>每次变更都要写原因，自动通知本人，记入历史和审计日志</small></div><table><tbody>${UST_ORDER.map(s=>`<tr><td style="width:110px"><span class="pill ${UST[s][1]}">${UST[s][0]}</span></td><td style="color:var(--ink2)">${UST[s][2]}</td></tr>`).join('')}</tbody></table></div>`}
function pairBars(rows,o={}){const mx=Math.max(...rows.flatMap(r=>[r.a,r.b]),1),f=o.fv||fmt;
  return `<div class="lg2" style="margin-bottom:8px"><span><i style="background:var(--c1)"></i>手机</span><span><i style="background:var(--c2)"></i>电脑</span></div><div class="pbars" style="--lw:${o.lw||96}px">${rows.map(r=>`<div class="pb"><span class="n">${esc(r.n)}</span><div class="pt"><span data-tv="${f(r.a)}" data-tl="${esc(r.n)} · 手机"><i style="width:${(r.a/mx*100).toFixed(1)}%;background:var(--c1)"></i><em class="num">${f(r.a)}</em></span><span data-tv="${f(r.b)}" data-tl="${esc(r.n)} · 电脑"><i style="width:${(r.b/mx*100).toFixed(1)}%;background:var(--c2)"></i><em class="num">${f(r.b)}</em></span></div></div>`).join('')}</div>`}

/* ---------- 球局 ---------- */

/* ---------- 区域 ---------- */
function pageRegions(){const M=MM(),rows=regionRows(),k=S.rsort||'score',key=r=>r[k]==null?-1e9:r[k];rows.sort((a,b)=>key(b)-key(a));const P=pager('regions',rows.length,15);
  const top=rows.slice().sort((a,b)=>b.score-a.score),grow=rows.filter(r=>r.games>=3&&r.chg!=null).sort((a,b)=>b.chg-a.chg),gap=rows.filter(r=>r.players>20&&r.venues===0).sort((a,b)=>b.players-a.players);
  return `<div class="grid g4">${kpi('有球局的区域',rows.filter(r=>r.games>=1).length+' 个',`共 ${rows.length} 个区`)}${kpi('最活跃',top[0]?top[0].n:'—',top[0]?`活跃度 ${fmt(top[0].score)}`:'')}${kpi('增长最快',grow[0]?grow[0].n:'—',grow[0]?`环比 ▲ ${pct(Math.max(0,grow[0].chg))}`:M.prevOK?'':'上一周期数据不全')}${b1fillKpi()}</div>
  <div class="card sec" id="pg-regions"><div class="ch"><b>全部区域</b><small>${rangeTxt()} · 按球场所在区；区的数字 = 区里各球场之和 + 自己填写的场地</small><div class="r chips">${RSORT.map(s=>`<button class="${k===s[0]?'on':''}" data-rs="${s[0]}">按${s[1]}</button>`).join('')}</div></div>
  <div style="overflow-x:auto"><table data-regions><thead><tr><th>#</th><th>区域</th><th class="r">活跃度 ${help(RDEF)}</th><th class="r">发布</th><th class="r">打上的</th><th class="r">开打时人齐</th><th class="r">申请加入</th><th class="r">到场人次</th><th class="r">新注册</th><th class="r">女生局</th><th class="r">平均 UTR</th><th class="r">环比</th><th>球场</th></tr></thead><tbody>
  ${rows.slice(P.from,P.to).map((r,i)=>`<tr data-rg="${esc(r.n)}" data-g="${r.games.toFixed(3)}"><td class="num" style="color:var(--mut)">${P.from+i+1}</td><td><b style="font-weight:600">${esc(r.n)}</b></td><td class="r num"><b>${fmt(r.score)}</b></td><td class="r num">${fmt(r.games)}</td><td class="r num">${fmt(r.played)}</td><td class="r num">${b1pf(r.fill)}</td><td class="r num">${fmt(r.apps)}</td><td class="r num">${fmt(r.players)}</td><td class="r num">${fmt(r.nu)}</td><td class="r num">${pct(r.women)}</td><td class="r num">${r.utr}</td>
    <td class="r num" style="color:${r.chg==null?'var(--mut)':r.chg>=0?'var(--good)':'var(--crit)'}">${r.chg==null?'—':`${r.chg>=0?'▲':'▼'} ${pct(Math.abs(r.chg))}`}</td><td>${r.venues?`${r.venues} 个${r.top?' · '+esc(r.top):''}`:'<span class="pill w nodot">未收录</span>'}</td></tr>`).join('')}</tbody></table></div>${P.html}<p class="cap">「未收录」= 有人在这个区自己填写场地约球，但还没有收录这个区的球场。${M.prevOK?'':'上一周期数据不全，不显示环比。'}</p></div>`}

/* ---------- 球场 ---------- */
function pageVenues6(){const all=VENUES.map(v=>({v,a:vA(v)})),ok=all.filter(x=>x.v[6]==='verified'),vt=S.vtab||'venues',M=MM(),pend=v=>v[4]==='user'&&v[6]==='pending';
  const rated=ok.filter(x=>x.a.rating);
  const head=`<div class="grid g4">${kpi('已收录球场',ok.length,`另有 ${S.pending} 个待审核`)}${kpi('可以直接打',ok.filter(x=>x.a.vis==='open'||x.a.vis==='social').length,'公开订场或 Social 球局，不用入会')}${kpi('用户提交',all.filter(x=>x.v[4]==='user').length+' 个','发起球局时添加，审核后收录')}${kpi('资料还不全',all.filter(x=>vDone(x.a)<.8).length+' 个','缺订场方式、价格或场地条件','dn')}</div>`;
  const need=`<div class="insight sec"><div><b>球场页暂未上线</b>：前台只用到球场名称、所在区、位置和场地类型。价格、入会费、订场方式、评价和练习墙先在后台整理，前台暂不显示，也不统计。</div></div>
    <div class="grid g2 sec"><div class="card" style="grid-column:1/-1"><div class="ch"><b>先补哪些</b><small>按热度 × 缺的信息排序</small></div><table><tbody>${all.filter(x=>x.v[6]==='verified'&&vDone(x.a)<1).sort((p,q)=>V3HEAT(q.v[0])*(1-vDone(q.a))-V3HEAT(p.v[0])*(1-vDone(p.a))).slice(0,5).map(x=>`<tr data-vd="${x.v[0]}" style="cursor:pointer"><td><b style="font-weight:600">${esc(x.v[2])}</b><br><small style="color:var(--mut)">${esc(x.v[3])}</small></td><td>${[!x.a.book&&'订场方式',x.a.vis&&x.a.vis!=='members'&&x.a.price==null&&'价格',!x.a.cond&&'场地条件',!x.a.fac.length&&'环境设施',x.a.type!=='public'&&x.a.fee==null&&'年费'].filter(Boolean).map(t=>`<span class="pill w nodot" style="margin:2px 4px 2px 0">缺${t}</span>`).join('')||'<span style="color:var(--mut)">—</span>'}</td><td class="r"><span class="dn-p">${pct(vDone(x.a))}</span></td></tr>`).join('')}</tbody></table></div></div>`;
  const vr=venueRank(),RP=pager('venues',vr.length,10);
  const rank=`<div class="card sec" id="pg-venues"><div class="ch"><b>最活跃的球场</b><small>${rangeTxt()} · 只算已核实的球场 · 共 ${vr.length} 个 · 全部球局开打时人齐 <b data-fill>${b1pf(M.rate)}</b></small></div><div data-venues>${venueTable(vr.slice(RP.from,RP.to)).replace(/<td class="num" style="color:var\(--mut\)">(\d+)<\/td>/g,(m,n)=>`<td class="num" style="color:var(--mut)">${+n+RP.from}</td>`)}</div>${RP.html}<p class="cap">${VDEF}</p></div>`;
  let db;
  if(vt==='walls'){const P=pager('walls',WALLS.length,10);
    db=`<div class="card sec" id="pg-walls">${vtabs(vt)}<p class="cap" style="margin:0 0 12px">为「墨尔本网球墙地图」准备（未上线，前台暂不显示）：公园里的公共练习墙也收录，不一定属于某个球场。</p>
    <table><thead><tr><th>练习墙</th><th>区域</th><th>墙面</th><th class="r">面数</th><th>地面</th><th>谁能用</th><th>条件</th><th>评价</th><th>状态</th></tr></thead><tbody>
    ${WALLS.slice(P.from,P.to).map(w=>`<tr><td><b style="font-weight:600">${esc(w[1])}</b>${w[3]?`<br><small style="color:var(--mut)">属于 ${esc((VENUES.find(v=>v[0]===w[3])||[])[2]||'')}</small>`:''}</td><td>${esc(w[2])}</td><td>${WTYPE[w[4]]}</td><td class="r num">${w[5]}</td><td>${w[6]}</td><td>${w[7]==='public'?'<span class="pill g nodot">免费 · 公共</span>':'<span class="pill nodot">会员</span>'}</td><td>${stars(w[8])}</td><td>${w[9]?`${w[9]} <small style="color:var(--mut)">· ${w[10]} 条</small>`:'<span style="color:var(--mut)">—</span>'}</td><td>${w[12]==='verified'?'<span class="pill g">已核实</span>':'<span class="pill w">待核实</span>'}</td></tr>`).join('')}</tbody></table>${P.html}<p class="cap">示例数据 · 共 ${WALLS.length} 面，${WALLS.filter(w=>w[12]!=='verified').length} 面待核实</p></div>`}
  else{const f=S.vf||'all',FL=[['all','全部'],['open','可以直接打'],['members','要入会'],['todo','资料不全'],['nosub','待补区域'],['user','用户提交'],['pending','待审核']];
    const list=all.filter(({v})=>!S.vsub||v[3]===S.vsub).filter(({v,a})=>f==='all'||(f==='open'&&(a.vis==='open'||a.vis==='social'))||(f==='members'&&(a.vis==='guest'||a.vis==='members'))||(f==='todo'&&vDone(a)<.8)||(f==='user'&&v[4]==='user')||(f==='pending'&&v[6]==='pending')||(f==='nosub'&&(v[6]==='nosub'||v[6]==='outside')));
    const P=pager('vdb',list.length,10),dash='<span style="color:var(--mut)">—</span>';
    db=`<div class="card sec" id="pg-vdb">${vtabs(vt)}<div class="chips" style="margin-bottom:12px">${FL.map(x=>`<button class="${f===x[0]?'on':''}" data-vf="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div style="overflow-x:auto"><table><thead><tr><th>球场</th><th>类型</th><th>场地</th><th>场地条件</th><th>环境</th><th class="r">年费</th><th>不是会员能打吗</th><th class="r">完整度</th><th>状态</th></tr></thead><tbody>
    ${list.slice(P.from,P.to).map(({v,a})=>{const u=pend(v),surf=a.surf.length?a.surf.map(s=>VSURF[s]).join(' / '):'';return `<tr data-vd="${v[0]}" style="cursor:pointer"><td><b style="font-weight:600">${esc(v[2])}</b><br><small style="color:var(--mut)">${esc(v[3])} ${VPC[v[3]]||''}${v[4]==='user'?' · '+esc(v[5])+' 提交':''}</small>${v[10]?' <span class="pill w nodot">区域待核实</span>':''}</td><td>${u?dash:VTYPE[a.type]}</td>
      <td>${surf?`${surf}${!u&&(a.courts||a.indoor)?`<br><small style="color:var(--mut)">${a.courts?a.courts+' 片':''}${a.indoor?` · ${a.indoor} 片室内`:''}</small>`:''}`:dash}</td><td>${u?dash:stars(a.cond)}</td>
      <td style="max-width:150px"><small style="color:var(--ink2)">${!u&&a.fac.length?a.fac.map(k=>VFAC[k]).join(' · '):dash}</small></td>
      <td class="r num">${u?dash:a.type==='public'?'<span style="color:var(--mut)">不用入会</span>':a.fee?'$'+fmt(a.fee):dash}</td><td>${u?dash:visPill(a)}</td>
<td class="r">${u?dash:`<span class="${vDone(a)<.8?'dn-p':''}">${pct(vDone(a))}</span>`}</td>
      <td>${v[6]==='verified'?'<span class="pill g">已收录</span>':v[6]==='pending'?'<span class="pill w">待审核</span>':v[6]==='nosub'?'<span class="pill w">待补区域</span>':v[6]==='outside'?'<span class="pill">服务范围外</span>':v[6]==='merged'?'<span class="pill">已合并</span>':'<span class="pill c">已驳回</span>'}</td></tr>`}).join('')}</tbody></table></div>${P.html}
    <p class="cap">点一行查看和编辑。用户添加球场时只填全称、简称、所在区和场地类型；类型、价格、年费、订场方式由运营核实后补充。评价和评分要等球场页上线后才收集（只有真的在这里打过的人能评）。</p></div>`}
  return head+need+rank+db}

/* ---------- 待审核 ---------- */
function pageReview(){const pend=VENUES.filter(v=>v[6]==='pending'),f=S.tab2==='reports'?'reports':S.tab2==='sideline'?'sideline':'venues',ago=v=>v[0]==='v17'?'2 小时前':v[0]==='v48'?'昨天':'3 天前';
  const dup=v=>v[0]==='v17';
  return `<div class="card"><div class="tabs"><button class="${f==='venues'?'on':''}" data-tab2="venues">用户提交的球场 ${pend.length?`(${pend.length})`:''}</button><button class="${f==='reports'?'on':''}" data-tab2="reports">举报 (${S.reports.filter(r=>r.status==='open').length})</button><button class="${f==='sideline'?'on':''}" data-tab2="sideline">场边 (${sbReviewOpen()})</button></div>
  ${f==='sideline'?sbReviewPane():f==='venues'?(pend.length?`<table><thead><tr><th>球场全称 / 简称</th><th>所在区</th><th>场地类型</th><th>提交人</th><th class="r">已被使用</th><th>系统检查</th><th></th></tr></thead><tbody>${pend.map(v=>{const a=vA(v);return `<tr><td><b style="font-weight:600">${esc(v[1])}</b><br><small style="color:var(--mut)">${esc(v[2])}</small></td><td>${esc(v[3])} <small style="color:var(--mut)">${VPC[v[3]]||''}</small></td><td>${(a.surf.length?a.surf:['hard']).map(s=>VSURF[s]).join(' / ')}</td><td>${esc(v[5]||'')}<br><small style="color:var(--mut)">${ago(v)}</small></td><td class="r num">${V3HEAT(v[0])} 局</td>
    <td>${dup(v)?'<span class="pill w">150 m 内有相似球场</span>':'<span class="pill g">地址可定位</span>'}</td><td><div class="rowacts"><button class="btn sm p" data-act="vok" data-id="${v[0]}">通过</button><button class="btn sm" data-act="vmerge" data-id="${v[0]}">合并</button><button class="btn sm" data-act="vno" data-id="${v[0]}">驳回</button></div></td></tr>`}).join('')}</tbody></table>`:'<div class="empty">都处理完了 ✓</div>')
  :`<table><thead><tr><th>举报人</th><th>对象</th><th>类型</th><th>来源</th><th>原因</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>${S.reports.map(r=>`<tr><td>${esc(r.who)}</td><td><b style="font-weight:600">${esc(r.target)}</b></td><td>${r.type}</td><td>${REP_SRC(r)}</td><td>${REP_RC[r.rc]||'其他'}${r.note?`<br><small style="color:var(--mut)">${esc(r.note)}</small>`:''}</td><td>${r.at}</td><td>${r.status==='open'?'<span class="pill w">待处理</span>':r.status==='actioned'?'<span class="pill g">已处理</span>':'<span class="pill">已忽略</span>'}</td>
    <td>${r.status==='open'?`<div class="rowacts"><button class="btn sm" data-adm="msgs" data-id="${r.id}">查看对话</button><button class="btn sm p" data-act="rok" data-id="${r.id}">处理</button><button class="btn sm" data-act="rno" data-id="${r.id}">忽略</button></div>`:''}</td></tr>`).join('')}</tbody></table>`}</div>
  <p class="cap">${f==='reports'?'举报来源：用户在球员卡和聊天里站内举报（reports.source = in_app，原因 5 选 1，「其他」必须写说明）；也可以写邮件到 safety@nanbanqiu.app，由管理员录入（source = email）。同一个人对同一对象未处理时只记一条；不会告诉对方是谁举报的。':''}用户添加球场时只填全称、简称、所在区和场地类型；150 m 内已有收录的球场会直接合并。通过后对所有人可见，合并会把已有球局移到目标球场；所有操作写入审计日志。</p>`}

/* ---------- 球员卡 ---------- */

/* ---------- 分享与拉新 ---------- */
function pageGrowth(){const M=MM(),SH=b1share();
  const tbl=(G,apps)=>`<table><thead><tr><th>渠道</th><th class="r">分享</th><th class="r">被打开</th><th class="r">人均被打开次数</th><th class="r">带来注册</th>${apps?'<th class="r">带来申请</th>':''}</tr></thead><tbody>${G.rows.map(r=>`<tr><td>${r.n}</td><td class="r num">${fmt(r.shares)}</td><td class="r num">${fmt(r.opens)}</td><td class="r num">${(r.shares?r.opens/r.shares:0).toFixed(1)} 次</td><td class="r num">${fmt(r.regs)}</td>${apps?`<td class="r num">${fmt(r.apps)}</td>`:''}</tr>`).join('')}</tbody></table>`;
  const src=SRC.map((s,i)=>({n:s[1],v:M.nu*SRCW[i]/100})).sort((a,b)=>b.v-a.v);
  return `<div class="grid g4">${kpi('新注册',fmt(M.nu),rangeTxt())}${kpi('球局被分享',fmt(SH.game.shares),'复制链接 / 文案 / 海报 / 系统分享（PWA）/ 网页扫码（Web）')}${kpi('球员卡被分享',fmt(SH.card.shares),'朋友圈 / 小红书 / 复制链接')}${kpi('分享带来注册',fmt(SH.regs),`占新注册 ${pct(M.nu?SH.regs/M.nu:0)} · 每次分享被打开 ${(SH.shares?SH.opens/SH.shares:0).toFixed(1)} 次`)}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>球局分享</b><small>链接 ?s= 归因 · Web 没有系统分享，PWA 的「发到微信群」= 复制文案</small></div>${tbl(SH.game,true)}</div>
    <div class="card"><div class="ch"><b>球员卡分享</b><small>card_share.channel · 两端相同</small></div>${tbl(SH.card,false)}</div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>新球友从哪来</b><small>首次打开时的来源</small></div>${barsH(src,{lw:104})}</div><div class="card"><div class="ch"><b>每日新注册</b><small>${S.range===1?'近 14 天':rangeTxt()}</small></div><div id="trend2"></div></div></div>`}

/* ---------- 访问与页面 ---------- */

/* ---------- 手机与电脑 ---------- */

/* ---------- 打开方式 ---------- */

/* ---------- 风险用户（规则与约定；风险表由 pageSafety6 替换） ---------- */

/* ---------- 球局全流程 ---------- */

/* ---------- 打完之后 ---------- */

/* ---------- 成长与徽章 ---------- */

/* ---------- 提醒与约定 ---------- */

/* ---------- 数据口径 ---------- */
function b1evDay(name,x){const d=x.dau,g=x.games,a=x.apps,ses=x.sessions,nu=x.nu,dd=b1day(x),lg=nu+d*.08;
  const r=Math.max(0,a-x.appr);   // 没通过的申请，按 b1apps 的比例拆开（与「申请的结果」一致）
  const m={session_start:ses,page_view:ses*4.6,page_time:ses*4.3,app_hide:ses*.8,app_show:ses*.7,pwa_first_launch:nu*.3,pwa_installed:nu*.08,
    login_open:lg*1.6,login_send_code:lg*1.25,login_verify:lg*1.05,login_success:lg,signup_complete:nu,logout:d*.004,
    game_select:d*.9,game_view:d*2.1,game_create_start:g*1.6,game_create_submit:g,game_edit:g*.14,game_postpone:g*.03,unfilled_action:g*.1,game_cancel_open:g*.16,game_cancel:g*.12,
    game_apply_open:a*1.35,game_apply_submit:a,game_join_instant:g*.1,host_decide:x.appr+r*.38,host_decline_open:r*.5,apply_expired:r*.14,apply_withdraw:r*.15,game_leave_open:x.appr*.06,game_leave:x.appr*.042,req_sort:g*.05,req_expand:g*.04,
    chat_open:x.msgs*.7,chat_send:x.msgs,invite_open:x.inv*1.5,invite_send:x.inv,invite_accept:x.inv*.5,invite_decline:x.inv*.3,
    card_view:d*.72,game_share_open:x.shares*.9,share_copy_link:x.shares*.22,card_share_open:x.shares*.6,card_share:x.shares*.41,card_customize:d*.02,card_custom_open:d*.015,
    game_start_check:dd.st,game_counted:dd.full*.98,recap_notify:dd.full*2.6,recap_open:dd.full*1.2,
    notif_deliver:g*6.2,notif_open:g*2.4,pact_view:nu*1.1,pact_accept:nu*1.05,soon_open:dd.full*1.1,noshow_confirm:dd.st*.014,badge_earned:dd.full*.2,level_up:dd.full*.06};
  const v=m[name];return v!=null?v:d*(.002+.04*b1h(name)*b1h(name+'x'))}
const b1evToday=()=>EVDEF.reduce((s,e)=>s+Math.round(b1evDay(e[0],T)*PFm('dau')),0);
METRIC_DEFS.length=0;[
 ['活跃用户（DAU）',DEF.dau,'daily_metrics.dau ← events；区间去重 active_users(from,to)'],
 ['多天的人数','申请人数、访问人数、漏斗里的人数都按整段时间去重（count distinct）；次数可以相加，人数不能。访问的人 = 区间活跃（含未登录）','active_users(from,to)'],
 ['会话','session_start：30 分钟无活动后再操作换新 sid（localStorage 记最后活动时间）','sessions'],
 ['页面访问','page_view 次数；停留时长取 page_time.ms；screen 按两端各自的页面（Web 没有独立的「我的」页，通知是弹层）','page_traffic(from,to)'],
 ['手机 / 电脑','按事件公共字段 device（mobile / desktop，由设备推断）区分；build（pwa / web）只表示加载的是哪个文件，不用来分平台','events.device'],
 ['站外进入','session_start.entry = share / external；分享链接按 ?s= 归到渠道（link / text / sys / xhs / moments / webqr）','sessions · link_visits'],
 ['站内跳转','game_view.via / card_view.via 不是 link / share_link 的部分','events'],
 ['登录','login_success（服务端用它把 anon_id 和 user_id 关联）','events · identity_links'],
 ['新注册',DEF.nu,'events(signup_complete) · users'],
 ['总注册球友','上线以来每天新注册（signup_complete）之和；与「新注册」同一来源，任何范围的新注册 ≤ 总注册','users'],
 ['新球局 / 发起',DEF.games,'games'],
 ['申请加入（次数）',DEF.apps,'game_participants(role=player) · v_applications_daily'],
 ['申请人数',DEF.applicants,'game_participants（count distinct user_id）'],
 ['申请通过率','host_decide(ok=true) ÷ game_apply_submit（同一周期）；等价于 game_participants 里 approved ÷ 全部申请行','v_applications_daily'],
 ['申请的结果','通过 host_decide(ok=true) · 发起人婉拒 host_decide(ok=false) · 满员自动结束 decline_reason=full_auto · 超时失效 apply_expired（timeout）· 屏蔽自动结束 decline_reason=blocked · 申请人撤回 apply_withdraw（status=withdrawn）','game_participants'],
 ['婉拒理由','host_decide.reason：known「这局想和熟悉的球友打」· level「想找水平更接近的」· pass「这次先不了」','game_participants.decline_reason'],
 ['申请截止','失效时间 = max(申请时间, 开打前 60 分) + 15 分（不再被开打截断，开打后 30 分钟内仍可申请）：所有需要确认的球局都适用','application_deadline()'],
 ['开打时人齐（成局率）',DEF.fill,'game_start_checks · v_game_fill · fill_rate(from,to)'],
 ['开打时还缺人','game_start_check：到开打时间人数仍不足（含照常开打的）；reason 记差在哪','game_start_checks'],
 ['还缺人提醒','开打前 2 小时还缺人提醒发起人（刚发布或刚改过时间 20 分钟内的不提醒）；发起人的选择记在 unfilled_action','events(unfilled_action) · notification_deliveries'],
 ['临时局','game_create_submit.minutes_to_start ≤ 120','events'],
 ['临时退出','game_leave：开打前 24 小时内退出；确认（或直接加入）后 10 分钟内退出不算（grace=true），球局大改后选「来不了」也不算（after_change=true）','game_participants(status=left, left_at)'],
 ['计入场次','game_counted：未取消 · 已结束 · 结束时仍是已通过 · 至少 2 人（含线下补位）· 没有被确认爽约','v_counted_games'],
 ['确认爽约','noshow_confirm：发起人反馈，或两人局里另一位反馈，或 2 人以上反馈；申诉期间不计入','v_confirmed_noshow'],
 ['赴约率（球员卡）','场次 ÷（场次 + 确认爽约）','player_cards'],
 ['赴约率（等级）','场次 ÷（场次 + 确认爽约 + 0.5 × 临时退出）','player_cards · user_level_log'],
 ['等级门槛（v3）','Lv2 相伴：20 场；Lv3 常伴：50 场 · 赴约率 90% · 好评率 30% · 好评人数 ≥10；Lv4 挚友：100 场 · 95% · 40% · ≥25；Lv5 南伴之光：200 场 · 98% · 50% · ≥50 · 半年内零举报。逐级满足','user_level_log'],
 ['等级回落','近 90 天确认爽约 ≥2 次，等级最高 Lv3；≥4 次，最高 Lv2','v_confirmed_noshow'],
 ['好评率（等级）','（给过好评的不同球友 + 1）÷（max(一起打过的不同球友, 给过好评的人) + 4）','user_kudos_v2 · impressions'],
 ['徽章稀有度','拥有的人 ÷ 打过至少 1 场（计入场次）的人；≤50% 时前台显示「只有 x% 的球友有」','v_badge_rarity'],
 ['女生局占比','game_create_submit(women=true) ÷ 全部新球局','games'],
 ['球员卡被查看','card_view(own=false)','card_views(from,to)'],
 ['站外打开球员卡','card_view(via=link)：从 /p/{no} 分享页打开','card_views(from,to)'],
 ['改球员卡','card_customize（即时生效，没有保存这一步；field = seal / animal / color / theme / avatar_kind）。入口：PWA 在「我的」页球员卡下方；Web 在打开自己的球员卡后左侧','events'],
 ['分享带来注册','session_start(entry=share) 的人 7 天内 signup_complete；全站只用这一个数（b1share）','sessions · identity_links · users'],
 ['人均被打开次数','分享链接被打开的次数 ÷ 分享次数（一次分享可能被很多人打开，可以大于 1，所以不写成百分比）','link_visits'],
 ['推送 / 通知开启','push_enable(result=granted)，按 device 分手机 / 电脑；全站只用这一个值（b1push）','push_subscriptions · user_devices'],
 ['提醒去向','notif_deliver(channel)：正在用的设备优先，否则优先推手机，手机没开推送才推电脑；出发类（开打前 30 分钟、取消、改时间、顺延）在电脑上看到也同时推手机；22:00–08:00（墨尔本时间）不紧急的推迟到 8 点，12 小时内开打的球局相关提醒照常推送','notification_deliveries'],
 ['约定同意率','pact_accept ÷ pact_view(via=gate)','events'],
 ['已添加到主屏幕','iPhone：pwa_first_launch；安卓 / 电脑：pwa_installed；按人去重','events'],
 ['使用数据开关','analytics_off 之后不再发任何事件（含未登录访客）；登录后同步 users.analytics_opt_out，服务端事件也遵守','users.analytics_opt_out'],
 ['活跃分（最活跃球友）','发起并成局×4 + 到场打球×3 + 申请加入×1 + 发出邀约×1 + 留印象×0.5 + 活跃天数×1 − 爽约×5，按所选时间范围计算','user_activity(from,to) · activity_weights'],
 ['球场活跃度',VDEF,'v_venue_activity_30d'],
 ['区域','区的数字 = 区里各球场之和 + 在这个区自己填写场地的球局；不在常用区列表里的区也照样归入','v_suburb_activity'],
 ['风险分','按 risk_rules 的权重求和，60 以上为高，30–59 为观察；每次提醒和处理写入 risk_alerts','user_risk · risk_rules · risk_alerts'],
 ['举报','站内举报（球员卡 / 聊天，source = in_app，report_submit）+ 邮件由管理员录入（source = email）；同一举报人对同一对象未处理时只算一条；风险规则「被不同的人举报」按不同举报人计','reports · report_submit']].forEach(m=>METRIC_DEFS.push(m));
FLOW11.length=0;[
 ['发布',['game_create_start','game_create_submit'],'开打前 2 小时内发布可以开「不用我确认」（join_mode=instant）；可以选「约满或开打后不再公开」（hide_done）；之后改时间会重新判断是不是临时局'],
 ['球友约定门槛',['pact_view','pact_accept'],'第一次申请、发起、约人或接受邀约前，先看到并同意球友约定（pact_view.via=gate；pact_accept.via=apply / create / invite / accept）'],
 ['申请 / 加入',['game_apply_open','game_apply_submit','game_join_instant','apply_withdraw','host_decline_open','host_decide','women_apply_blocked'],'需要确认时由发起人接受或婉拒（理由 known / level / pass）；设了少遇到的人不能直接加入；非女生请求女生局被 API 拒绝'],
 ['申请结束',['apply_expired','host_decide'],'申请截止 = min(max(申请时间, 开打前 60 分) + 15 分, 开打)，所有需要确认的球局都适用；人齐后其余申请自动结束（decline_reason=full_auto，对方看到「这局已经满员」）；屏蔽自动结束（blocked，不通知）'],
 ['通过之后',['game_leave_open','game_leave','game_edit','game_postpone','game_cancel_open','game_cancel'],'确认后 10 分钟内退出不算临时退出（grace）；开打前 24 小时内退出算临时退出；大改后已加入的人可以选「来不了」直接退出，不算临时退出（after_change）'],
 ['约满后不再公开',['game_view'],'开了 hide_done 的局，约满或开打后不再出现在发现页；已加入的人和拿到链接的人仍能打开'],
 ['还缺人',['unfilled_action','notif_deliver'],'开打前 2 小时还缺人提醒发起人（kind=unfilled）：再分享 / 放宽水平 / 顺延 1 小时 / 再发一局 / 取消；有人退出空出位置，通知想来的人「又有空位了」（kind=reopen）；开打后还缺人自动结束招人（kind=unfilled_end）'],
 ['开打前 30 分钟',['soon_open','notif_open','notif_deliver'],'出发提醒卡片（kind=soon），在电脑上看到也同时推送到手机'],
 ['开打',['game_start_check'],'按开打时间检查人数，记录人齐 / 还缺人及原因（filled、need、applied_n、reason）'],
 ['结束',['game_counted','noshow_report','noshow_undo','noshow_appeal','noshow_confirm'],'满足条件计入场次；结束后 48 小时内可以反馈没来，被反馈的人可以申诉'],
 ['赛后 1 小时',['recap_notify','recap_open','pref_set','feel_set','impression_give','recap_done'],'只发一次；22:00–08:00（墨尔本时间）顺延到 8 点；24 小时内没送出就不发；7 天内可以修改'],
 ['之后',['follow_notify','follow_open','less_effect','invite_open','invite_send','invite_accept','invite_decline'],'多遇到：同一人每周最多提醒 1 次；少遇到：排序后移、不能直接加入、不能邀约、私信不提醒（同局时段除外）；邀约没回复会过期（通知 kind=invite_expired，没有单独的事件）'],
 ['成长',['badge_earned','badge_view','badge_share','level_up','level_view'],'徽章获得后永久保留；等级逐级满足，近 90 天确认爽约设上限']].forEach(f=>FLOW11.push(f));
function pageEvents(){const tab=S.tab2==='metrics'||S.tab2==='flow'?S.tab2:'events',pf=PFm('dau'),D7=HIST.slice(-8,-1);
  const tabs=`<div class="tabs"><button class="${tab==='events'?'on':''}" data-tab2="events">埋点事件 (${EVDEF.length})</button><button class="${tab==='metrics'?'on':''}" data-tab2="metrics">指标口径 (${METRIC_DEFS.length})</button><button class="${tab==='flow'?'on':''}" data-tab2="flow">事件流程</button></div>`;
  const body=tab==='events'?`<table data-events><thead><tr><th>事件</th><th>分类</th><th>说明</th><th>属性</th><th>来源</th><th class="r">今天</th><th class="r">近 7 天</th></tr></thead><tbody>
    ${EVDEF.map(e=>`<tr><td class="mono" data-ev="${e[0]}">${e[0]}</td><td><span class="pill nodot">${e[1]}</span></td><td>${esc(e[2])}</td><td class="mono" style="color:var(--mut)">${esc(e[3]||'—')}</td><td>${e[4]==='server'?'<span class="pill nodot ev-sv">服务端</span>':'<span class="pill nodot">前端 · 两端</span>'}</td><td class="r num">${fmt(Math.round(b1evDay(e[0],T)*pf))}</td><td class="r num">${fmt(D7.reduce((s,x)=>s+Math.round(b1evDay(e[0],x)*pf),0))}</td></tr>`).join('')}</tbody></table>`
    :tab==='metrics'?`<table><thead><tr><th>指标</th><th>怎么算</th><th>数据来源</th></tr></thead><tbody>${METRIC_DEFS.map(m=>`<tr><td><b style="font-weight:600">${m[0]}</b></td><td>${esc(m[1])}</td><td class="mono" style="color:var(--mut)">${m[2]}</td></tr>`).join('')}</tbody></table>`
    :`<div class="flow11">${FLOW11.map((f,i)=>`<div class="fl"><span class="fn num">${i+1}</span><div><b>${f[0]}</b><p>${f[2]}</p><div>${f[1].map(e=>`<span class="mono">${e}</span>`).join('')}</div></div></div>`).join('')}</div>`;
  return `<div class="card">${tabs}${body}</div><p class="cap">唯一来源：events_spec.md v2（${EVDEF.length} 个事件），前台两端、本页和 schema.sql 的 event_definitions 都按它登记；「前端」事件两端必须同名同 props，「服务端」事件由 API 在状态变化时写入。每条都带公共字段 ev、at、uid、anon、sid、device、build、env、os、scr。不记录聊天内容、手机号、精确位置和性别值；关闭「使用数据」后不发任何事件（含未登录访客）。</p>`}

/* ---------- 用户详情：性别与男改女锁 ---------- */
function udHTML(u){const s=ustat(u),r=RISK.find(x=>x.uid===u.id),G=b1g(u),gn={f:'女生',m:'男生','':'未填写'}[G.g];
  return `<div class="ud-h"><div class="who">${av(u).replace('class="a"','class="a" style="width:48px;height:48px;font-size:18px;background:'+u.col+'"')}<div><b style="font-size:18px">${esc(u.name)}</b><small>编号 #${String(u.no).padStart(4,'0')} · ${esc(u.sub)} · UTR ${(+u.utr).toFixed(1)}</small></div></div><button class="ud-x" data-udx>×</button></div>
  <div class="ud-id">${idCell(u)} ${stPill(u)} <button class="btn sm" data-adm="phone">查看完整手机号</button></div>
  <div class="ud-k">${[['打过',u.played+' 场'],['赴约率',pct(u.att)],['活跃分',s.score],['最近活跃',u.last<60?u.last+' 分钟前':u.last<1440?Math.round(u.last/60)+' 小时前':Math.round(u.last/1440)+' 天前']].map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>
  ${r?`<div class="ud-risk"><b>风险分 ${r.score}</b>${r.sig.map(x=>`<span class="pill nodot">${esc(x[0])} × ${x[1]}</span>`).join(' ')}</div>`:''}
  <div class="ud-sec"><b>账号状态</b><div class="ud-st">${UST_ORDER.filter(x=>x!=='deleted').map(x=>`<button class="${u.st===x?'on':''}" data-udst="${x}">${UST[x][0]}</button>`).join('')}</div>
    <div id="udForm"></div></div>
  <div class="ud-sec"><b>性别</b><div class="ud-g"><span>${gn}</span>${G.m2f?'<span class="pill w">男改女锁 · 已用掉唯一一次男改女</span>':'<small>男改女：还没用过</small>'}${u.st==='review'?'<span class="pill w">账号审核中 · 暂时看不到女生局</span>':''}</div>
    ${G.hist.length?`<div class="ud-hist" style="margin-top:8px">${G.hist.map(h=>`<div><span class="pill nodot">${esc(h[0])}</span><span></span><small>${esc(h[1])} · ${esc(h[2])}</small></div>`).join('')}</div>`:''}
    <div class="ud-ops" style="margin-top:10px"><button class="btn sm" data-udg="clear" ${G.g?'':'disabled'}>清除性别（保留男改女锁）</button><button class="btn sm" data-udg="unlock" ${G.m2f?'':'disabled'}>解除男改女锁</button></div><div id="udgForm"></div>
    <p class="cap">性别只用于女生局，不显示在球员卡上，事件里也不记录性别值。与前台一致：第一次填写立即生效；女生改男生随时可以；男生改女生只能一次（注册时选了男生、之后再改也算这一次），用过之后改回男生就不能再改女生——这就是「男改女锁」。清除性别不会解除锁；解除锁必须写原因。冒用女生身份，核实后永久封号。</p></div>
  <div class="ud-sec"><b>其他操作</b><div class="ud-ops"><button class="btn sm" data-udop="name">重置昵称</button><button class="btn sm" data-udop="avatar">重置头像</button><button class="btn sm" data-udop="notify">发一条通知</button>${u.st==='deleted'?'<button class="btn sm" data-udop="restore">恢复账号</button>':''}</div></div>
  <div class="ud-sec"><b>状态历史</b>${u.hist.length?`<div class="ud-hist">${u.hist.map(h=>`<div><span class="pill ${UST[h.st][1]}">${UST[h.st][0]}</span><span>${esc(h.why||'')}</span><small>${esc(h.by)} · ${esc(h.at)}</small></div>`).join('')}</div>`:'<p class="cap" style="margin:6px 0 0">一直正常</p>'}</div>
  <div class="ud-sec"><b>来源</b><p class="cap" style="margin:6px 0 0">${u.src[1]} · 主要用${b1h(u.id+'p')<.66?'手机':'电脑'}</p></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-udg]');if(!b||b.disabled)return;e.stopPropagation();const u=S.ud&&USERS.find(x=>x.id===S.ud);if(!u)return;const G=b1g(u),k=b.dataset.udg;
  if(k==='clear'){G.g='';G.hist.unshift(['管理员清除性别'+(G.m2f?'（男改女锁保留）':''),'Han','刚刚']);S.audit.unshift(['Han','user.gender_clear',`${u.name} · ${u.uid.slice(0,8)}`,'刚刚']);openUD(u.id);return}
  if(k==='unlock'){document.getElementById('udgForm').innerHTML=`<div class="ud-f"><label style="margin-top:0">解除原因（必填，写入审计日志）</label><input class="search" id="udgWhy" style="width:100%" placeholder="例如：已核实身份证件"><div style="display:flex;gap:8px;margin-top:10px"><button class="btn p" data-udg="unlockgo">确认解除</button><button class="btn" data-udg="cancel">取消</button></div></div>`;return}
  if(k==='cancel'){document.getElementById('udgForm').innerHTML='';return}
  if(k==='unlockgo'){const i=document.getElementById('udgWhy'),why=(i.value||'').trim();if(!why){i.focus();i.style.borderColor='var(--crit)';return}
    G.m2f=false;G.hist.unshift(['管理员解除男改女锁 · '+why,'Han','刚刚']);S.audit.unshift(['Han','user.gender_unlock',`${u.name} · ${u.uid.slice(0,8)} · ${why}`,'刚刚']);openUD(u.id)}},true);

/* ---------- 风险提醒与账号状态同步 ---------- */
USERS.forEach(u=>u.lv=b1lv(u));
function b1sync(){RISK.forEach(r=>{const u=USERS.find(x=>x.id===r.uid);if(u&&['limited','suspended','banned','review'].includes(u.st)&&(r.st==='open'||r.st==='watching'))r.st='handled'})}
document.addEventListener('click',e=>{if(e.target.closest('[data-udgo]'))setTimeout(()=>{b1sync();drawNav()},0)});
function drawNav(){b1sync();const rv=S.pending+S.reports.filter(r=>r.status==='open').length+sbReviewOpen(),rk=RISK.filter(r=>r.st==='open').length;
  $('#nav').innerHTML=PAGES.map(p=>p[0]==='h'?`<div class="navh">${p[1]}</div>`:`<button class="${S.page===p[0]?'on':''}" data-pg="${p[0]}"><svg class="ic" viewBox="0 0 24 24">${IC[p[0]]}</svg>${p[1]}${p[0]==='review'&&rv?`<i>${rv}</i>`:p[0]==='safety'&&rk?`<i>${rk}</i>`:''}</button>`).join('');
  $('#rng').innerHTML=RANGES.map(r=>`<button class="${S.range===r[0]?'on':''}" data-rg="${r[0]}">${r[1]}</button>`).join('');
  $('#plat').innerHTML=[['all','全部设备'],['pwa','手机'],['web','电脑']].map(p=>`<button class="${S.plat===p[0]?'on':''}" data-pl="${p[0]}" title="按设备：事件的 device 字段">${p[1]}</button>`).join('')}

/* ---------- 渲染 ---------- */
function b1wrap(root){root.querySelectorAll('table').forEach(t=>{const p=t.parentElement;if(!p||p.classList.contains('tw')||p.style.overflowX==='auto')return;const w=document.createElement('div');w.className='tw';p.insertBefore(w,t);w.appendChild(t)})}
function render(){b1sync();drawNav();$('#pt').textContent=TITLES[S.page];
  const P={regions:pageRegions7,games:pageGames,env:pageEnv,users:pageUsers3,venues:pageVenues8,platform:pagePlatform,traffic:pageTraffic,safety:pageSafety6,overview:pageOverview,cards:pageCards6,growth:pageGrowth,review:pageReview,events:pageEvents,admin:pageAdmin,cities:pageCities,life:pageLife,after:pageAfter,grow:pageGrow,sb:pageSb,stopic:pageSbTopic,ssched:pageSbSched,sguide:pageSbGuide}[S.page]||pageOverview;
  SEED=20261002+S.range*7+(S.plat==='pwa'?3:S.plat==='web'?5:0);$('#page').innerHTML=P();b1wrap($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));if(typeof cardSrcDecorate==='function')cardSrcDecorate($('#page'));
  const one=S.range===1,days=one?HIST.slice(-14):inRange(),lab=(x,i,a)=>`${md(x.d)} 周${WD[x.d.getDay()]}${one&&i===a.length-1?'（今天，截至现在）':''}`,m=METRICS.find(x=>x[0]===S.metric)||METRICS[0];
  if($('#trend'))lineChart($('#trend'),days.map((x,i,a)=>[md(x.d),x[m[0]]*PFm(m[0]),lab(x,i,a)]),m[1],v=>fmt(v),one);
  if($('#trend2'))lineChart($('#trend2'),days.map((x,i,a)=>[md(x.d),x.nu*PFm('nu'),lab(x,i,a)]),'新注册',v=>fmt(v),one);
  drawEnvTrend();
  if($('#plTrend')){const dv=one?HIST.slice(-15,-1):inRange();lineMulti($('#plTrend'),dv.map(x=>md(x.d)),[{name:'手机',color:css('--c1'),vals:dv.map(x=>B3.ROLL[x.di].mobile.dau)},{name:'电脑',color:css('--c2'),vals:dv.map(x=>B3.ROLL[x.di].desktop.dau)}],v=>fmt(v))}
  if($('#fcount'))$('#fcount').textContent='今天已记录 '+fmt(b1evToday())+' 个事件'}









































