// 4d 测速的查询清单（perf.mjs 用）：[名称, SQL, 类别, 上限 ms]
// 上限：前台接口 50ms；后台卡片「近 30 天」2s；「全部（一年）」5s；名单 / 按天汇总 3s。造的数据最近 30 天约是原型模拟外推的 4–9 倍（留余量），真实会更快；$U = 一位活跃球友，$G = 一个即将开打的公开球局的 share_code
const R30 = `now() - interval '30 days', now()`, R7 = `now() - interval '7 days', now()`, RY = `now() - interval '366 days', now()`;
// [名称, SQL, 类别, 上限 ms]；$U = 一位活跃球友，$G = 一个即将开打的公开球局的 share_code
export const Q = [
  // ---- 前台接口（每次打开页面都会查）----
  ['发现页：今天到 7 天后的公开球局', `select * from game_cards where visibility='public' and status in ('open','full') and starts_at >= now() and starts_at < now() + interval '7 days' order by starts_at limit 200`, 'api', 50],
  ['球局详情（分享链接）', `select * from game_cards where share_code = $G`, 'api', 50],
  ['我的球局', `select g.* from game_participants p join games g on g.id = p.game_id where p.user_id = $U order by g.starts_at desc limit 50`, 'api', 50],
  ['消息列表', `select * from notifications where user_id = $U order by created_at desc limit 50`, 'api', 50],
  ['球员卡（一个人）', `select * from player_cards where user_id = $U`, 'api', 50],
  ['好评与好评率（一个人）', `select * from user_kudos_v2 where user_id = $U`, 'api', 50],
  ['能不能申请（账号状态）', `select can_act($U, 'apply', null, false)`, 'api', 50],
  ['申请前检查屏蔽', `select is_blocked($U, (select host_id from games where share_code = $G))`, 'api', 50],
  // ---- 后台：概览 ----
  ['今天面板 today_board()', `select * from today_board()`, 'admin', 2000],
  ['活跃人数 active_users() · 30 天', `select * from active_users(${R30})`, 'admin', 2000],
  ['活跃人数 active_users() · 一年', `select * from active_users(${RY})`, 'year', 5000],
  ['每日汇总 daily_metrics · 一年', `select day, metric, sum(value) from daily_metrics where day >= current_date - 366 group by 1, 2`, 'list', 3000],
  ['开打时人齐 fill_rate() · 30 天', `select * from fill_rate(${R30})`, 'admin', 2000],
  ['开打时人齐 fill_rate() · 一年', `select * from fill_rate(${RY})`, 'year', 5000],
  ['申请按天 v_applications_daily · 一年', `select * from v_applications_daily where day >= current_date - 366`, 'list', 3000],
  ['最活跃的球场 venue_activity() · 30 天', `select * from venue_activity(${R30})`, 'admin', 2000],
  ['区域 suburb_activity() · 30 天', `select * from suburb_activity(${R30})`, 'admin', 2000],
  ['大家几点打球 start_heatmap() · 一年', `select * from start_heatmap(${RY})`, 'year', 5000],
  ['从来访到打上球 visit_funnel() · 30 天', `select * from visit_funnel(${R30})`, 'admin', 2000],
  ['从来访到打上球 visit_funnel() · 一年', `select * from visit_funnel(${RY})`, 'year', 5000],
  // ---- 球友 ----
  ['最活跃的球友 user_activity() · 7 天', `select * from user_activity(${R7}) order by score desc limit 50`, 'admin', 2000],
  ['最活跃的球友 user_activity() · 30 天', `select * from user_activity(${R30}) order by score desc limit 50`, 'admin', 2000],
  ['留存 v_user_retention', `select signup_week, count(*), avg(d1::int), avg(d7::int), avg(d30::int) from v_user_retention group by 1`, 'list', 3000],
  ['球员卡名单 player_cards（全部）', `select * from player_cards order by played desc limit 100`, 'list', 3000],
  ['等级卡住 v_level_stuck', `select target_level, count(*) from v_level_stuck group by 1`, 'list', 3000],
  ['徽章稀有度 v_badge_rarity', `select * from v_badge_rarity`, 'list', 3000],
  // ---- 球局 / 全流程 ----
  ['申请的结果 application_outcomes() · 30 天', `select * from application_outcomes(${R30})`, 'admin', 2000],
  ['多人申请 v_multi_applicant_games · 30 天', `select multi, count(*), avg(host_minutes) from v_multi_applicant_games where created_at > now() - interval '30 days' group by 1`, 'admin', 2000],
  ['邀约的结果 v_invite_outcomes · 30 天', `select status, played_before, count(*) from v_invite_outcomes where created_at > now() - interval '30 days' group by 1, 2`, 'admin', 2000],
  ['算数的球局 v_counted_games · 一年', `select count(*) from v_counted_games`, 'year', 5000],
  ['确认爽约 v_confirmed_noshow', `select count(*) from v_confirmed_noshow`, 'list', 3000],
  ['少遇到的效果 less_effect_counts() · 30 天', `select * from less_effect_counts(${R30})`, 'admin', 2000],
  ['提醒去了哪里 notification_route() · 30 天', `select * from notification_route(${R30})`, 'admin', 2000],
  // ---- 访问 / 分享 / 设备 / 打开方式 ----
  ['页面访问 page_traffic() · 30 天', `select * from page_traffic(${R30})`, 'admin', 2000],
  ['怎么进来的 entry_sources() · 30 天', `select * from entry_sources(${R30})`, 'admin', 2000],
  ['站内从哪里点进球局 game_view_via() · 30 天', `select * from game_view_via(${R30})`, 'admin', 2000],
  ['球员卡被查看 card_views() · 30 天', `select * from card_views(${R30}) order by views desc limit 20`, 'admin', 2000],
  ['分享带来的人 share_attribution() · 30 天', `select * from share_attribution(${R30})`, 'admin', 2000],
  ['手机 / 电脑对比 device_compare() · 30 天', `select * from device_compare(${R30})`, 'admin', 2000],
  ['打开方式 env_usage() · 30 天', `select * from env_usage(${R30})`, 'admin', 2000],
  ['添加到主屏幕 pwa_install_funnel() · 30 天', `select * from pwa_install_funnel(${R30})`, 'admin', 2000],
  ['微信 / 小红书里的球友 inapp_handoff_funnel() · 30 天', `select * from inapp_handoff_funnel(${R30})`, 'admin', 2000],
  ['某事件去重人数 distinct_people() · 30 天', `select distinct_people('game_view', ${R30})`, 'admin', 2000],
  // ---- 「全部」时间范围（上线一年）----
  ['最活跃的球友 user_activity() · 一年', `select * from user_activity(${RY}) order by score desc limit 50`, 'year', 5000],
  ['页面访问 page_traffic() · 一年', `select * from page_traffic(${RY})`, 'year', 5000],
  ['怎么进来的 entry_sources() · 一年', `select * from entry_sources(${RY})`, 'year', 5000],
  ['站内从哪里点进球局 game_view_via() · 一年', `select * from game_view_via(${RY})`, 'year', 5000],
  ['球员卡被查看 card_views() · 一年', `select * from card_views(${RY}) order by views desc limit 20`, 'year', 5000],
  ['打开方式 env_usage() · 一年', `select * from env_usage(${RY})`, 'year', 5000],
  ['手机 / 电脑对比 device_compare() · 一年', `select * from device_compare(${RY})`, 'year', 5000],
  ['分享带来的人 share_attribution() · 一年', `select * from share_attribution(${RY})`, 'year', 5000],
  ['提醒去了哪里 notification_route() · 一年', `select * from notification_route(${RY})`, 'year', 5000],
  ['申请的结果 application_outcomes() · 一年', `select * from application_outcomes(${RY})`, 'year', 5000],
  ['区域 suburb_activity() · 一年', `select * from suburb_activity(${RY})`, 'year', 5000],
  ['最活跃的球场 venue_activity() · 一年', `select * from venue_activity(${RY})`, 'year', 5000],
  // ---- 风险 ----
  ['风险分 user_risk', `select * from user_risk order by score desc limit 50`, 'list', 3000],
];
