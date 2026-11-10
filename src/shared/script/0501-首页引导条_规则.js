/* ===== 首页引导条：显示规则（纯函数，不碰页面；tests/unit/intro_rules.mjs 在空沙盒里测）=====
 * 只给「第一次来、没登录、直接打开首页」的人看一眼南伴球是干什么的；任何一条不满足就不显示。
 *   on 开关 · loggedIn 已登录或本机有登录快照 / 令牌 · seen 本机看过 · standalone 从主屏幕打开 · deep 从分享 / 推送 / 球局链接进来 */
function nbqIntroDecide(c){c=c||{};return c.on&&!c.loggedIn&&!c.seen&&!c.standalone&&!c.deep?'show':'off'}
