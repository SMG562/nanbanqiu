# 4d 查询速度（2026-10-22 14:59:12，数据量 ×0.05）

数据：球友 600 · 球局 2336 · 申请与参加 8601 · 通知 46323 · 会话 60000 · 事件 420145 · 库 299 MB（生成 20 秒）

| 查询 | 类别 | 用时 ms | 上限 ms | 结果 |
|---|---|---|---|---|
改写前后结果逐行相同：29 项对照（同一时刻、近 30 天和一年两个区间）

| 发现页：今天到 7 天后的公开球局 | api | 6.7 | 50 | ✓ |
| 球局详情（分享链接） | api | 1.2 | 50 | ✓ |
| 我的球局 | api | 1.5 | 50 | ✓ |
| 消息列表 | api | 1.2 | 50 | ✓ |
| 球员卡（一个人） | api | 2.6 | 50 | ✓ |
| 好评与好评率（一个人） | api | 1.3 | 50 | ✓ |
| 能不能申请（账号状态） | api | 1.5 | 50 | ✓ |
| 申请前检查屏蔽 | api | 0.5 | 50 | ✓ |
| 今天面板 today_board() | admin | 36 | 2000 | ✓ |
| 活跃人数 active_users() · 30 天 | admin | 139 | 2000 | ✓ |
| 活跃人数 active_users() · 一年 | year | 301 | 5000 | ✓ |
| 每日汇总 daily_metrics · 一年 | list | 11 | 3000 | ✓ |
| 开打时人齐 fill_rate() · 30 天 | admin | 3.6 | 2000 | ✓ |
| 开打时人齐 fill_rate() · 一年 | year | 3.0 | 5000 | ✓ |
| 申请按天 v_applications_daily · 一年 | list | 59 | 3000 | ✓ |
| 最活跃的球场 venue_activity() · 30 天 | admin | 6.9 | 2000 | ✓ |
| 区域 suburb_activity() · 30 天 | admin | 8.2 | 2000 | ✓ |
| 大家几点打球 start_heatmap() · 一年 | year | 19 | 5000 | ✓ |
| 从来访到打上球 visit_funnel() · 30 天 | admin | 132 | 2000 | ✓ |
| 从来访到打上球 visit_funnel() · 一年 | year | 291 | 5000 | ✓ |
| 最活跃的球友 user_activity() · 7 天 | admin | 129 | 2000 | ✓ |
| 最活跃的球友 user_activity() · 30 天 | admin | 130 | 2000 | ✓ |
| 留存 v_user_retention | list | 244 | 3000 | ✓ |
| 球员卡名单 player_cards（全部） | list | 41 | 3000 | ✓ |
| 等级卡住 v_level_stuck | list | 29 | 3000 | ✓ |
| 徽章稀有度 v_badge_rarity | list | 0.8 | 3000 | ✓ |
| 申请的结果 application_outcomes() · 30 天 | admin | 1.0 | 2000 | ✓ |
| 多人申请 v_multi_applicant_games · 30 天 | admin | 6.0 | 2000 | ✓ |
| 邀约的结果 v_invite_outcomes · 30 天 | admin | 8.2 | 2000 | ✓ |
| 算数的球局 v_counted_games · 一年 | year | 30 | 5000 | ✓ |
| 确认爽约 v_confirmed_noshow | list | 6.7 | 3000 | ✓ |
| 少遇到的效果 less_effect_counts() · 30 天 | admin | 2.0 | 2000 | ✓ |
| 提醒去了哪里 notification_route() · 30 天 | admin | 9.2 | 2000 | ✓ |
| 页面访问 page_traffic() · 30 天 | admin | 55 | 2000 | ✓ |
| 怎么进来的 entry_sources() · 30 天 | admin | 35 | 2000 | ✓ |
| 站内从哪里点进球局 game_view_via() · 30 天 | admin | 29 | 2000 | ✓ |
| 球员卡被查看 card_views() · 30 天 | admin | 40 | 2000 | ✓ |
| 分享带来的人 share_attribution() · 30 天 | admin | 2.8 | 2000 | ✓ |
| 手机 / 电脑对比 device_compare() · 30 天 | admin | 134 | 2000 | ✓ |
| 打开方式 env_usage() · 30 天 | admin | 18 | 2000 | ✓ |
| 添加到主屏幕 pwa_install_funnel() · 30 天 | admin | 8.2 | 2000 | ✓ |
| 微信 / 小红书里的球友 inapp_handoff_funnel() · 30 天 | admin | 28 | 2000 | ✓ |
| 某事件去重人数 distinct_people() · 30 天 | admin | 123 | 2000 | ✓ |
| 最活跃的球友 user_activity() · 一年 | year | 315 | 5000 | ✓ |
| 页面访问 page_traffic() · 一年 | year | 296 | 5000 | ✓ |
| 怎么进来的 entry_sources() · 一年 | year | 283 | 5000 | ✓ |
| 站内从哪里点进球局 game_view_via() · 一年 | year | 303 | 5000 | ✓ |
| 球员卡被查看 card_views() · 一年 | year | 242 | 5000 | ✓ |
| 打开方式 env_usage() · 一年 | year | 76 | 5000 | ✓ |
| 手机 / 电脑对比 device_compare() · 一年 | year | 277 | 5000 | ✓ |
| 分享带来的人 share_attribution() · 一年 | year | 3.7 | 5000 | ✓ |
| 提醒去了哪里 notification_route() · 一年 | year | 19 | 5000 | ✓ |
| 申请的结果 application_outcomes() · 一年 | year | 3.6 | 5000 | ✓ |
| 区域 suburb_activity() · 一年 | year | 26 | 5000 | ✓ |
| 最活跃的球场 venue_activity() · 一年 | year | 38 | 5000 | ✓ |
| 风险分 user_risk | list | 0.3 | 3000 | ✓ |

最大的表：daily_event_dims 37 MB · events_2026_10 25 MB · events_2026_09 20 MB · events_2026_08 17 MB · daily_people 16 MB · notifications 15 MB
