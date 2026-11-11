#!/usr/bin/env python3
# 南伴球 · 建备份的唯一入口（10-23 误删备份之后定的流程）。
#   python3 tests/lib/backup.py R4之后          → 新建 备份/R4之后/，逐个复制交付文件，复制后逐个比对 sha256
#   python3 tests/lib/backup.py --check         → 检查 备份/ 下每一份都还在、文件齐全（每轮开始前、结束时各跑一次）
# 规则：只新建，不覆盖、不删除；同名备份已存在就停下。备份清单写在 备份/索引.json（名称、时间、每个文件的 sha256）。
import hashlib, json, os, shutil, sys, datetime

ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
BK = os.path.join(ROOT, '备份')
FILES = ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'schema.sql', 'sw.js', 'manifest.webmanifest', 'privacy.html', 'terms.html',
         '进度记录.md', '进度记录_历史.md', '隐私清单.md', '出事处理手册.md', '地区扩展设计.md']
DIRS = ['server']

def sha(p):
    with open(p, 'rb') as f: return hashlib.sha256(f.read()).hexdigest()

def listing(base):
    out = [f for f in FILES if os.path.isfile(os.path.join(base, f))]
    for d in DIRS:
        for dp, _, fs in os.walk(os.path.join(base, d)):
            out += [os.path.relpath(os.path.join(dp, f), base) for f in fs if not os.path.islink(os.path.join(dp, f))]
    return sorted(out)

def load_index():
    p = os.path.join(BK, '索引.json')
    return json.load(open(p, encoding='utf-8')) if os.path.isfile(p) else {}

def check():
    idx, bad = load_index(), []
    for name, rec in idx.items():
        for f, h in rec['files'].items():
            p = os.path.join(BK, name, f)
            if not os.path.isfile(p): bad.append(f'{name}/{f} 缺失')
            elif sha(p) != h: bad.append(f'{name}/{f} 内容变了')
    print(f"备份 {len(idx)} 份：" + ('全部完好' if not bad else '有问题 → ' + '；'.join(bad[:20])))
    return not bad

def make(name):
    if not name or '/' in name or name.startswith('.'): sys.exit('备份名不合法')
    dst = os.path.join(BK, name)
    if os.path.exists(dst): sys.exit(f'停止：备份 {name} 已存在（不覆盖）')
    os.makedirs(dst)
    files = listing(ROOT); rec = {}
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(dst, f)), exist_ok=True)
        shutil.copyfile(os.path.join(ROOT, f), os.path.join(dst, f))
        h1, h2 = sha(os.path.join(ROOT, f)), sha(os.path.join(dst, f))
        if h1 != h2: sys.exit(f'停止：{f} 复制后不一致')
        rec[f] = h1
    idx = load_index(); idx[name] = {'at': datetime.datetime.now().isoformat(timespec='seconds'), 'files': rec}
    json.dump(idx, open(os.path.join(BK, '索引.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'已建备份 {name}：{len(rec)} 个文件，逐个比对一致')

if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['--check']: sys.exit(0 if check() else 1)
    if len(a) == 1: make(a[0]); check()
    else: sys.exit(__doc__ or '用法：backup.py 名称 | --check')
