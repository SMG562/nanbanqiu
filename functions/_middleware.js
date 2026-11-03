// Pages 中间件：正式首页按屏幕宽度进应用、不再是入口页（规则在 server/site_route.mjs）。
// 只在 _routes.json（tools/site.mjs 生成）列出的路径上运行，图片、海报等静态文件不经过这里。
import { siteRoute } from '../server/site_route.mjs';
export const onRequest = async ctx => (await siteRoute(ctx.request)) || ctx.next();
