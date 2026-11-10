# 南伴球 · 事件字典 v2（唯一来源）

规则
- 只在「结果」发生时记业务事件（创建成功、申请成功、真的婉拒），点击类用 *_open / *_click。
- 公共字段（每条都带，前端自动加）：ev, at, uid, anon, sid, device(mobile|desktop), build(pwa|web), env, os, scr, props
  - device 由设备推断（AENV.device），不是由加载了哪个文件决定；build 才是文件。
  - sid：30 分钟无活动后换新（localStorage 记最后活动时间）。
- 隐私：不记录聊天内容、手机号、精确位置、性别值；用户关闭「使用数据」后不发任何事件（含未登录访客）。
- source: C = 前端（两端都必须发，同名同 props），S = 服务端/API 层。
- 场边（sb_*，第八批 F2）：两端都发（网页端 F3 起）；post_id 是场边发布的 id，不记发布和回复的内容。

| 事件 | 分类 | 来源 | 说明 | props |
|---|---|---|---|---|
| session_start | 访问 | C | 新会话开始（身份恢复之后再发） | entry(share/external/direct/push), ref, landing(路径+hash), utm_source, utm_medium, utm_campaign, s, f, source(manifest ?source=), standalone, lang, vw |
| page_view | 访问 | C | 切换页面（含首屏、分享落地页） | screen, entry |
| page_time | 访问 | C | 离开页面时停留时长 | screen, ms |
| app_hide | 访问 | C | 页面转到后台 | — |
| app_show | 访问 | C | 页面回到前台 | — |
| pwa_install_prompt | 安装 | C | 浏览器给出安装提示 | — |
| pwa_installed | 安装 | C | 安装完成 | os |
| pwa_first_launch | 安装 | C | 第一次从主屏幕打开 | os |
| a2hs_open | 安装 | C | 打开「添加到主屏幕」引导 | env |
| analytics_off | 隐私 | C | 关闭使用数据（发完这一条后停止） | — |
| analytics_on | 隐私 | C | 重新打开使用数据 | — |
| login_open | 登录 | C | 打开登录（含被动触发） | trigger(apply/create/invite/chat/manual/sideline/...) |
| login_send_code | 登录 | C | 发送验证码（号码格式通过才发） | cc |
| login_verify | 登录 | C | 提交验证码 | ok |
| login_success | 登录 | C | 登录成功 | is_new, trigger, entry |
| signup_complete | 登录 | C | 新用户填完资料 | ntrp, clubs_n, gender_given, avatar_kind |
| logout | 登录 | C | 退出登录（之后换新 anon） | — |
| account_blocked | 账号 | C | 点到账号状态不允许的操作，看到说明 | action, status |
| account_delete | 账号 | C | 本人注销账号（确认之后） | upcoming_left, hosted_cancelled |
| account_restore | 账号 | C | 注销 30 天内登录后恢复账号 | — |
| filter_open | 发现 | C | 打开筛选 | — |
| filter_reset | 发现 | C | 重置筛选 | — |
| filter_utr_band | 发现 | C | 切换 UTR 段 | band, on |
| filter_type | 发现 | C | 切换玩法 | type, on |
| filter_tag | 发现 | C | 切换场景标签 | tag, on |
| filter_radius | 发现 | C | 选距离 | km |
| day_select | 发现 | C | 换日期 / 翻页 | offset, via(strip/pager/next_day) |
| view_mode | 发现 | C | 日程 / 地图切换 | mode |
| loc_suburb_pick | 发现 | C | 选区 | suburb, via(search/recent/hot/letter/club) |
| location_allow | 发现 | C | 定位授权结果 | result(granted/denied/outside) |
| map_day | 发现 | C | 地图上换天 | day |
| map_cluster_open | 发现 | C | 点开地图上的球场 | venue_id |
| game_select | 球局 | C | 列表里选中（未进详情，PWA 预览） | game_id |
| game_view | 球局 | C | 打开球局详情（每次打开只记一次） | game_id, venue_id, type, utr, via(list/map/chat/notif/card/mine/detail/link/share_link) |
| women_lock_view | 球局 | C | 看到女生局锁定页 | game_id, logged_in |
| game_create_start | 球局 | C | 打开发起表单 | — |
| game_create_submit | 球局 | C | 发布成功 | game_id, type, venue_id, minutes_to_start, dur, utr_min, utr_max, join_mode(approve/instant), hide_done, repeat, spots, women |
| game_edit | 球局 | C | 修改成功 | game_id, fields, minutes_to_start, approved_n |
| game_postpone | 球局 | C | 顺延成功 | game_id, from, to |
| unfilled_action | 球局 | C | 还缺人时发起人的处理 | game_id, action(share/widen/delay/cancel/again) |
| game_cancel_open | 球局 | C | 打开取消球局 | game_id |
| game_cancel | 球局 | C | 取消成功 | game_id, minutes_to_start, approved_n, pending_n |
| game_apply_open | 球局 | C | 打开申请 | game_id |
| game_apply_submit | 球局 | C | 申请成功 | game_id, minutes_to_start, played_n, avatar_kind, has_message |
| game_join_instant | 球局 | C | 直接加入成功 | game_id, minutes_to_start |
| apply_withdraw | 球局 | C | 撤回申请 | game_id |
| game_leave_open | 球局 | C | 打开退出 | game_id |
| game_leave | 球局 | C | 退出成功 | game_id, minutes_to_start, grace, after_change |
| host_decide | 球局 | C | 发起人接受 / 婉拒 | game_id, target_uid, ok, reason(known/level/pass), has_note, viewed_card, ms_since_request |
| host_decline_open | 球局 | C | 打开婉拒理由 | game_id, target_uid |
| req_sort | 球局 | C | 申请列表换排序 | game_id, sort |
| req_expand | 球局 | C | 展开收起的申请 | game_id |
| game_share_open | 分享 | C | 打开球局分享 | game_id |
| share_copy_link | 分享 | C | 复制球局链接 | game_id |
| share_copy_text | 分享 | C | 复制球局文案（发微信群） | game_id |
| share_system | 分享 | C | 系统分享 | game_id |
| poster_open | 分享 | C | 打开小红书海报 | game_id |
| poster_download | 分享 | C | 保存海报 | game_id |
| share_xhs_copy | 分享 | C | 复制小红书文案 | game_id |
| calendar_add | 球局 | C | 加入日历 | game_id |
| card_view | 球员卡 | C | 查看球员卡 | target_uid, own, via(list/map/chat/notif/card/mine/detail/link/recap/request) |
| card_custom_open | 球员卡 | C | 打开个性化 | days_since_signup |
| card_customize | 球员卡 | C | 改了一项（即时生效） | field(seal/animal/color/theme/avatar_kind), value |
| card_share_open | 球员卡 | C | 打开分享球员卡 | target_uid |
| card_share | 球员卡 | C | 分享 / 保存 / 复制链接 | channel(moments/xhs), action(go/save/link), ok |
| card_share_error | 球员卡 | C | 分享失败 | reason |
| card_image_render | 球员卡 | C | 分享图生成耗时 | ms, ok |
| pref_set | 打完之后 | C | 多遇到 / 随缘 / 少遇到 | target_uid, value(more/ok/less), prev, via(recap/card) |
| invite_open | 邀约 | C | 打开约 TA 表单 | target_uid, played_together |
| invite_send | 邀约 | C | 邀约发出成功 | invite_id, target_uid, played_together |
| invite_accept | 邀约 | C | 接受邀约 | invite_id |
| invite_decline | 邀约 | C | 婉拒邀约 | invite_id, reason(week/rest/pass), has_note |
| invite_counter_send | 邀约 | C | 提议新时间 | invite_id |
| invite_withdraw | 邀约 | C | 撤回邀约 / 撤回新时间 | invite_id, what(invite/counter) |
| invite_setting | 邀约 | C | 「谁可以约我」 | value(all/played/none) |
| recap_open | 打完之后 | C | 打开赛后卡片 | game_id, via(notif/detail) |
| feel_set | 打完之后 | C | 这局感受 | game_id, value(hard/ok/easy) |
| impression_give | 打完之后 | C | 留个好印象（含撤回） | target_uid, tag, on, bulk |
| recap_done | 打完之后 | C | 点完成 | game_id, n_set |
| noshow_report | 安全 | C | 反馈 TA 没来 | game_id, target_uid, role(host/player) |
| noshow_undo | 安全 | C | 撤回没来反馈 | game_id, target_uid |
| noshow_appeal | 安全 | C | 爽约申诉 | game_id, reason |
| badge_view | 成长 | C | 打开徽章详情 / 庆祝页 | code, via(ceremony/wall/card/notif) |
| badge_share | 成长 | C | 徽章分享 | code, to(moments/xhs), action(save/copy) |
| level_view | 成长 | C | 看到升级庆祝 | lv |
| level_info_open | 成长 | C | 打开等级说明 | — |
| notif_open | 通知 | C | 点开一条通知 | kind, from(push/list/banner), notif_id |
| notif_settings_open | 通知 | C | 打开提醒方式 | — |
| push_enable | 通知 | C | 申请推送权限的结果 | result(granted/denied/unsupported), env |
| email_settings_save | 通知 | C | 保存邮件提醒 | on |
| pact_view | 安全 | C | 看到球友约定 | via(gate/soon/safety/detail) |
| pact_accept | 安全 | C | 同意球友约定 | via(apply/create/invite/accept) |
| soon_open | 通知 | C | 打开开打前 30 分钟卡片 | game_id |
| safety_open | 安全 | C | 打开安全须知 | — |
| contact_open | 安全 | C | 打开联系我们 / 举报 | — |
| report_open | 安全 | C | 打开站内举报（球员卡 / 聊天 / 场边） | target_type(user/game/sb_post/sb_reply), via(card/chat/sideline) |
| report_submit | 安全 | C | 提交站内举报（不含说明内容） | target_type, reason, has_note, via |
| user_block | 安全 | C | 屏蔽用户 | target_uid |
| user_unblock | 安全 | C | 解除屏蔽 | target_uid |
| chat_open | 消息 | C | 打开对话 | type(game/dm) |
| chat_send | 消息 | C | 发出消息（不含内容） | type, quick |
| gender_open | 我的 | C | 打开性别设置 | — |
| gender_set | 我的 | C | 保存性别（不记录值） | first, changed |
| club_add_open | 我的 | C | 打开添加 Club | — |
| home_clubs_save | 我的 | C | 保存我的 Club | n |
| utr_open | 我的 | C | 打开我的 UTR 弹层（长按看时间那次不算） | mode(off/self), linked |
| utr_invalid | 我的 | C | 我的 UTR 当场校验没通过（不发请求、不记填的内容） | reason(empty/format/range/link) |
| utr_save | 我的 | C | 我的 UTR 保存成功（以服务器返回为准，失败不记；不记数值和主页编号） | mode(off/self), linked, change(up/down/same) |
| racket_picker_open | 我的 | C | 打开选拍弹层（添一把 / 换一把；从系列返回不算） | mode(add/swap), slot(1-3) |
| racket_brand_pick | 我的 | C | 选拍时点了品牌（品牌名来自产品库或兜底列表；点「其他品牌」记 other；不记手写文字） | brand |
| racket_save | 我的 | C | 球拍保存成功（以服务器返回为准，失败不记）；source：添 / 换时看是点选（catalog）还是手写（other），设为主力 / 移除时看那把有没有归到产品库 | action(add/swap/main/remove), source(catalog/other), n_after |
| racket_invalid | 我的 | C | 手写拍子名当场没通过校验（不发请求、不记文字） | reason(empty/long/link/at/digits/dup) |
| community_open | 我的 | C | 打开微信约球群 | — |
| series_end | 我的 | C | 停止每周发布 | game_id |
| follow_open | 打完之后 | C | 打开「TA 发了新球局」 | game_id |
| sb_post_view | 场边 | C | 打开一条发布的详情 | post_id, own, via(feed/court/topic/album/notif) |
| sb_post_submit | 场边 | C | 发布成功（含「2 小时后再公开」） | post_id, photos, topic_kind(none/official/user/new), court, later, via(bar/compose/court) |
| sb_reply_send | 场边 | C | 回复成功（不含内容） | post_id, own_post, to_someone |
| sb_ball | 场边 | C | 点网球 / 取消 | post_id, on, via(tap/double) |
| sb_photo_view | 场边 | C | 看大图 | post_id |
| sb_topic_view | 场边 | C | 按话题看 | topic(话题代码；大家发起的记 user) |
| sb_court_view | 场边 | C | 按球场看 / 打开球场页 | venue, via(filter/page) |
| sb_hide | 场边 | C | 不感兴趣（之后选了原因再记一条） | post_id, reason(none/topic/user/far) |
| sb_post_delete | 场边 | C | 删除自己的发布 | post_id |
| sb_replies_toggle | 场边 | C | 开关自己发布的回复 | post_id, open |
| sb_share | 场边 | C | 分享照片 / 话题 | post_id, topic, what(photo/topic), to(save/instagram/xhs) |
| sb_album_open | 场边 | C | 打开场边相册（「我的」页） | — |
| apply_expired | 球局 | S | 申请超时自动结束 | game_id |
| game_start_check | 球局 | S | 开打时检查人数 | game_id, filled, need, applied_n, reason |
| game_counted | 成长 | S | 一局计入场次 | game_id, players |
| recap_notify | 打完之后 | S | 赛后提醒送出 | game_id, delay_min, deferred |
| follow_notify | 打完之后 | S | TA 发了新局提醒 | host_id, suppressed |
| less_effect | 打完之后 | S | 少遇到生效 | type(join/invite/dm/rank) |
| noshow_confirm | 安全 | S | 爽约确认 | game_id, rule(host/single/2+) |
| badge_earned | 成长 | S | 获得徽章 | code, rarity |
| level_up | 成长 | S | 等级提升 | from, to |
| notif_deliver | 通知 | S | 一条提醒的去向 | kind, channel(in_app/push_mobile/push_desktop/email/none), reason |
| women_apply_blocked | 安全 | S | 非女生请求女生局被 API 拒绝 | game_id |
| account_status_change | 账号 | S | 账号状态变化（后台处理、暂停到期自动恢复、本人注销 / 恢复） | from, to, reason |

不再使用（合并到上面）：host_approve / host_decline → host_decide；invite_start → invite_open；avatar_change / card_theme_change → card_customize；card_custom_save（即时生效，无保存）；card_save_image / card_share_link / card_share_preview → card_share(action)；login_send_code 号码格式不对时不发；chat_quick_reply → chat_send(quick=true)；push_enable_click → push_enable；chat_report → report_open(via=chat) + report_submit。
