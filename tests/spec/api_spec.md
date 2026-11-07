# 南伴球 · 后端接口规格 v1（第四批 4f）

> 这份文件是后端接口的唯一来源：前台两端调用、数据库函数（schema ⑪，4f-2 起）、接口测试都按它对齐。
> 规则本身以「进度记录 §3 业务规则速查」为准；这里写的是每个接口**按什么顺序检查、写什么、通知谁、记什么、出错返回什么**。
> 每个写接口对应一个数据库函数（`api_` 开头，列在标题后），后端只负责登录态、参数格式和调用；规则都在数据库里，前台的提示只是提前拦。

---

## 0. 通用约定

### 0.1 请求与身份
- 只走 HTTPS；请求和返回都是 JSON；时间用 ISO 8601 带时区（`2026-10-24T18:30:00+11:00`）。
- 登录态：手机验证码登录后，refresh token 放 httpOnly Cookie，access token 15 分钟。未登录可以浏览（发现页、球局详情、球员卡分享页），写操作一律 401 `login_required`。
- **每个前台请求在一个事务里执行**：`begin; set local role nbq_user; select set_config('nbq.uid', <登录用户 id>, true); <调用 api_ 函数或查询>; commit`。数据库的行级权限（schema ⑩）按这个身份判断，接口漏了检查也读写不到别人的数据。
- 定时任务、发送通知、写事件用 `nbq_service`；后台用 `nbq_admin` / `nbq_viewer`（§9）。
- **时间显示**：前台按手机时区显示（2026-10-21 决定，保持现状）；接口返回带时区的绝对时间。规则里的「天」「夜间 22:00–08:00」「6:00–21:30」一律按墨尔本时间，由数据库判断（mel_day_start / mel_today），与手机时区无关。

### 0.2 写操作的三条规矩
1. **带当前状态条件**：改申请 / 邀约 / 球局时，数据库函数里一律 `where status = <调用时看到的状态>`。影响 0 行 = 别人刚改过，返回 409 `state_changed`，前台重新读取后提示。
2. **同时操作**：数据库已保证不超员、不死锁（schema ⑧）。收到 40P01（死锁）/ 40001（序列化冲突）时整笔重试一次，仍失败返回 503 `busy_retry`。
3. **重复提交**：发起球局、申请、约人、发消息、举报带 `Idempotency-Key` 请求头（前台每次点击生成一个），同一个 key 24 小时内重复提交返回第一次的结果。

### 0.3 前置拦截（多数写接口都先过这三关，顺序固定）
1. 登录：未登录 → 401 `login_required`
2. 账号状态：`can_act(uid, action, target, women)` 不为空 → 403 `account_<状态>`（`account_review` / `account_limited` / `account_suspended` / `account_banned` / `account_deleted`），前台显示账号状态说明（§3.11）
3. 球友约定：第一次申请、直接加入、发起、约人、接受邀约前 `users.pact_accepted_at` 为空 → 428 `pact_required`，前台弹出约定，同意后自动重试

### 0.4 频率限制（schema ⑭，5a-1）
- 规则在 `rate_rules` 表（后台可看；改数值只改表）。成功的操作才计次（失败整笔回滚），同一人同一类操作排队检查，同时点也不会超。
- 时间窗是滚动的：「每天」= 最近 24 小时，和邀约上限一致。
- 超限返回 429（进行中球局上限是 409），错误码见 §1；数据库错误的 detail 是还要等的秒数，接口放进 `Retry-After` 响应头和 `detail.retry_after`。

| 操作 | 限制 | 错误码 |
|---|---|---|
| 获取验证码 | 同一号码 60 秒 1 次、每天 5 次；同一 IP 每小时 10 次 | otp_too_fast / otp_daily_limit / rate_limited |
| 输入验证码 | 连错 5 次锁 30 分钟（输对后清零） | otp_locked |
| 发起球局 | 每天 5 个（墨尔本自然日，0 点清零）；进行中（未开打、未取消）最多 5 个 | game_daily_limit / game_open_limit |
| 申请 + 直接加入（合计） | 每小时 10 次、每天 30 次；同一局每天 3 次 | apply_hourly_limit / apply_daily_limit / apply_same_limit |
| 发消息 | 每分钟 10 条 | message_too_fast |
| 新账号私信 | 注册 7 天内，每天最多主动和 3 位没一起打过球的人开始聊天（对方先发的不算） | dm_new_limit |
| 邀约 | 不变：每天 3 个、新球友 2 位 | invite_daily_limit / invite_new_limit |
| 举报 | 每天 5 次 | report_daily_limit |
| 改昵称 | 30 天 2 次（注册 24 小时内不计） | nickname_limit |
| 开放时通知我（未开放城市） | 同一 IP 每小时 5 次（R3-2） | rate_limited |
| 场边发布（第七批） | 每小时 5 条、每天 20 条 | sb_post_hourly_limit / sb_post_daily_limit |
| 场边新建话题（第七批） | 每天 3 个 | sb_topic_daily_limit |
| 场边回复（第七批） | 每分钟 6 条 | message_too_fast |
| 点网球（第七批） | 每分钟 30 次 | rate_limited |

### 0.5 被拒的操作记风险信号（schema ⑮，5a-2）
- 被拒的操作整笔回滚，数据库里留不下记录。后端收到下面的错误码后，另开一个事务以 nbq_service 调 `risk_log_rejected(user_id, 错误码, 相关对象)`：
  - `message_link` → 反复尝试发链接（link_spam）
  - `women_only` → 未确认性别反复试女生局（women_probe）
  - 各种频率上限（§0.4 表里的错误码、`invite_daily_limit` / `invite_new_limit` / `game_open_limit`）→ 反复触发频率限制（rate_hit）
  - 场边（第七批）的发链接、频率上限同样记，见 §14.10
- 成功的操作由数据库自己记：新账号私信里留联系方式（只记、不拦，不存内容）、申请中撤回。
- 风险分每小时由 `job_risk_scores()` 重算（§11），规则见 risk_rules；只提示运营查看，不自动处罚。

### 0.6 页面注入与链接安全（5a-3）
- 接口返回的用户文字（昵称、留言、说明、私信、球场名、举报说明等）**原样返回、不做转义**；页面显示时一律先 `esc()`（三个页面同一个函数，转义 & < > " '），由 `tests/frontend/xss.js`、`tests/admin/xss.js` 保证。
- 推送只带 id（notif_id / kind / game_id / invite_id），点开由 sw.js 拼本站地址；`data.url` 不是本站的一律回到首页。邮件里只有本站链接和退订链接。
- 后台导出 CSV：以 = + - @ 开头的文字前面加 `'`，防止 Excel 当公式执行。
- 安全响应头见 `server/headers.mjs`（内容安全策略、只走 HTTPS、禁止被嵌入等），5g 部署时接上。

### 0.7 隐私（schema ⑯，5b-2；依据 隐私清单.md）
- **注册**：最低 18 岁。新号码登录后，前台在填资料页请用户勾选「我已满 18 岁」并同意用户协议和隐私政策 → `api_consent_accept(true)`（记确认时间、协议 / 政策版本）。
- **改版**：`legal_docs` 插入新版本；前台登录后调 `api_consent_state()`，`need = true` 时弹出这一版的更新说明请重新同意 → `api_consent_accept()`。
- **下载我的数据**：GET /api/me/export → `api_export_me()`（JSON，每天 1 次 → 429 `rate_limited`）。不含：别人对我的少遇到 / 多遇到、谁举报 / 反馈了我、风险分、登录 id、退订 token；收到的印象 / 好评只给数量。
- **关闭「使用数据」**：之后事件、会话、分享打开记录都不写；已写的去掉账号关联。
- **保存期限**（每晚 `job_retention`）：原始事件 / 会话 / 分享打开 25 个月 · 通知 12 个月 · 补发邮件记录 90 天 · 已处理举报的说明 2 年 · 后台操作日志 2 年 · 注册 IP 30 天 · 风险信号 90 天 · 频率计数 31 天 · 私信和聊天一直保留。
- **注销满 30 天**：手机号、昵称、首字母、微信号、邮箱、性别、头像设置、注册设备 / IP、退订 token 清空；设备、推送订阅、本人设的偏好、改性别记录删除；待发邮件不再发。球局记录、聊天（显示「已注销」）、印象和好评（计入汇总）保留。

### 0.8 城市（schema ⑲，地区扩展 R1；设计见 地区扩展设计.md）
- 城市配置 `cities`：时区、中心、上线状态（off / prep / beta / on）、发局时段（默认 6:00–21:30）、夜间不打扰（默认 22:00–08:00）、顺延截止（默认 23:00）、分享话题。前台只读得到 beta / on 的城市。
- GET /api/cities → 已开放的城市列表（含 slug、center_label）。
- **每个城市一个网址**（R3，schema ㉒，10-22 定）：`nanbanqiu.app/<slug>`（melbourne / sydney / brisbane / perth / adelaide / canberra）；打开的网址决定页面上的城市，**不做城市切换**；不带城市（`nanbanqiu.app`）→ 墨尔本。前台两端的 `CITIES` 与 cities 表逐条相同（tests/static/cities_front.mjs）。
- **分享链接保持短链接** `/g/码`、`/p/编号`：后端按球局 / 球员所在城市跳到 `/<slug>/g/码`（R3-2 server/routes.mjs）。
- 打开还没开放的城市（如 `/sydney`）→ 页面盖一层「悉尼即将开放」+ 留邮箱「开放时通知我」+ 已开放城市的入口（R3-2）。
  - POST /api/city-waitlist `{city, email}` → 后端以 nbq_service 调 `api_city_waitlist(city, email, ip)`：只收未开放 / 筹备中的城市（否则 422 `invalid` detail=city）；邮箱格式不对 → 422 `invalid` detail=email；同一城市同一邮箱只记一次（返回 false，页面照样显示「已登记」）；同一 IP 每小时 5 次 → 429 `rate_limited`。存在 area_demand（kind=city_waitlist）。
  - 城市开放后由运营发通知并填 notified_at（R4 后台）；通知后 30 天删除，没通知的最多保留 2 年。
