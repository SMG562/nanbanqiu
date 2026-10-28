// Cloudflare Workers 入口（预览站现在的部署方式：wrangler.jsonc + `wrangler deploy`，静态文件在 site/）。
// 只接管 /g/码、/p/编号（wrangler.jsonc 的 run_worker_first），其余全部交给静态资源。
// Pages 部署方式用的是 functions/ 目录（同一个处理函数 server/og/page.mjs）——两边都留着，哪种部署都生效。
import data from '../server/og/demo_data.json';
import { sharePage } from '../server/og/page.mjs';

export default {
  async fetch(request, env) {
    const m = new URL(request.url).pathname.match(/^\/(g|p)\/([A-Za-z0-9]+)\/?$/);
    if (m && (request.method === 'GET' || request.method === 'HEAD')) return sharePage(m[1], m[2], request, env, data);
    return env.ASSETS.fetch(request);
  },
};
