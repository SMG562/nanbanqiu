// 收尾闭环（11-19，逃逸缺陷「推完没通知所有者」）——由 tools/role_guard.mjs 的 Stop 钩子调用（脚本数有上限，不另开脚本）。
// 规矩「推完直接 @ 对方，不靠人催」原来只靠会话自己记得；现在机器兜底：分支有已推送的提交、却没有「交接」留言带本提交号 → 退回一次，
// 把该跑的命令写给会话（pr_say.sh 标签「交接」+ 提交号，正文 @ 对方）。没有 PR 时提示先开草稿 PR。
// 安全阀：同一次停止只退回一次（stop_hook_active）；main / 无提交 / gh 读不到 / 任何出错 → 放行；NBQ_CLOSE_GUARD=0 关。
import { execFileSync } from 'node:child_process';
export const R = 'SMG562/nanbanqiu';
// pr: {number,draft}|null；comments: 该 PR 的评论正文数组；ahead: 比 origin/main 多的提交数；pushed: 头提交已在远端
export function decide({ branch, sha, ahead, pushed, pr, comments = [], stopHookActive = false, off = false }) {
  if (off || stopHookActive || !branch || branch === 'main' || branch === 'HEAD' || !(ahead > 0) || !sha) return null;
  if (!pushed) return `【收尾闭环】分支 ${branch} 有未推送的提交（${sha}）：先推送，再通知所有者。`;
  if (!pr) return `【收尾闭环】分支 ${branch} 已推送（${sha}）但还没有 PR，所有者看不到：先开草稿 PR（描述写「改了什么」并 @SMG562 或 @MDD1102、勾风险类别），再用 bash tools/pr_say.sh <PR号> 交接 ${sha} "@对方 做了什么 / 待对方什么 / 下一步" 留言。`;
  if (comments.some(b => b.includes(`nbq-say:交接:${sha}:`))) return null;
  return `【收尾闭环】PR #${pr.number} 还没有针对最新提交 ${sha} 的「交接」留言，所有者收不到通知：bash tools/pr_say.sh ${pr.number} 交接 ${sha} "@SMG562 做了什么 / 待所有者什么（没有写「无」）/ 下一步 / 踩过的坑：…"。发完再结束；这条只提醒一次。`;
}
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
function collect() {
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']), sha = sh('git', ['rev-parse', '--short=7', 'HEAD']);
  let ahead = 0; try { ahead = +sh('git', ['rev-list', '--count', 'origin/main..HEAD']) } catch (_) { }
  let pushed = false; try { pushed = sh('git', ['rev-parse', '--short=7', `origin/${branch}`]) === sha } catch (_) { }
  const owner = R.split('/')[0]; let pr = null, comments = [];
  const prs = JSON.parse(sh('gh', ['api', `repos/${R}/pulls?state=open&head=${owner}:${branch}`]));
  if (prs[0]) { pr = { number: prs[0].number, draft: prs[0].draft };
    comments = JSON.parse(sh('gh', ['api', `repos/${R}/issues/${pr.number}/comments?per_page=100`, '--jq', '[.[].body]'])) }
  return { branch, sha, ahead, pushed, pr, comments };
}
export function stopReason(input) {                                                           // 给 role_guard 的 Stop 钩子用：出任何错 → null
  try { return decide({ ...collect(), stopHookActive: !!input.stop_hook_active, off: process.env.NBQ_CLOSE_GUARD === '0' }) } catch (_) { return null }
}