- **后端路由** `server/routes.mjs`（5g 接到托管平台）：`/` → 302 `/melbourne/`；`/g/码`、`/p/编号` → 302 到球局 / 球员常用城市（`route_city`，找不到按墨尔本）；`/<slug>` → 301 补斜杠、大写转小写；认不出的城市 → 302 `/melbourne/`；`/<slug>/…` 手机返回 PWA、电脑返回网页端，按城市替换 `<title>`、og 标题 / 描述、安装配置地址、canonical；`/<slug>/manifest.webmanifest` 每个城市一份（id / start_url / scope 都是 `/<slug>/`）；`/<slug>/community` → 城市的社群链接。/api、/admin、/icons、/privacy.html、/terms.html、/sw.js 不经过它。
- **手机号按国家**：登录页的国家代码来自 `COUNTRIES`（= countries 表里已开放的国家，现在只有 +61），发验证码前按格式检查（0412 345 678、+61 412 345 678 都认）。原来的 +86 选项去掉了（后端从 5a-1 起就只收澳洲手机号）。
- **当地时间**：手机时区和城市不同时，球局列表和详情在时间后面另标「当地 18:30」。
- 埋点公共字段 `city`（当前网址的城市 key），后端写进 events.city。
- 球场的城市由所在区决定；球局的城市 = 球场的城市；邀约的城市 = 球场的城市（自填场地时 = 发起人的常用城市）。
- **时间规则按事情发生的城市**：发局 / 邀约时段、「接下来 7 天」、顺延截止按球场城市的当地时间；赛后提醒等夜间不打扰按收提醒的人常用城市的当地时间。城市没开放 → 409 `city_closed`。
- 用户 `home_city`（常用城市）：注册时按定位选最近的已开放城市，可在「我的」里改（只能改成已开放的城市）；球员卡显示。
- 页面显示的时间仍按手机时区；球局城市的时区和手机不同时，卡片另标「当地 18:30」（R3）。
- **埋点带城市**（R1-2）：events / sessions / link_visits 有 city 列；POST /api/events 时后端填入客户端上报的当前城市（公共字段 city，R3 加），没有就用本人常用城市；默认墨尔本。
- **按城市统计**：每个城市按自己的当地日期算「一天」；每天汇总按（城市, 当地日期）存，每晚一次汇总所有城市最近 3 天。统计函数（people_between、active_users、distinct_people、event_dims_between、card_views、user_activity、today_board、start_heatmap、share_attribution）都多一个可选参数 city：给 = 只算这个城市，不给 = 全部城市；视图 admin_game_slots、v_applications_daily、v_user_retention 带 city 列。后台接口统一加 `?city=`（R4 把其余统计也接上）。
- 同一城市里区名唯一（跨城市可以同名，如 Brighton VIC / SA）；区的别名按城市。
- **国家**（R2，schema ㉑）：`countries` 每国一行（现在只有澳洲 AU）：国家代码、手机号格式（E.164 正则）、输入框提示、短信服务商、发件名、验证码模板。前台只读得到已开放国家的号码格式和提示（GET /api/cities 一并返回 `countries: [{code, dial, phone_re, phone_hint}]`，R3 用来校验输入），读不到短信配置。城市的国家必须在表里。
- **发送程序按收件人城市**（R2）：夜间不打扰用收提醒的人常用城市的时区和 quiet_start / quiet_end；每天最多 5 封邮件按他那边的自然日；推送和邮件里的开打时间按球局城市当地时间，收件人常用城市时区不同时前面加「当地」。
- **定时任务**：每晚任务 16:10 UTC（此时澳洲 6 个城市都已过当地午夜、都早于 06:00），汇总所有城市最近 3 天；其余任务按分钟跑，时间规则在函数里按城市算。

### 0.9 返回格式
- 成功：`200`（查询 / 修改）或 `201`（新建），返回对象本身。
- 失败：`{ "error": "<错误码>", "message": "<给用户看的中文>", "detail": {…可选} }`，HTTP 状态见 §1。

---

## 1. 错误码

| 错误码 | HTTP | 给用户看的话（前台已有的文案优先） | 谁判断 |
|---|---|---|---|
| login_required | 401 | 请先登录 | 后端 |
| account_review / account_limited / account_suspended / account_banned / account_deleted | 403 | 显示账号状态说明 | 数据库 can_act |
| pact_required | 428 | 弹出球友约定 | 数据库 |
| forbidden | 403 | 没有权限做这件事 | 数据库行级权限 |
| not_found | 404 | 这场球局已不存在 / 内容不存在 | 后端 |
| state_changed | 409 | 状态刚刚变了，已为你刷新 | 数据库（影响 0 行） |
| bad_transition | 409 | 同上 | 数据库 gp_guard / invites_guard |
| busy_retry | 503 | 网络有点忙，请再试一次 | 后端 |
| invalid | 422 | 按字段提示（例：结束时间要晚于开始时间 · 选一个场地吧） | 后端 + 数据库约束 |
| game_full | 409 | 刚刚满员了，看看附近其他球局 | 数据库 gp_guard |
| game_closed | 409 | 这局已经取消了 | 数据库 |
| game_started | 409 | 这局已经开打了 | 数据库 |
| postpone_once | 409 | 只能顺延一次 | 数据库 |
| postpone_too_late | 422 | 顺延后会超过 23:00 结束，可以改时间或取消 | 数据库 |
| application_expired | 409 | 申请已失效 | 数据库 gp_guard |
| already_applied | 409 | 已经没有空位或已报名 | 数据库 |
| join_not_allowed | 409 | 发起人改成了需要确认，请发送申请 | 数据库 |
| level_mismatch | 409 | 水平不在这局的范围内，可以发送申请 | 数据库 |
| women_only | 403 | 女生局只对女生开放 / 女生局需要登录并确认是女生 | 数据库（同时记 women_apply_blocked） |
| blocked | 403 | 暂时无法约这位球友 / 有屏蔽关系（不说明是谁屏蔽了谁） | 数据库 is_blocked |
| not_host | 403 | 你不是发起人 | 数据库 |
| host_cannot_leave | 409 | 你是发起人，可以取消球局 | 数据库 |
| invite_self | 422 | 不能约自己 | 数据库 |
| invite_closed | 403 | TA 暂时不接受邀约 | 数据库 |
| invite_played_only | 403 | TA 只接受一起打过球的球友邀约 | 数据库 |
| invite_daily_limit | 429 | 今天已经发出 3 个邀约了，明天再约吧 | 数据库 |
| invite_new_limit | 429 | 今天已经约了 2 位新球友，明天再约吧 | 数据库 |
| invite_declined_twice | 403 | 对方最近不太方便，过段时间再约吧 | 数据库 |
| invite_pending | 409 | 已经约过 TA 了，等 TA 回复吧 | 数据库（invites_open_pair） |
| invite_ended | 409 | 邀约已结束 | 数据库 |
| counter_once | 409 | 只能换一次时间 | 数据库 invites_guard |
| counter_same | 422 | 时间和地点都没变，直接接受就好 | 数据库 |
| invite_game_fixed | 409 | 邀约已成局 | 数据库 invites_guard |
| time_past | 422 | 这个时间已经过了 | 数据库 |
| time_out_of_range | 422 | 只能约接下来 7 天、6:00–21:30 | 数据库 |
| recap_closed | 409 | 这局已经过了可以填写的时间 | 数据库 |
| noshow_window_closed | 409 | 结束 48 小时后不能再反馈 | 数据库 |
| not_in_game | 403 | 已不在这局 | 数据库 |
| report_duplicate | 409 | 你已经举报过，我们正在处理 | 数据库 reports_one_open |
| report_note_required | 422 | 选「其他」时写一句说明 | 数据库 reports_source_chk |
| message_link | 422 | 暂不支持发送链接 | 数据库 |
| chat_closed | 409 | 这局的群聊已关闭 | 数据库 |
| message_muted | 200 | 不报错：对方「少遇到」时照常发出，只是不提醒对方 | — |
| gender_m2f_used | 409 | 已经改过一次，不能再改为女生 | 数据库 users_gender_guard |
| restore_expired | 410 | 这个账号已注销超过 30 天，可以用手机号重新注册 | 后端 |
| rate_limited | 429 | 操作太频繁，请稍后再试 | 数据库 nbq_rate（验证码同一 IP） |
| game_daily_limit | 429 | 今天已经发了 5 个球局，明天再发吧 | 数据库 nbq_rate |
| game_open_limit | 409 | 进行中的球局已有 5 个，打完再发新的吧 | 数据库 |
| apply_hourly_limit | 429 | 申请有点频繁，过一会儿再试吧 | 数据库 nbq_rate |
| apply_daily_limit | 429 | 今天已经申请了 15 次，明天再来吧 | 数据库 nbq_rate |
| apply_same_limit | 429 | 这局今天已经申请过 3 次了 | 数据库 nbq_rate |
| message_too_fast | 429 | 发得有点快，稍等一下再发 | 数据库 nbq_rate |
| dm_new_limit | 429 | 新账号每天最多和 3 位新球友开始聊天，明天再试 | 数据库 nbq_rate |
| report_daily_limit | 429 | 今天的举报次数已达上限，明天再试 | 数据库 nbq_rate |
| nickname_limit | 429 | 30 天内只能改 2 次昵称 | 数据库 nbq_rate |
| otp_too_fast | 429 | 验证码已发送，60 秒后可以重新获取 | 数据库 auth_otp_send |
| otp_daily_limit | 429 | 今天获取验证码的次数已用完，明天再试 | 数据库 auth_otp_send |
| otp_locked | 429 | 验证码错误次数太多，请 30 分钟后再试 | 数据库 auth_otp_verify |
| nickname_not_allowed | 422 | 昵称里不能有链接、联系方式或「官方」「客服」等字样 | 数据库 nbq_nickname_problem |
| adult_required | 422 | 请先确认你已满 18 岁 | 数据库 api_consent_accept |
| city_closed | 409 | 这个城市还没开放 | 数据库 nbq_check_slot / 常用城市 |
| topic_too_generic | 422 | 这个词有点宽，换个具体点的说法吧 | 数据库 sb_topic_resolve（sb_generic_words）（场边 §14，F1b 并入） |
| topic_name_not_allowed | 422 | 话题名里不能有链接、联系方式或「官方」等字样 | 数据库 nbq_nickname_problem（场边 §14，F1b 并入） |
| topic_ended | 409 | 这个话题已经结束了 | 数据库 api_sb_post（场边 §14，F1b 并入） |
| sb_post_hourly_limit | 429 | 发得有点多，过一会儿再发吧 | 数据库 nbq_rate（场边 §14，F1b 并入） |
| sb_post_daily_limit | 429 | 今天已经发了 20 条，明天再来吧 | 数据库 nbq_rate（场边 §14，F1b 并入） |
| sb_topic_daily_limit | 429 | 今天已经发起了 3 个话题，明天再来吧 | 数据库 nbq_rate（场边 §14，F1b 并入） |
| replies_closed | 409 | 作者关闭了回复 | 数据库 api_sb_reply（场边 §14，F1b 并入） |

