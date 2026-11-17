import { sharePage } from '../../server/og/page.mjs';
import { fromApiGame } from '../../server/og/card.mjs';
import data from '../../server/og/demo_data.json';
// 真实球局的卡片：问同域名的公开接口（匿名只返回公开球局），2.5 秒内没结果就退回演示快照 / 通用卡片
const lookup = origin => async code => {
  if (!/^[A-Za-z0-9]{3,16}$/.test(code)) return null;
  const r = await fetch(origin + '/api/game?code=' + code, { signal: AbortSignal.timeout(2500) });
  return r.ok ? fromApiGame((await r.json()).game) : null;
};
export const onRequestGet = ({ request, env, params }) => sharePage('g', params.code, request, env, data, lookup(new URL(request.url).origin));
