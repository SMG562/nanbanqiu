/* ===== 首页引导条：显示规则（纯函数，不碰页面；tests/unit/intro_rules.mjs 在空沙盒里测）=====
 * 11-19 起：每天每端（pwa / web 各算一次）最多显示一次，所有人都看（含已登录、从主屏幕打开）；
 *   从分享 / 推送 / 球局链接进来这次不显示，也不占当天额度。
 *   on 开关 · deep 从分享 / 推送 / 球局链接进来 · surface 'pwa'|'web' · today 本机日期 · days 本机各端最后一次显示的日期
 *   audience 'all' 所有人｜'new' 只给新用户（本机第一次显示起 14 天内，或没有记录）；isNew 由 nbqIntroIsNew 算
 * 曝光够了要收窄：把 0502 里的 NBQ_INTRO_AUDIENCE 从 'all' 改成 'new' 即可（一行）。 */
const NBQ_INTRO_NEW_DAYS=14;
function nbqIntroDay(d){d=d||new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function nbqIntroIsNew(rec,now){return !rec||!rec.first||(now||Date.now())-rec.first<NBQ_INTRO_NEW_DAYS*864e5}
function nbqIntroDecide(c){c=c||{};const days=c.days||{};
  return c.on&&!c.deep&&(c.surface==='pwa'||c.surface==='web')&&days[c.surface]!==c.today&&(c.audience!=='new'||c.isNew)?'show':'off'}