---

## 2. 登录与账号

### POST /api/auth/otp/send `{phone}`
- 检查：后端以 nbq_service 调 `auth_otp_send(phone, ip)`：按号码认出已开放的国家（`countries.phone_re`，澳洲 +61 4xx xxx xxx），认不出 → 422 `invalid`；锁定中 → 429 `otp_locked`；同一 IP 每小时 10 次 → 429 `rate_limited`；同一号码 60 秒 1 次 → 429 `otp_too_fast`、每天 5 次 → 429 `otp_daily_limit`
- 写入：Supabase Auth 发短信验证码；`auth_otp_send` 返回 `{country, provider, sender, template}`，后端按这个国家的服务商和模板发
- 事件：login_send_code（前端）

### POST /api/auth/otp/verify `{phone, code}` → `{user, is_new, status}`
- 检查：校验前 `auth_otp_verify(phone, ip)` 锁定中 → 429 `otp_locked`；验证码错误 / 过期 → 422 `invalid`，并 `auth_otp_verify(phone, ip, false)` 记一次（输对 → `true` 清零）；`users.status = 'banned'` → 403 `account_banned`（前台显示说明并退出）
- 写入：新号码 → 建 users（资料待填；记 `signup_device` = 当前设备匿名 id、`signup_ip`，IP 30 天后清空）；`identity_links` 把当前设备匿名 id 关联到账号
- 已注销 30 天内 → 返回 `status: 'deleted'`，前台问「恢复账号？」；超过 30 天 → 410 `restore_expired`
- 事件：login_success（前端，带 is_new）

### POST /api/me/restore · `api_account_restore()`
- 检查：status = deleted 且 status_since 在 30 天内，否则 410 `restore_expired`
- 写入：status → active；user_status_log；之前退出的球局不恢复
- 事件：account_restore（前端）· account_status_change（服务端）

### DELETE /api/me · `api_account_delete()`
- 写入：status → deleted；连带处理同封禁（§3.11：待确认申请撤回、已加入未开打的局退出并通知发起人、发起的未开打球局取消并通知、进行中的邀约撤回）；30 天后由定时任务匿名化
- 通知：受影响的发起人 player_left、受影响的球友 game_cancelled；本人不发
- 事件：account_delete {upcoming_left, hosted_cancelled}（前端）· account_status_change（服务端）

### POST /api/auth/logout
- 写入：作废 refresh token；前台换新匿名 id
- 事件：logout（前端）

---

## 3. 我的资料

### PATCH /api/me · 直接 update users（行级权限只允许改资料类的列）
- 可改：nickname（1–20 字）、last_initial、avatar_kind / avatar_animal / avatar_color / seal_roll、card_theme、wechat_id、main_club_id、invite_from（all / played / none）、email、email_prefs、analytics_opt_out
- 不可改：status、level、member_no、手机号、utr / utr_estimated（11-07 起只走 PUT /api/me/utr）等 → 403 `forbidden`
- 频率：改昵称 30 天 2 次 → 429 `nickname_limit`（注册 24 小时内不计）
- 昵称规则（前台 NICK_BAD 与数据库 nbq_nickname_problem 同一套）：不能有链接、联系方式（8 位以上数字、微信 / vx / WhatsApp 等说法）、「官方 / 南伴球 / 客服 / 管理员 / 系统 / admin」等字样、不可见字符、同一个字连续 5 次 → 422 `nickname_not_allowed`（detail = link / contact / impersonate / invisible / repeat）
- 事件：card_customize / invite_setting / email_settings_save / analytics_off / analytics_on（前端，按改的内容）

### PATCH /api/me `{gender}`
- 检查：男 → 女第二次 → 409 `gender_m2f_used`（数据库触发器）
- 写入：gender_changes 记录；gender_m2f_at
- 事件：gender_set（前端，不记值）

### POST /api/me/pact · `api_pact_accept()`
- 写入：pact_accepted_at = now()，pact_version = 1
- 事件：pact_accept（前端）

### GET /api/me/badges · POST /api/me/badges `{codes[] ≤ 20}` · POST /api/me/badges/seen `{code}`
- 读：`{badges:[{code, earned_at, seen_at}]}`，只有自己的（RLS）
- 写：`api_badges_claim` 只收白名单 12 个 code（first / ten / fifty / hundred / host10 / night / early / surface / explorer / streak / kudos / partner），已有的不改；`api_badge_seen` 只记一次 seen_at
- 徽章规则在前台算，服务端只记录；codes 不是数组 / 超过 20 个 / code 不是文字 → 422 invalid

### GET /api/me/rackets · PUT /api/me/rackets `{rackets[] ≤ 3}` · `api_set_rackets(p_rackets jsonb)`（#60）
- 返回 `{rackets:[{slot, brand, series}]}`（GET 和 PUT 一样，按 slot 排）；接口层只转发 brand / series 两个字段，rackets 不是数组 / 超过 3 个 / 元素不是对象 / 字段类型不对 → 422 invalid
- 读：`user_rackets` 只能读自己的（RLS）；前台不能直接写表，只能调这个函数
- 写：`[{brand, series}, …]` 整组替换，数组顺序 = slot（1 = 主力），最多 3 把；brand 为空 / 省略 = 「其他」；返回 `[{slot, brand, series}]`
- 清洗：去控制字符、连续空白并成一个、去首尾空白（含全角空格）；同一把（品牌 + 系列，不分大小写）重复 → 失败
- 校验（将来球员卡公开，一次到位）：各 ≤ 30 字、系列必填、拒绝 http / www、@ / ＠、连续 6 位以上数字 → 422 invalid，detail = `rackets`（不是数组 / 超过 3 把 / 元素不是对象）· `brand` · `series` · `duplicate`；失败时原来的不丢

### GET /api/me/utr · PUT /api/me/utr `{utr, estimated, profile?}` · `api_set_utr(p jsonb)` / `api_my_utr()`（#101）
- 返回 `{utr:{utr, estimated, profile, updated_at}}`（GET 和 PUT 一样）；updated_at 没确认过 = 注册时间；接口层只转发这三个字段，类型不对 → 422 invalid
- 两种：正式（estimated = false）/ 自评（estimated = true，前台显示 ≈）；utr 1–16.5、最多两位小数，否则 422 invalid detail=`utr`；estimated 不是布尔 → detail=`estimated`
- profile：不传 = 不动；null / 空串 = 清掉；纯数字（4–12 位）或 UTR 主页链接（utrsports.net / universaltennis.com 的 `/profiles/<数字>`）→ 只存数字；其他 → 422 invalid detail=`profile`
- 数值或类型变了：记一行 `utr_changes`（只许本人读）+ 频率 24 小时 5 次 → 429 `rate_limited`；只改链接、原样再确认只刷新 updated_at，不计次数
- 隐私：profile 只在 users（本人可读），public_profiles 不加；注销匿名化时清掉 profile 和历史（触发器 `trg_users_utr_wipe`）

### PUT /api/me/clubs `{venue_ids[] ≤ 3}` · PUT /api/me/suburb `{suburb, postcode}`
- 写入：user_clubs（整组替换）· user_suburb_picks
- 事件：home_clubs_save / loc_suburb_pick（前端）

### POST /api/push/subscriptions `{endpoint, keys, platform}` · DELETE /api/push/subscriptions
- 写入：user_devices 推送字段；推送服务返回 404 / 410 时由发送任务清空
- 事件：push_enable {result}（前端）

---

## 4. 球局

### GET /api/games?city&date&lat&lng&radius_km(2|5|10|20|50)&levels&types&tags&utr_lo&utr_hi
- 读 `api_game_cards`（只含我能看到的局：公开且双方没有屏蔽，或我参加的私人局）；只返回今天起 7 天
- 女生局：只对 gender = 'f' 且不是待核实的人返回（已加入 / 已申请的人仍能看到自己那一局）
- 排序：开打时间；多遇到的人的局排前、少遇到的人的局排后（less_effect type=rank）
- **匿名浏览（10-30 定）**：请求里没有 `Authorization` 也能调（令牌是坏的仍 401）：只返回公开的、非女生局的、未开打的球局，响应带 `anon: true`；不含私人局、不含我的参与记录；字段和登录后的卡片一致（发起人昵称 / UTR、人数、余位，无手机号等内部列）。按 IP 限流在 Workers 入口做（待做）

### GET /api/games/:code
- 分享落地页也用这个；记 link_visits（来源 s / f 参数）
- 匿名（无 Authorization）也能调，同样只给公开的、非女生局的；私人局、女生局对匿名一律 404
- 非女生打开女生局：只返回 `{tags:['women']}`，不返回时间、地点、球友
- 404 `not_found`（已删除）· 已取消的返回 status=cancelled，前台显示「这局已经取消了」

