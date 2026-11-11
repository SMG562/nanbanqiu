#!/usr/bin/env python3
# 南伴球 · 「故意改坏」检查的唯一入口（10-23 误删备份之后定的流程）。
#   python3 tests/lib/mutate.py 计划.json
#   计划.json：{"cmds": [["node", "{SRC}/tests/pg/routes.mjs"], …],            ← 默认每处都跑的测试
#              "mutations": [{"file": "schema.sql", "old": "…", "new": "…", "cmds": [...可选，覆盖默认]}, …]}
#   命令里 {DIR} = 改坏后的副本目录，{SRC} = 真实 outputs 目录；环境变量 NBQ_DIR 也指向副本。
# 安全规则（不靠自觉，靠代码检查；任何一条不满足立刻停）：
#   1. 副本只建在系统临时目录下新建的 nbq-mut-* 里，用 shutil.copytree 逐个复制真实文件（不跟随、不复制链接本身），
#      复制完检查副本是真实目录、不在 outputs 里面、outputs 也不在副本里面。
#   2. 只改副本里的文件：改之前检查目标文件的真实路径在副本之内。
#   3. 只删自己建的副本：删之前检查它在 nbq-mut-* 临时根之下、不是链接；除此之外这个脚本不删任何东西。
#   4. 开始前、结束后各算一次 outputs 全部文件（除 tests/reports）的指纹，不一致就报错并列出被改的文件。
import hashlib, json, os, shutil, subprocess, sys, tempfile

SRC = os.path.realpath(os.environ.get('NBQ_SRC') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SKIP_DIRS = {'备份', 'reports', 'node_modules', '.git'}
SKIP_EXT = ('.png', '.xlsx', '.zip')

def die(msg):
    print('停止：' + msg, flush=True); sys.exit(2)

def fingerprint(root):
    out = {}
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x != 'reports']
        for f in files:
            p = os.path.join(d, f)
            if os.path.islink(p): continue
            with open(p, 'rb') as fh: out[os.path.relpath(p, root)] = hashlib.sha256(fh.read()).hexdigest()
    return out

def inside(child, parent):
    child, parent = os.path.realpath(child), os.path.realpath(parent)
    return child == parent or child.startswith(parent + os.sep)

def main():
    if len(sys.argv) != 2: die('用法：python3 tests/lib/mutate.py 计划.json')
    plan = json.load(open(sys.argv[1], encoding='utf-8'))
    before = fingerprint(SRC)
    root = os.path.realpath(tempfile.mkdtemp(prefix='nbq-mut-'))
    if inside(root, SRC) or inside(SRC, root): die(f'临时目录 {root} 和 outputs 互相包含')
    env = dict(os.environ)
    # 测试依赖：Playwright 在全局 npm 目录、pg 在测试缓存目录；两个都放进 NODE_PATH（只覆盖一个会让另一类测试起不来）
    gl = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
    env['NODE_PATH'] = os.pathsep.join(x for x in [gl, os.path.expanduser('~/.cache/nbq-tests/pg/node_modules'), env.get('NODE_PATH', '')] if x)
    results = []
    def run(cmds, dst, timeout):   # → (退出码, FAIL 行, 是否有测试自己报出的 FAIL)
        rc, fails, real = 0, [], False
        for c in cmds:
            c = [x.replace('{DIR}', dst).replace('{SRC}', SRC) for x in c]
            r = subprocess.run(c, env=dict(env, NBQ_DIR=dst), capture_output=True, text=True, timeout=timeout)
            out = (r.stdout + r.stderr).splitlines(); f2 = [l[:100] for l in out if 'FAIL' in l[:12]]
            rc |= r.returncode; real |= bool(f2)
            fails += f2 or ([f'退出码 {r.returncode}：' + ' | '.join(x[:80] for x in out[-2:])] if r.returncode else [])
        return rc, fails, real
    # 0. 先在没改过的副本上跑一遍：必须全过，否则「抓到」没有意义
    base = os.path.join(root, 'base')
    shutil.copytree(SRC, base, symlinks=False, ignore=lambda d, names: [n for n in names if n in SKIP_DIRS or n.endswith(SKIP_EXT)])
    for cmds in {json.dumps(m.get('cmds') or plan['cmds']) for m in plan['mutations']}:
        rc, fails, _ = run(json.loads(cmds), base, 900)
        if rc: die('没改过的副本上测试就不过（先修测试环境）：' + '；'.join(fails[:3]))
    shutil.rmtree(base)
    errors = 0
    try:
        for i, m in enumerate(plan['mutations']):
            dst = os.path.join(root, f'm{i}')
            shutil.copytree(SRC, dst, symlinks=False, ignore=lambda d, names: [n for n in names if n in SKIP_DIRS or n.endswith(SKIP_EXT)])
            if os.path.islink(dst) or not os.path.isdir(dst) or inside(dst, SRC) or os.path.samefile(dst, SRC): die(f'副本 {dst} 不是独立目录')
            target = os.path.join(dst, m['file'])
            if not inside(target, dst) or os.path.islink(target): die(f'要改的文件不在副本里：{target}')
            s = open(target, encoding='utf-8').read()
            if s.count(m['old']) != 1: die(f"第 {i} 处：原文在 {m['file']} 里出现 {s.count(m['old'])} 次（要求正好 1 次）：{m['old'][:80]}")
            open(target, 'w', encoding='utf-8').write(s.replace(m['old'], m['new']))
            rc, fails, real = run(m.get('cmds') or plan['cmds'], dst, m.get('timeout', 900))
            caught = rc != 0 and real            # 只有测试自己报出 FAIL 才算抓到；程序崩了算「出错」
            if rc != 0 and not real: errors += 1
            results.append(caught)
            print(f"{i:>2} {'抓到' if caught else '出错' if rc else '漏了'}  {m['file']}  {m.get('note', '')}  {fails[:2]}", flush=True)
            if not (inside(dst, root) and not os.path.islink(dst)): die(f'拒绝删除 {dst}')
            shutil.rmtree(dst)
    finally:
        if inside(root, tempfile.gettempdir()) and os.path.basename(root).startswith('nbq-mut-') and not os.path.islink(root):
            shutil.rmtree(root, ignore_errors=True)
    after = fingerprint(SRC)
    changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
    if changed: die('outputs 里的文件在检查期间被改动：' + ', '.join(changed[:20]))
    print(f'共 {len(results)} 处，抓到 {sum(results)} 处，漏了 {len(results) - sum(results) - errors} 处，出错 {errors} 处；outputs 未被改动', flush=True)
    sys.exit(0 if all(results) else 1)

if __name__ == '__main__':
    main()
