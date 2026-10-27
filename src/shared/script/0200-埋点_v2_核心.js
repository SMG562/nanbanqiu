/* ===================== 埋点 v2 · 核心 =====================
 * 事件字典：events_spec.md（唯一来源）。两端同名同 props；业务事件见下方「埋点 v2 · 业务事件」。
 * 公共字段：ev, at, uid, anon, sid, device(mobile|desktop，按设备推断), build(pwa|web，哪个文件), env, os, scr, props
 * 会话：localStorage 记最后活动时间，30 分钟无活动换新 sid 并先发 session_start；session_start 在身份恢复之后发
 * 隐私：只记「做了什么」，不记聊天内容、手机号、精确位置、性别值；「使用数据」关闭后不发任何事件（含未登录访客、session_start）
 *       登录后以账号设置为准（users.analytics_opt_out，服务端事件也遵守）
 * 传输：前端攒批，每 10 秒或页面切到后台时 sendBeacon 到 /api/events；服务端补 IP→区域（只到 suburb）、UA 解析
 */