### POST /api/games · `api_game_create(…)`
- 请求：venue_id 或 venue_name（私人）、starts_at、duration_min（60 / 90 / 120）、game_type、utr_min ≤ utr_max、filled（双打 0–2）、tags（match / relax 二选一，newbie，women）、join_mode、note ≤ 60、repeat_weekly
- 检查：前置三关（action = create）→ 开打时间在今天起 7 天、6:00–21:30、半点粒度，否则 422 `time_out_of_range` / `time_past` → women 标签只有女生能加 → join_mode = instant 只在开打前 2 小时内 → 进行中的球局已有 5 个 409 `game_open_limit` → 每天 3 个 429 `game_daily_limit`
- 写入：games；发起人那一行由触发器补；repeat_weekly → game_series
- 通知：多遇到 TA 的人 follow_game（每人每周最多 1 次、水平相差 0.5 以内、可见、未屏蔽）
- 事件：game_create_submit（前端）· follow_notify（服务端）

### PATCH /api/games/:id · `api_game_edit(…)`
- 已开打：只许改 `filled`（发起人现场「人齐了」），且要在结束前；其余字段 → 409 `game_started`（11-04）；满员后没处理的申请由 sync_game 结束（full_auto）并通知
- 谁：发起人，否则 403 `not_host`
- 检查：已取消 → 409 `game_closed`；已开打 → 409 `game_started`；人数不能少于已加入的人（数据库 games_capacity_guard → 409 `game_full`）
- 写入：games；game_changes（is_major = 改时间 / 改球场）；改时间后已加入的人 change_ack = pending（可以不算临时退出地退出）
- 通知：已加入的人 changed
- 事件：game_edit（前端）

### POST /api/games/:id/postpone · `api_game_postpone()`
- 顺延 1 小时，只能一次（409 `postpone_once`），顺延后结束不晚于 23:00（422 `postpone_too_late`）；同上检查；写 postponed_at / original_start；通知 postponed；开打前 30 分钟提醒按新时间再算
- 事件：game_postpone（前端）

### POST /api/games/:id/cancel · `api_game_cancel()`
- 谁：发起人
- 检查：已取消 / 已开打 → 409
- 写入：status = cancelled（cancelled_at 由触发器写）；待确认的申请由数据库随取消结束（games_cancel_cleanup）
- 通知：已加入和待确认的人 game_cancelled；开打前 24 小时内取消且已有人加入 → 风险信号 host_late_cancel
- 事件：game_cancel（前端）

### POST /api/games/:id/unfilled `{action: share | widen | postpone | keep}`
- 「还缺人」卡片的处理；widen = 放宽水平（走 api_game_edit）；postpone 走顺延
- 事件：unfilled_action（前端）

### PATCH /api/series/:id `{active:false}`
- 谁：发起人；停止每周发布，已发的那一场照常
- 事件：series_end（前端）

---

## 5. 申请与参加

### POST /api/games/:id/requests `{message ≤ 140, eta?: 1–120}` · `api_apply(game_id, message, eta)`
- `eta` = 预计几分钟到（11-04）：只有开打后才申请的才记（开打前传了也不记）；超出 1–120 → 400 `invalid`；只有发起人和本人在参与记录里看得到 `eta_min`
- 检查（顺序）：前置三关（action = apply，women = 女生局）→ 球局可见（看不到 → 404 `not_found`）→ 已取消 409 `game_closed` / 开打超过 30 分钟 409 `game_started`（11-04：开打后 30 分钟内仍可申请 / 直接加入） → 女生局非女生 403 `women_only`（记 women_apply_blocked）→ 屏蔽 403 `blocked` → 已有待确认 / 已加入 409 `already_applied` → 满员 409 `game_full` → 频率（和直接加入合计）：每小时 5 次 429 `apply_hourly_limit`、每天 15 次 429 `apply_daily_limit`、同一局每天 3 次 429 `apply_same_limit`
- 写入：game_participants（撤回 / 退出 / 被婉拒 / 失效后再申请，复用同一行：status = pending、created_at = now()）
- 通知：发起人 request（同一人再次申请只保留最新一条；同一局 10 分钟内只推一次）
- 事件：game_apply_submit（前端）

### POST /api/games/:id/join · `api_join(game_id)`
- 开打后（宽限期内）不能直接加入：409 `join_not_allowed`（detail `started`），要发申请由发起人确认（11-04）
- 直接加入（instant 局）
- 检查：同申请，另加：join_mode 不是 instant → 409 `join_not_allowed`；水平不在范围 → 409 `level_mismatch`；发起人对我「少遇到」→ 409 `join_not_allowed`（对方不知道原因，记 less_effect type=join）；频率同申请
- 写入：game_participants status = approved、via = instant、approved_at；满员由数据库处理（其余申请 full_auto 并通知）
- 通知：发起人 joined
- 事件：game_join_instant（前端）

### POST /api/games/:id/requests/:uid/approve · `api_approve(game_id, user_id)`
- 谁：发起人，否则 403 `not_host`
- 检查：带状态条件 `status = 'pending'`（影响 0 行 → 409 `state_changed`）；过了申请截止 → 409 `application_expired`；刚好被占满 → 数据库按「满员自动结束」处理并通知申请人，接口返回 200 `{status:'rejected', reason:'full_auto'}`
- 写入：status = approved、decided_at、approved_at
- 通知：申请人 approved；满员时其余申请人 full
- 事件：host_decide {decision: approve}（前端）

### POST /api/games/:id/requests/:uid/decline `{reason: known|level|pass, note ≤ 30}` · `api_decline(…)`
- 谁：发起人；带状态条件
- 写入：status = rejected、decline_reason、decline_note
- 通知：申请人 rejected（文案写明时间和球场，不说理由以外的话）
- 事件：host_decide {decision: decline, reason}（前端）

### DELETE /api/games/:id/requests/me · `api_leave(game_id)`
- 撤回申请（pending → withdrawn）或退出（approved → left），都写 left_at；发起人 → 409 `host_cannot_leave`
- 临时退出：开打前 24 小时内退出且不在通过后 10 分钟内 → 计一次（风险信号 late_leave、等级半次）；改时间后选择退出（change_ack = out）不算
- 通知：已加入的退出 → 发起人 player_left；开打前 1 小时以上、非私人局 → 之前因满员没排上的人 reopen（一次）
- 事件：apply_withdraw / game_leave（前端）

### POST /api/games/:id/change-ack `{choice: ok | out}` · `api_change_ack(game_id, choice)`
- 改时间后已加入的人确认：ok 继续；out 退出且不算临时退出

### POST /api/games/:id/attendance/:uid `{came | no_show}` · `api_attendance(…)`
- 谁：发起人；结束后 48 小时内

### PATCH /api/games/:id/me `{show_wechat}`
- 只在私人球局里有效；微信号只在双方都打开时可见（my_private_contacts）

---

## 6. 邀约

### POST /api/invites `{to_user, starts_at, ends_at, venue_id | venue_name, game_type: singles|rally, note ≤ 30}` · `api_invite(…)`
- 检查（顺序）：前置三关（action = invite，target = to_user）→ 不能约自己 422 `invite_self` → 屏蔽 403 `blocked` → 对方「谁可以约我」：none 403 `invite_closed` / played 且没一起打过 403 `invite_played_only` → 对方对我「少遇到」403 `invite_closed`（对方不知道，记 less_effect type=invite）→ 今天已约 2 位新球友 429 `invite_new_limit` → 今天已发 3 个 429 `invite_daily_limit` → 30 天内被同一人婉拒 2 次 403 `invite_declined_twice`（同时记风险信号 invite_declined）→ 已有进行中的邀约 409 `invite_pending` → 时间：接下来 7 天、6:00–21:30、时长 1 / 1.5 / 2 小时 422 `time_out_of_range`
- 写入：invites（expires_at = 48 小时后）
- 通知：对方 invite
- 事件：invite_send（前端）

### POST /api/invites/:id/accept · `api_invite_accept(id)`
- 谁：接收人（status = pending），或发起人确认对方换的时间（status = counter）
- 检查：前置三关（action = accept，target = 对方）→ 已失效 / 已结束 409 `invite_ended` → 带状态条件
- 写入（一个事务）：建私人球局（capacity 2，场地按当前时间地点）→ 对方那一行 approved、via = invite → invites.status = accepted、game_id。重复点击第二次整笔失败（数据库 invite_game_fixed），不会多建一局
- 通知：发起人 invite_accepted（换时间后由发起人确认时，通知接收人）
- 事件：invite_accept（前端）

### POST /api/invites/:id/counter `{starts_at, ends_at, venue_id | venue_name}` · `api_invite_counter(…)`
- 谁：接收人；只能一次（409 `counter_once`）；和原来一样 422 `counter_same`；账号状态受限时不拦（§3.11）
- 写入：counter_*、countered_at、status = counter；expires_at 重新算 48 小时
- 通知：发起人 invite_counter
- 事件：invite_counter_send（前端）

### POST /api/invites/:id/decline `{reason: week|rest|pass, note ≤ 30}` · `api_invite_decline(…)`
- 谁：接收人（pending），或发起人拒绝换的时间（counter）
- 通知：对方 invite_declined
- 事件：invite_decline（前端）

### POST /api/invites/:id/withdraw · `api_invite_withdraw(id)`
- 谁：发起人（撤回邀约）或接收人（撤回自己提的新时间 → 回到 pending；仍算用过一次「换个时间」，不能再换）
- 事件：invite_withdraw（前端）

### 定时任务：邀约失效（4g）
- 每 15 分钟：pending / counter 且 48 小时到期或已过开打时间 → expired，通知等待回复的一方 invite_expired

---

## 7. 打完之后

### PUT /api/games/:id/recap `{feel?: hard|ok|easy, prefs: {uid: more|ok|less}, impressions: {uid: [kind…]}, done}` · `api_recap(game_id, p)`
- 谁：这局已加入、计入场次的人；结束后 7 天内，否则 409 `recap_closed`
- 写入：game_feel；player_prefs（随缘 = 删除这一行；少遇到同时写 player_pref_mutes）；impressions（给每位同场球友，可撤回）
- 对方不收到任何通知；多遇到 / 少遇到只影响自己的推荐
- 事件：feel_set / pref_set / impression_give / recap_done（前端）

### PUT /api/players/:id/pref `{more | ok | less}` · `api_pref_set(user_id, pref)`
- 在球员卡上设置，规则同上（不需要一起打过）
- 事件：pref_set（前端）

### POST /api/players/:id/kudos `{game_id}` · `api_kudos(game_id, user_id?)`
- 14 天内一起打过、每场每人一次 → 写 impressions（印象记为「友善」）；一键「都点个赞」= 不传 user_id，对同局每人各一次
- 事件：impression_give（前端）

### POST /api/games/:id/noshow `{target_id}` · DELETE（撤回）· `api_noshow_report(game_id, target_id)` / `api_noshow_undo(…)`
- 谁：同局已加入的人；结束后 48 小时内，否则 409 `noshow_window_closed`
- 写入：noshow_reports；达到确认条件（发起人反馈 / 两人局另一位 / ≥2 人）→ 被反馈人收到 noshow 通知（不显示是谁）
- 事件：noshow_report / noshow_undo（前端）· noshow_confirm（服务端）

### POST /api/games/:id/appeal `{reason: came|told|other, note ≤ 200}` · `api_noshow_appeal(…)`
- 谁：被确认爽约的本人；申诉期间不计入
- 事件：noshow_appeal（前端）

---

## 8. 聊天、举报、屏蔽、通知

### GET /api/threads · GET /api/threads/:id/messages?before
- 打开对话：私信 `api_thread_dm(user_id)`（没有就建，屏蔽时 403 `blocked`）· 球局群聊 `api_thread_game(game_id)`（发起人和已加入的人）
- 只返回我在的对话（行级权限）；被隐藏的消息只有发送人自己看得到

### POST /api/threads/:id/messages `{body 1–200}` · `api_message_send(…)`
- 检查：不在对话里 403 `forbidden` → 球局群聊开打 48 小时后关闭 409 `chat_closed` → 前置两关（action = chat，私信 target = 对方）→ 屏蔽 403 `blocked` → 空 / 超过 200 字 422 `invalid` → 含链接 422 `message_link` → 注册 7 天内主动开始和新的人聊天每天 3 位 429 `dm_new_limit` → 每分钟 10 条 429 `message_too_fast`
- 对方对我「少遇到」：照常发出，不提醒对方（同局开打前 24 小时到结束后 2 小时除外），记 less_effect type=dm
- 通知（11-04）：收到消息 → 对方（球局群聊 = 同局其他已加入的人）生成 `chat` 通知（`thread_id` + 发送人，不带 game_id），发送程序推到手机：文字直白、不带发送人和内容：私信「你收到一条新私信」、群聊「球局群聊有新消息」，正文留空（iOS 自带「from 南伴球」，共两行；11-04 用户要求），夜里也立刻推；点开 `/melbourne/?t=<会话>`。不通知：有屏蔽关系；对方把我设成「少遇到」（同局开打前 24 小时到结束后 2 小时除外）；同一会话里上一条通知还没读且 5 分钟内已通知过（打开会话 = `api_chat_notif_read`，通知标已读，之后新消息立刻再推）
- 事件：chat_send（前端，不含内容）

### POST /api/reports `{target_type: user|game, target_id, reason: pact_violation|harass|no_show|fake_profile|other, note ≤ 200, via: card|chat, context_ref}` · 直接 insert reports
- 检查：选 other 必须写说明 422 `report_note_required`；同一对象未处理时重复 409 `report_duplicate`；每天 5 次 429 `report_daily_limit`
- 被举报人不知道是谁举报的
- 事件：report_submit（前端，不含说明）

### GET /api/reports/mine · 我举报过谁 `{reports:[{target_type,target_id,reason,created_at}]}`（11-05；只返回自己的、处理中 open 的，已处理的不再返回即可重新举报；不含说明和举报人；登录时读入前台「已举报」标记，刷新 / 换设备后还在；不需要迁移，RLS rp_mine）

### GET /api/me/after · 赛后读回 `{prefs:[{target_id,pref,game_id,updated_at}], feels:[{game_id,feel,closed_at}], impressions, noshows, appeals}`（11-04 6d；只返回自己的：全部多遇到 / 少遇到、近 8 天的赛后感受、近 15 天给的印象与没到场反馈、申诉；登录时读入前台）

### GET /api/blocks · 我屏蔽的人 `{blocks:[{user_id, created_at}], profiles}`（只返回我屏蔽的，不返回谁屏蔽了我；登录时读入前台屏蔽名单）

### POST /api/blocks `{user_id}` · DELETE /api/blocks/:user_id · `api_block(uid)` / `api_unblock(uid)`
- 屏蔽：对方在我球局里的待确认申请自动婉拒（decline_reason = blocked），对方不收到通知；双方互相看不到对方发起的球局、不能申请、不能约、不能私信
- 事件：user_block / user_unblock（前端）

### GET /api/notifications · POST /api/notifications/read `{ids[] | all}` · `api_notif_read(ids?)`
- 只能标自己的通知已读；待处理的（待确认申请、待回复邀约）处理完之前保持未读
- 列表每行 `{id, kind, game_id, invite_id, actor_id, read_at, created_at}`；邀约类（invite / invite_counter / invite_accepted / invite_declined / invite_expired）带 invite_id（11-04 起）
- 事件：notif_open（前端）

---

## 9. 球员卡、分享、球场

### GET /api/players/:id/card · GET /p/:member_no
- 读 player_cards、public_profiles；不返回手机号、邮箱、微信号、性别、账号状态原因
- 记 card_view（不含看自己）

### GET /api/players/:id/invite-state
- 球员卡按钮状态：can_invite | pending_out | pending_in | counter | upcoming_game | only_played | hidden（屏蔽时）

### POST /api/venues/suggest `{venue_id?, payload}` · POST /api/venues/:id/reviews
- 写 venue_suggestions（待审核）/ venue_reviews；球场页目前「未上线」（第二批决定）

### POST /api/events（批量上报埋点）
- 用 nbq_service 写入；关闭「使用数据」的用户由数据库丢弃；字段按 events_spec.md
- **实现（第 5 轮，10-30 起）**：body `{v:2, events:[{ev, at, uid, anon, sid, device, build, env, os, city, scr, props}]}`，一批最多 100 条、整体不超过 96KB。没登录也能调（sendBeacon 带不了请求头）；带了有效令牌，且事件自称的 `uid` = 令牌对应的人，才记 `user_id`，其余按匿名；令牌坏了也记（匿名）。只收字典里 `source=client` 且 active 的事件名，字段不合格的整条丢弃，不返回错误细节。同时维护 `sessions`（首次建、之后累加 events_n / last_event_at；session_start 的落地页 / 来源参数补进去）；收到本人的 `login_success` 才写 `identity_links`。关了「使用数据」的人服务端直接不记。**还没做**：按 IP 限流（放 Workers 入口）。
- **推送公钥** `GET /api/push/key` → `{key}`（环境变量 VAPID_PUBLIC，Pages / Workers 都要设；没配 404 `push_unavailable`，前台安静跳过）。
- **发送程序版本** `GET /api/version`（不需要登录）→ `{sender:{version, at, heartbeat_age_s}}`：`version` = 部署时写进 Worker 的代码指纹（`node tools/worker_version.mjs`），Worker 每分钟写进心跳表 `ops_heartbeats`（名字 `sender@<指纹>`）；`heartbeat_age_s` = 距上次发送心跳的秒数。和仓库指纹对得上 = 线上是最新代码。

---

## 10. 后台（/admin/api，schema ⑰，5c）

### 10.1 登录与会话（server/admin/auth.mjs）
- POST /admin/api/login `{email, password, code | recovery}` → `adminLogin()`：`admin_login_begin` 查锁定 → scrypt 校验密码 → TOTP 校验（前后各容忍 30 秒；同一个码不能用两次）或一次性恢复码 → `admin_login_finish` 记结果、建会话。
  - 任何一步不对都只回 401 `admin_bad_login`（不说是哪一步，避免猜账号）；连错 5 次锁 15 分钟 → 429 `admin_locked`（detail = 剩余秒数）。
  - 成功：Set-Cookie `nbq_admin=<令牌>`（HttpOnly、Secure、SameSite=Strict、Path=/admin），数据库只存令牌的 sha256。
- 每个请求 → `adminRequest()`：`admin_session_check`（未撤销、12 小时内、闲置不超过 1 小时、管理员没被停用；否则 401 `admin_session_expired`）→ owner / operator 以 nbq_admin、viewer 以 nbq_viewer 开事务，`set_config('nbq.admin', 管理员 id)`、`nbq.admin_ip`。
- POST /admin/api/logout → `admin_session_revoke`。
- **已实现（11-05，#27 第 1 步 PR-A，server/admin/api.mjs）**：`GET /admin/api/health[?db=1]` · `POST /admin/api/login` · `POST /admin/api/logout` · `GET /admin/api/me`（→ `{name, role, cities, perms:[{action,label,need_reason}]}`）。其余接口（§10.3）随数据页逐个接入，每条在 `ROUTES` 里声明所需权限。
  - 域名白名单 `ADMIN_HOSTS`（生产 = nanbanqiu.app；预览 = *.nanbanqiu-preview.pages.dev）：没登记的域名（含预览站根域名，它和正式站是同一个生产部署但没有 Access）一律 404；没配 = 全部 404。
  - 防跨站：除 health 外必须带 `X-NBQ-Admin: 1`；POST 还要 `Origin` = 本站、`Content-Type: application/json`、请求体 ≤ 8KB → 否则 403 `csrf` / 415 / 413 / 400 `bad_json`；参数格式不对 422 `invalid`。
  - 按 IP 限流：同一 IP 15 分钟内登录失败 ≥ 20 次（含不存在的邮箱）→ 429 `rate_limited`（Retry-After）；在算 scrypt 之前检查。邮箱不存在也照算一次 scrypt（耗时不泄露账号是否存在）。
  - 数据库登录角色 `nbq_admin_api`（NOINHERIT，只属于 nbq_admin / nbq_viewer，只能直接调 6 个门禁函数）；连接只用密钥 `ADMIN_DB_URL`。数据库连不上 503 `db_unavailable`；没见过的错误 500 `server_error`（不带原文）。所有响应 no-store。
  - 第一个管理员：`node tools/admin_create.mjs --email= --name= --role=owner` 在本机生成 SQL（只含哈希）+ 验证器密钥 + 恢复码，粘到 Supabase SQL Editor 运行。
- 新管理员：owner 在后台添加（`admin_add`），系统生成临时密码、两步验证二维码（otpauth://）和 10 个恢复码，只显示一次；第一次登录后改密码（至少 12 位）。
- 管理员：你 + 1 位备用 owner（10-22 决定）；至少保留 1 位 owner，少于 2 位时后台提示（`admin_health`）。离职：`admin_update(停用)`，会话立即失效。

### 10.2 权限（admin_perms，后台页面 ADMIN_PERMS 与它逐条相同）

| 操作 | owner | operator | viewer | 必须填理由 |
|---|---|---|---|---|
| 查看统计和名单 | ✓ | ✓ | ✓ | |
| 查看操作日志 | ✓ | ✓ | | |
| 待核实 / 受限 / 暂停 / 恢复正常 | ✓ | ✓ | | ✓ |
| 永久封禁、恢复已封禁或已注销的账号 | ✓ | | | ✓ |
| 重置昵称 / 头像 · 性别处理 | ✓ | ✓ | | ✓ |
| 给球友发通知 · 处理举报 · 审核球场 · 处理风险提醒 · 导出统计 | ✓ | ✓ | | |
| 查看被举报的对话 · 隐藏消息 / 评价 | ✓ | ✓ | | ✓ |
| 查看完整手机号 · 导出带用户 ID 的数据 · 修改风险 / 频率规则 · 管理管理员 | ✓ | | | ✓ |

- 后台**不能直接改业务表、不能直接读私信**：所有写操作和敏感读取都走 `admin_` 函数（查权限 → 查理由 → 做事 → 写操作日志，同一个事务）。理由至少 4 个字，记进日志。
- 私信只能在处理举报时看：`admin_report_messages(举报, 理由)` 只返回被举报的那段对话（聊天举报 = 那个对话；球员卡举报 = 两人的私信），举报前 7 天到举报后 1 天。

### 10.3 接口 → 函数
- POST /admin/api/users/:id/status `{status, reason_code, reason, days?, note?}` → `admin_user_status`（暂停 1 / 3 / 7 / 30 / 90 / 180 天；连带处理同 §3.11；发 account_status 通知；写 user_status_log）
- POST /admin/api/users/:id/reset `{what: nickname | avatar, reason}` → `admin_user_reset` · POST /admin/api/users/:id/gender `{action: clear | unlock, reason}` → `admin_user_gender`
- POST /admin/api/users/:id/phone `{reason}` → `admin_reveal_phone`（owner）
- POST /admin/api/reports/:id `{action: actioned | dismissed, note?}` → `admin_report_handle` · GET /admin/api/reports/:id/messages?reason= → `admin_report_messages`
- POST /admin/api/messages/:id/hide `{reason}` → `admin_message_hide`
- POST /admin/api/review/venues/:id `{action: approve | merge | reject, merge_into?}` → `admin_venue_review`
- POST /admin/api/risk/:id `{status: watching | handled | ignored, note?}` → `admin_risk_alert`
- POST /admin/api/export `{dataset, with_ids, reason?}` → `admin_export`（先拿许可、记日志，再导出；带用户 ID 只有 owner）
- PATCH /admin/api/rules/:kind/:rule `{patch, reason}` → `admin_rule_set`（owner；日志记改前改后）
- POST /admin/api/admins · PATCH /admin/api/admins/:id → `admin_add` / `admin_update`（owner）

### 10.4 后台错误码

| 错误码 | HTTP | 给管理员看的话 |
|---|---|---|
| admin_bad_login | 401 | 邮箱、密码或验证码不对 |
| admin_locked | 429 | 输错次数太多，请 15 分钟后再试 |
| admin_session_expired | 401 | 登录已过期，请重新登录 |
| admin_forbidden | 403 | 你的角色不能做这件事 |
| admin_reason_required | 422 | 请填写理由（至少 4 个字） |
| admin_last_owner | 409 | 至少要保留一位超级管理员 |
| admin_city_not_ready | 409 | 这个城市还没准备好：检查清单里还有没通过的项 |
| admin_config_stale | 409 | 别人刚发布了新版本，请刷新后再改 |

### 10.5 城市（schema ㉔，地区扩展 R4）
- **按城市授权**：`admin_users.cities`（空 = 全部城市；超级管理员一律全部）。会话 `admin_session_check` 返回 `cities`，后台页面据此默认筛选。
  - 读：球友、球局、球场三张表只显示负责的城市；统计函数（经过 `stat_cities`）只算负责的城市，给了不负责的城市返回空。其余明细表和汇总视图不按城市隔离。
  - 写：处理类操作按对象的城市检查（球友 = 常用城市、举报 = 举报人、消息 = 发送人、球场、风险提醒 = 那位球友、城市本身），不负责 → 403 `admin_forbidden` detail=city；导出、改规则、管理管理员只有「全部城市」的人能做。
- GET /admin/api/cities → `admin_city_overview()`：每个城市的状态、试运行 / 正式开放时间、区、球场、球友、近 30 天球局、开放时通知我（登记 / 待通知）、检查清单。
- **检查清单** `city_checklist(city)`：区 ≥ 20（试运行前）· 球场 ≥ 10（试运行前）· 时区 / 中心 / 网址 / 默认位置 / 话题（筹备前）· 当地社群链接（正式前）· 试运行满 14 天（正式前）。
- POST /admin/api/cities/:city/status `{status, reason}` → `admin_city_status`（`city.manage`，超级管理员，要理由）：off → prep → beta → on，往前要过对应的检查项（否则 409 `admin_city_not_ready`，detail = 没过的项，逗号分隔），往回不检查；进入试运行记 beta_at，第一次正式开放记 launched_at。
- PATCH /admin/api/cities/:city `{community_url?, hashtag?, center_label?, reason}` → `admin_city_set`（社群链接只能是 https）。
- GET /admin/api/cities/:city/waitlist?reason= → `admin_city_waitlist`（`city.waitlist`，超级管理员，要理由；试运行 / 正式之后才行）→ 还没通知的邮箱（CSV）；POST …/waitlist/done → `admin_city_waitlist_done` 标记已通知（30 天后删除）。
- PATCH /admin/api/admins/:id/cities `{cities, reason}` → `admin_set_cities`（`admin.manage`）。
- 顶部城市筛选：两个以上城市试运行 / 正式后出现；各页面接口带 `?city=`。

---

## 11. 定时任务（schema ⑫，4g）
都是 `job_` 函数，nbq_service 运行，可重复执行，每次运行记 job_runs；装了 pg_cron 时自动登记。
- 每分钟：job_expire_applications（申请失效）· job_start_checks（开打时人数检查、没凑齐 unfilled_end、结束的局标 completed）· job_soon_reminders（开打前 30 分钟）
- 每 5 分钟：job_unfilled_reminders（开打前 2 小时还缺人）· job_monitor（16 项检查与报警，5d，见 §13）
- 每 10 分钟：job_recap_notices（赛后提醒，22:00–08:00 顺延到 8 点，超过 24 小时不发）· job_restore_suspended（暂停到期恢复）
- 每 15 分钟：job_expire_invites（邀约失效）
- 每小时（第 7 分钟）：job_risk_scores（风险分与风险提醒，5a-2）
- 每小时（第 17 分钟）：job_sb_hourly（场边：话题放出 / 沉下去、今日推荐、浏览明细 30 天后删，第七批 S3，见 §14.14）
- 每天 03:10：job_nightly（汇总最近 3 天 + 注销满 30 天匿名化 + 清理频率计数 31 天、风险信号 90 天、注册 IP 30 天）
- 发送通知与邮件由后端的发送程序做（按 §3.6 的路由规则读 notifications），不在数据库里，见 §12。

## 12. 通知发送程序（server/notify，schema ⑬，4h）

- 常驻进程 `node server/notify/adapters.mjs`，以 `nbq_service` 连接；可开多个，`for update skip locked` 保证每条只发一次。
- **dispatch（每 15 秒）**：读 `pushed_at` 为空、`coalesce(send_after, created_at) ≤ now` 的通知，依次：
  1. 夜间 22:00–08:00 不紧急的 → `send_after` = 墨尔本 8:00、`deferred` = true，下一轮再看（夏令时那夜按墙上 8 点）
  2. 过时的（已读 / 拉黑 / 已取消 / 已开打 / 申请已处理 / 不在局里 / 已满或已加入 / 邀约已结束）→ 不推，记 `none / stale:<原因>`
  3. 同一局的申请 10 分钟内已推过 → 记 `none / merged`，并进还没发出的申请邮件
  4. 8 点到期的顺延提醒：同一人只推一条（`deferred_night`），其余 `merged`
  5. 选设备：正在用（60 秒内有心跳）→ 页面里提醒 `in_app`；出发类且正在用的是电脑 → 另推手机 `go_kind`；都没在用 → 手机 `mobile_first`，没有才电脑 `no_mobile_push`；手机推送失败 → 改推电脑 `mobile_failed`
  6. 只推到电脑或推不到 → 排补发邮件（§3.6 邮件规则）；推不到又不能发邮件 → `none / no_push`
- **推送**：Web Push（VAPID）。2xx → `user_devices.push_ok_at`；404 / 410 → 清空这台设备的推送字段（设置页显示「推送已关闭」）；其他 → 这次算没推到，订阅保留。
- **flushEmail（每分钟）**：发到期的 `email_outbox`，改动 > 结果 > 申请；不发的记 `skip_reason`：`email_bad`（退信 / 投诉）· `pref_off` · `pushed`（期间手机或页面已送达）· `seen` · `stale`（已开打 / 已取消 / 申请都已处理）· `daily_cap`（墨尔本自然日 5 封，第 5 封附说明）。发出的记 `email / unread_5min`（推不到的第一去向记 `email / no_push`）。邮件服务出错 → `failed`。
- **邮件回调**（Resend webhook，先校验签名）：`email.bounced` / `email.complained` → `users.email_status`，那封记 `bounced`，之后不再发。
- 场边互动通知（sb_ball / sb_reply / sb_reply_to）见 §14.8b。
- 测试：`tests/pg/notify.mjs`（假推送 / 假邮件服务）。

---

## 13. 上线后盯什么（schema ⑱，5d；处理办法见 出事处理手册.md）

- **16 项检查** `monitor_checks()`（阈值在 `monitor_thresholds`，改数值只改表）：
  - 系统：定时任务没在跑 · 提醒积压 · 发送程序没在跑 · 推送失败率 · 邮件退信率 · 邮件发送失败 · 验证码输错激增 · 频率限制触发激增 · 页面报错 · 数据库连接数 · 慢查询 · 恢复演练
  - 业务：人齐率骤降 · 新注册骤降 · 举报激增 · 申请失效率
  - 数据量不够时（如推送尝试 < 20 次）不判断，避免夜里误报。
  - **业务类按城市**（R2）：每个正式开放（on）的城市各算一行（球局按球场城市，注册、举报按本人常用城市），`monitor_checks()` 多返回 city / city_name；试运行（beta）的城市不报警。
- **报警**：`job_monitor()` 每 5 分钟；同一项（业务类：同一项同一城市）同时只有一条未恢复的报警，名称带城市（「人齐率骤降 · 悉尼」）；城市退回试运行 / 关闭后它的报警自动关掉；新出现、警告升严重、6 小时仍未恢复、恢复 → 由 `server/ops/monitor.mjs` 发邮件给所有在职 owner。后台「管理员 → 系统状态」看当前状态。
- **页面报错**：三个页面监听 error / unhandledrejection，只报错误信息和出错位置（文件名、行号），同一条只报一次、每页最多 20 条 → POST /api/client-errors（后端按 IP 限流，每分钟 30 条）→ `client_error_log()`，按小时合并计数。
- **送达失败**：发送程序把推送非 2xx（404 / 410 订阅失效除外）和邮件服务出错记进 `delivery_errors`；每轮处理写心跳 `ops_heartbeats`。
- **备份**：Supabase 每日备份 + 时间点恢复（建议开）；每天一份 AES-256-GCM 加密逻辑备份放异地；每月 `server/ops/backup.mjs drill` 演练（导出 → 加密 → 恢复到新库 → 18 张表对数 → `ops_verify()` 自检 → 记 `ops_drills`）。

---

## 14. 场边 24h（schema ㉕，第七批 S2；设计稿 南伴球_场边设计稿_v35.html）

本批只做到数据库和接口；场边错误码在第八批 F1b 并入了 §1 和两端的 API_ERR（tests/static/api_err.mjs 只对照 §1）。

### 14.1 读
- 都是直接查表，行级权限决定能看到什么（schema ㉕ sb_post_public / sb_post_readable）：没登录也能看 24 小时内公开的；屏蔽双方互相看不到；点了不感兴趣的看不到；停用、封禁、注销的人发的看不到；自己的一直看得到（相册），删了就没了。
- 前台拿不到：后台隐藏原因、照片识别标签、审核人。

### 14.2 POST /api/sideline/posts · `api_sb_post(p)` → `{id, topic_id, floor, new_topic, publish_at}`
- p：`{body ≤ 60, topic_id | topic_title, venue_id, city, photos: [{key, w, h}] ≤ 3, tone: ''|warm|film|dawn, later, replies_open}`
- 检查顺序：没登录 401 `login_required` → 停用 / 封禁 / 注销 403 `account_<状态>`（待核实、受限可以发；场边不需要先同意球友约定）→ 超过 60 字、没字也没照片 422 `invalid`（detail = body）→ 含链接 422 `message_link`（和私信同一条规则，被拒记风险信号）→ 照片超过 3 张、不是本人上传的键（`sb/<本人 id>/<8–64 位>.jpg|webp`）、同一张两次 422 `invalid`（photos）→ 色调不对 422 `invalid`（tone）→ 球场不存在或未审核 422 `invalid`（venue）→ 城市没开放 409 `city_closed`
- 城市：带球场用球场的城市，否则 p.city，否则本人常用城市。
- 话题：`topic_id` = 选已有的；`topic_title` = 输入的名字（可以带 #），依次：名字不在 2–12 字 422 `invalid`（topic_title）→ 太宽的词 422 `topic_too_generic` → 相似词、同名（不分大小写）并入已有话题 → 名字里有链接、联系方式、冒充官方 422 `topic_name_not_allowed`（detail = 原因）→ 新建（大家发起；到门槛前不出现在「大家在聊」和搜索里，拿到链接的人能发），每天 3 个 429 `sb_topic_daily_limit`。两个人同时新建同名话题，后到的自动并入。
- 选的话题不存在 404 `not_found`（topic）；已下线、限时话题不在时间内 409 `topic_ended`；合并掉的话题发到合并进的那个；别的城市的话题 422 `invalid`（topic_city）；沉下去的话题有人发就浮上来。
- 编号 No.N：话题行加锁递增，同时发不重复；发布失败不占编号；删掉的编号不回收。
- `later = true`：2 小时后再公开（`sb_settings.later_hours`），之前只有自己看得到。
- 频率：每小时 5 条 429 `sb_post_hourly_limit`、每天 20 条 429 `sb_post_daily_limit`（detail = 要等的秒数）。
- 照片先发后审：发出立刻可见；识别程序（nbq_service）随后调 `sb_photo_scan(post, idx, tags, suspicious)` 写标签，可疑的改成 blurred（打码）送后台审核；人工审过的不再被自动改。

### 14.3 DELETE /api/sideline/posts/:id · `api_sb_delete(id)`
- 只能删自己的；不存在、别人的、已删的 404 `not_found`（post）。删了大家和自己的相册里都没了。

### 14.4 POST /api/sideline/posts/:id/replies `{body 1–60, to}` · `api_sb_reply(post, body, to)` → 回复 id
- 检查：没登录 401 `login_required` → 停用 / 封禁 / 注销 403 `account_<状态>` → 这条现在对我不公开（没公开、过了 24 小时、删了、被隐藏、屏蔽、我点了不感兴趣）404 `not_found`（post，不说明原因）→ 作者关了回复 409 `replies_closed`（作者自己还能回）→ 空 / 超过 60 字 422 `invalid`（body）→ 含链接 422 `message_link` → to 不是作者、也不是这条下面我看得到的回复人，或者是自己 422 `invalid`（to）→ 每分钟 6 条 429 `message_too_fast`
- 回复数（sb_posts.replies）= 没删、没被后台隐藏的回复，由触发器重算。

### 14.5 DELETE /api/sideline/replies/:id · `api_sb_reply_delete(id)` · PATCH /api/sideline/posts/:id `{replies_open}` · `api_sb_replies_open(post, open)`
- 只能删自己的回复；只有作者能开关回复（发出后也能改）。不是自己的 / 不存在 404 `not_found`。

### 14.6 PUT / DELETE /api/sideline/posts/:id/ball · `api_sb_ball(post)` / `api_sb_unball(post)` → 现在的网球数
- 点：要求对我公开（否则 404 `not_found`），停用中 403 `account_suspended`，每分钟 30 次 429 `rate_limited`；重复点、重复取消都不报错。自己的也能点。
- 网球数和 sb_balls 一致，同时点也不会多算少算。

### 14.7 POST /api/sideline/posts/:id/hide `{reason: none|topic|user|far}` · `api_sb_hide(post, reason)`
- 先隐藏（none），选了原因再调一次补上。自己的 422 `invalid`（post）；原因不对 422 `invalid`（reason）；看不到的 404 `not_found`。不通知对方，对方也查不到。

### 14.8 举报 · 浏览 / 分享
- 举报：POST /api/reports，`via = sideline`，`target_type = sb_post | sb_reply`，原因 `harass | photo | fraud | other`（不要求写说明），其余规则同 §8（每天 5 次、重复 409 `report_duplicate`）。只能举报自己现在看得到的（否则 404 `not_found`）、不能举报自己的（422 `invalid`，target）。举报照片：这条没人工审过的照片立刻打码送审。
- 浏览：POST /api/sideline/views `{post_ids ≤ 50, device}` · `api_sb_view(ids, device)`；分享：POST /api/sideline/posts/:id/share `{device}` · `api_sb_share(post, device)`。返回算上的条数。
  - 一个人一天只算一次（日期按这条所在城市）；没登录按设备匿名 id（16–64 位字母数字，存的是哈希），没有或格式不对 422 `invalid`（device）；自己的、对我不公开的不算；超过 50 条 422 `invalid`（posts）。
  - 没登录能调（看和分享不算互动）；同一 IP 刷设备 id 由后端按 IP 限流。

### 14.8b 互动通知（S2b+，10-26 定：是重要的心理满足）
- 写入（数据库，和互动在同一个事务里）：
  - 网球 `sb_ball` → 作者。第一下新建一条（会推）；作者还没看（read_at 为空）时，后面的网球并进这一条：`sb_count` = 上一条网球提醒看过之后点的人数，`actor_id` = 最近点的人，不再推；看过之后再有新网球 → 新的一条。取消网球跟着重算，0 人就把没看的那条拿掉。自己点自己的不提醒。
  - 回复 `sb_reply` → 作者；回复某人 `sb_reply_to` → 被回复的人（回复的是作者时只给作者一条）。自己回自己的不提醒。同一条发布 10 分钟内的并进同一条（`sb_count` = 不同的人数，`sb_reply_id` = 最近一条），不再推；超过 10 分钟新的一条。
  - 通知带 `sb_post_id`（发布真删时一起删）、`sb_reply_id`、`sb_count`；前台按 id 打开那条发布。
- 发送（§12，server/notify）：不紧急（夜里顺延到 8 点）；不发邮件；推送前 `sb_notif_stale(id)` 判过时（发布 / 回复被删或被后台隐藏 → `none / stale:removed`），屏蔽了也不推。
- 文字：网球「Leo 给你点了网球 🎾」/「Nia 和另外 2 人给你点了网球 🎾」，正文引用发布前 24 字（只有照片时「你的照片」）；回复「Leo 回复了你」/「Mia 等 2 人回复了你」，正文是回复内容（前 40 字）。

### 14.9 错误码（场边新增）

第八批 F1b 起已并入 §1 和两端的 API_ERR（下表留作出处）。

| 错误码 | HTTP | 给用户看的话 | 谁判断 |
|---|---|---|---|
| topic_too_generic | 422 | 这个词有点宽，换个具体点的说法吧 | 数据库 sb_topic_resolve（sb_generic_words） |
| topic_name_not_allowed | 422 | 话题名里不能有链接、联系方式或「官方」等字样 | 数据库 nbq_nickname_problem |
| topic_ended | 409 | 这个话题已经结束了 | 数据库 api_sb_post |
| sb_post_hourly_limit | 429 | 发得有点多，过一会儿再发吧 | 数据库 nbq_rate |
| sb_post_daily_limit | 429 | 今天已经发了 20 条，明天再来吧 | 数据库 nbq_rate |
| sb_topic_daily_limit | 429 | 今天已经发起了 3 个话题，明天再来吧 | 数据库 nbq_rate |
| replies_closed | 409 | 作者关闭了回复 | 数据库 api_sb_reply |

### 14.10 被拒的操作记风险信号（S2c，沿用 §0.5）
- 后端收到下面的错误码后，另开事务以 nbq_service 调 `risk_log_rejected(user_id, 错误码, 相关对象)`：
  - 发布 / 回复 `message_link` → link_attempt（相关对象：回复填发布 id，发布不填）。
  - 话题名 `topic_name_not_allowed` 且 detail = `link` 时，按 `message_link` 记（相关对象 `topic`）；detail 是联系方式、冒充官方等其他原因的不记。
  - 场边频率上限 `sb_post_hourly_limit` / `sb_post_daily_limit` / `sb_topic_daily_limit` / `message_too_fast`（回复）/ `rate_limited`（网球）→ rate_hit。
  - 其他拒绝（`invalid`、`not_found`、`topic_too_generic`、`topic_ended`、`replies_closed`、`account_*`）不记。
- 规则沿用已有的两条：7 天内 3 次发链接 →「反复尝试发链接」，1 天内 5 次触发频率限制 →「反复触发频率限制」；只提示运营，不自动处罚。

### 14.11 没登录一律不能写（S2c）
- 发布、删除、回复、删回复、开关回复、点 / 取消网球、不感兴趣、下载我的数据：没登录、或登录的账号已不存在 → 401 `login_required`（数据库 nbq_me 判断），不说别的原因，什么都不写。举报是直接写表：后端先回 401，数据库的行级权限也不让写。
- 只有浏览、分享计数没登录也能调（按设备，§14.8）。
- 场边的表前台一律不能直接改（只能调上面的函数）；场边函数 PUBLIC / anon 都不能调，只能由后端以 nbq_user 调。

### 14.12 下载我的数据（S2c，§8 `api_export_me` 加 `sideline` 一栏）
- `posts`：自己的发布（含后台隐藏的、过了 24 小时只在相册里的；删了的不含）：时间、公开时间、城市、文字、话题名、编号、球场、色调、是否开回复、照片键、网球 / 回复 / 浏览 / 分享数。
- `replies`（回复谁、内容、时间）、`balls_given`、`not_interested`（原因）、`topics_started`、`viewed_count`。
- 不含：后台隐藏原因、照片识别标签和审核结果（和前台一样拿不到）；别人对我的不感兴趣、别人的回复内容。

### 14.13 同时操作（S2c，tests/pg/sb_race.mjs）
- 每个场景「A 先 / B 先 / 自由并发 25 次」：同一话题同时发编号不重、不跳号（其中一笔失败回滚不占号）；同时新建同名话题只建一个；网球数（两人同时点、同一人点和取消、双击、点的同时作者删除）和网球提醒人数始终和实际一致；回复数（同时回复、回复和删回复、回复的同时作者关回复）和实际一致；同一人同时浏览只算一次。
- S2c 修了一处：同时回复时回复数会少算 1（触发器先锁作者行再数）。

### 14.14 定时任务（S3，`job_sb_hourly`，每小时第 17 分钟，tests/pg/sb_jobs.mjs）
- 放出：大家发起的话题，最近 `release_days`（7）天有 `release_people`（3）个不同的人发过（没隐藏、没删除）→ `released_at`；后台提前放出的不改。
- 沉下去：放出后 `sink_days`（30）天没人发（没帖子按放出时间算）→ `sunk_at`；有人再发时 `api_sb_post` 清掉。常驻 / 限时不沉。
- 今日推荐 `sb_today(city, day)`：每座开放（beta / on）的城市按当地日期一条。顺序：特别安排（按日期、话题已上线且在时间内）→ 周历（`alt_topic_id` 隔周轮换：ISO 周数单数用它；`auto_hot` = 前 7 天不同发帖人最多的已放出、没沉、没并入的大家发起话题，同城）→ 兜底（排序第一个、周历里没有的常驻话题）。当天已选的「本周最热」不再换；其余跟着排期变。「雨停了」要天气数据，还没接。
- 前台读 `sb_today_topic(city)` → `{day, topic_id, source}`（没登录也能读；任务还没写今天这条时当场算；没开放的城市返回 null）。
- 浏览去重明细 `sb_views` 30 天后删；总数在 `sb_posts.views / shares`。
- 「2 小时后再公开」「24 小时收进相册」按 `publish_at` 实时判断，任务不改发布。
- 监控「定时任务没在跑」加上 sb_hourly（2.5 小时没成功算异常）。

### 14.15 配置下发（S4，tests/pg/sb_config.mjs）
- 配置 = 一份 JSON，9 块：`topics`（常驻 / 限时；大家发起的不在里面）· `alias` · `generic` · `settings` · `hints` · `slots` · `starters` · `week` · `specials`。正式的配置表是唯一口径，版本里存的是它的导出（`sb_config_export()`）；建库时存第 1 版（= 设计稿 v35）。
- 前台：GET /api/sideline/config?v=<手上的版本> → `sb_config(v)`（没登录也能读）→ 版本没变 `{version, same: true}`；否则 `{version, published_at, config}`，只含上线的话题、上线的特别安排，不含周历 / 特别安排的说明。
- 后台（`sideline.config`：超级管理员、运营；只负责部分城市的不能改；只读能看）。所有写操作带 `base` = 页面上看到的版本号，别人这期间发布过 → 409 `admin_config_stale`（detail = 最新版本号）：
  - GET /admin/api/sideline/config → `admin_sb_config_draft()` → `{version, published_at, config, changed[], updated_by, updated_at}`（草稿只有一份，大家共用；没有草稿 = 最新版本）
  - PUT /admin/api/sideline/config/:part `{value, base}` → `admin_sb_config_set(part, value, base)`：替换草稿的一块，保存时就整份检查（错了 422 `invalid`，detail = `config:<块>[:<项>]`，草稿不变）；改回和正式一样就没有草稿。
  - DELETE /admin/api/sideline/config `{base}` → `admin_sb_config_discard(base)`
  - POST /admin/api/sideline/config/publish `{note 1–60, base}` → `admin_sb_config_publish` → 新版本号；写进正式表、清草稿、马上刷新今日推荐。没改动 422 `invalid unchanged`。
  - POST /admin/api/sideline/config/rollback `{version, base, note?}` → `admin_sb_config_rollback` → 新版本号（记 from_version，说明默认「退回到 vN」）；没发布的草稿一起清掉。
  - GET /admin/api/sideline/versions → `admin_sb_config_versions(limit)` → 每版 `{version, note, published_by, published_at, from_version, changed[]}`
  - POST /admin/api/sideline/topics/:id/release → `admin_sb_topic_release(id)`（提前放出，不走版本；只负责部分城市的只能放自己城市的）
- 后台审核（待审核页「场边」；A1）：后台对场边表只读，写操作一律走函数。
  - POST /admin/api/sideline/posts/:id/hide `{hide, reason}` → `admin_sb_post_hide(post, hide, reason)`（`message.hide`，要理由；只负责部分城市的只能管自己城市）：hide = true → 别人看不到、作者仍在相册看到，`hidden_reason` 作者能看到；hide = false → 恢复。不存在或作者已删 404 `not_found`。
  - POST /admin/api/sideline/replies/:id/hide `{hide, reason}` → `admin_sb_reply_hide`（同上；回复数自动重算）。
  - POST /admin/api/sideline/photos/:post/:idx/review `{action: keep|remove}` → `admin_sb_photo_review`（`report.handle`）：只处理 `review = blurred`（自动识别可疑 / 被举报「不当照片」）的；keep → ok，remove → removed（别人看不到、作者看得到）；记审核人和时间，之后不再被自动改；不是待审核状态 409 `state_changed`。
  - 举报本身的状态仍用 `admin_report_handle`；操作日志 target = `sbpost:<id>` / `sbreply:<id>` / `sbphoto:<id>:<idx>`。
- 话题规则：配置里没列出的常驻 / 限时 → 下线（话题不删，旧帖子还挂着）；大家发起的列进来写成常驻 = 转为常驻（不能改成限时）；下线的话题还被时段 / 周历用着 → `config:slots:topic` / `config:week:topic`。
- 每次成功的操作记 admin_audit_log（action = sideline.config，target = draft:<块> / discard / publish / rollback:<版本> / 话题 id；发布记说明和改了哪几块）。
- 「雨停了」暂不做（10-27）：话题和特别安排都在，不上线。

