#!/usr/bin/env python3
"""南伴球宣传物料：渲染 + 检查 + 出图 + 登记。用法见 .claude/skills/nanbanqiu-poster/SKILL.md。

  python3 marketing/build.py --list                  列出所有海报（编号 标题 风格 创意），新设计前先看这个，避免重复
  python3 marketing/build.py --only 17,18            只画这几张（默认全部）；出 img/ 和 thumb/ 的 webp，登记到 posters.json
  python3 marketing/build.py --only 17 --sheet /tmp/s.jpg   额外拼一张小图总览（一次 Read 看完，省 token）
  python3 marketing/build.py --hires ~/out           额外存 1620×2025 的 PNG（给你电脑文件夹用，不进仓库）
  python3 marketing/build.py --check                 只核对：posters.json、源文件、图片三者一致（不画图，测试用）

画完会自动检查文字：出画布 / 文字互相压住 / 离边太近，只警告不中断。
依赖：playwright（chromium）、Pillow、字体 Noto CJK。
"""
import argparse, glob, importlib.util, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

IMG, THUMB, MANIFEST = (os.path.join(HERE, d) for d in ('img', 'thumb', 'posters.json'))
FIELDS = ('id', 'slug', 'title', 'lines', 'style', 'tone', 'demo', 'concept', 'use')


def load_posters():
    out = {}
    for f in sorted(glob.glob(os.path.join(HERE, 'posters', 'p[0-9][0-9]*_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        meta = m.META
        missing = [k for k in FIELDS if k not in meta]
        if missing: sys.exit(f'{os.path.basename(f)}：META 缺 {missing}')
        if meta['id'] in out: sys.exit(f'编号重复：{meta["id"]}')
        if os.path.basename(f).split('_')[0][1:] != f'{meta["id"]:02d}' or meta['slug'].replace('-', '_') not in f:
            sys.exit(f'{os.path.basename(f)}：文件名要写成 p{meta["id"]:02d}_{meta["slug"].replace("-", "_")}.py')
        out[meta['id']] = (meta, m)
    return out


def names(meta):
    n = f'{meta["id"]:02d}-{meta["slug"]}'
    return os.path.join(IMG, n + '.webp'), os.path.join(THUMB, n + '.webp')


TEXT_CHECK = '''() => {
  const W = 1080, H = 1350, M = 24, out = [];
  const t = [...document.querySelectorAll('svg text')].map(e => { const r = e.getBoundingClientRect(); return { s: (e.textContent || '').trim(), x: r.left, y: r.top, r: r.right, b: r.bottom } }).filter(o => o.s);
  for (const o of t) { if (o.x < M - 1 || o.r > W - M + 1 || o.y < M - 1 || o.b > H - M + 1) out.push(`出边/太靠边：「${o.s.slice(0, 14)}」 x ${Math.round(o.x)}–${Math.round(o.r)}, y ${Math.round(o.y)}–${Math.round(o.b)}`) }
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i], b = t[j], w = Math.min(a.r, b.r) - Math.max(a.x, b.x), h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    if (w > 6 && h > 6 && (w * h) / Math.min((a.r - a.x) * (a.b - a.y), (b.r - b.x) * (b.b - b.y)) > .45) out.push(`文字压住：「${a.s.slice(0, 10)}」和「${b.s.slice(0, 10)}」`) }
  return out }'''


def render(selected, hires, review_png):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    warns = {}
    os.makedirs(IMG, exist_ok=True); os.makedirs(THUMB, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': lib.W, 'height': lib.H}, device_scale_factor=1)
        pg_hi = b.new_page(viewport={'width': lib.W, 'height': lib.H}, device_scale_factor=1.5) if hires else None
        for pid, (meta, mod) in selected.items():
            html = os.path.join(tmp, f'{pid}.html'); open(html, 'w').write(mod.svg())
            pg.goto('file://' + html); pg.wait_for_timeout(300)
            png = os.path.join(tmp, f'{pid}.png'); pg.screenshot(path=png)
            warns[pid] = pg.evaluate(TEXT_CHECK)
            im = Image.open(png).convert('RGB'); full, th = names(meta)
            im.save(full, 'WEBP', quality=82, method=6)
            im.resize((360, 450), Image.LANCZOS).save(th, 'WEBP', quality=78, method=6)
            if hires:
                pg_hi.goto('file://' + html); pg_hi.wait_for_timeout(300)
                os.makedirs(hires, exist_ok=True)
                pg_hi.screenshot(path=os.path.join(hires, f'{pid:02d}-{meta["slug"]}.png'))
            print(f'  {pid:02d} {meta["title"]}  {os.path.getsize(full) // 1024}KB + {os.path.getsize(th) // 1024}KB')
        b.close()
    return warns


def sheet(selected, path, cols=4):
    from PIL import Image
    ims = [Image.open(names(m)[1]) for m, _ in selected.values()]
    rows = -(-len(ims) // cols); tw, th = 270, 338
    s = Image.new('RGB', (cols * tw, rows * th), '#222')
    for i, im in enumerate(ims): s.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
    s.save(path, quality=72); print(f'总览图：{path}（{s.size[0]}×{s.size[1]}）')


def write_manifest(allp):
    data = [{k: allp[i][0][k] for k in FIELDS} for i in sorted(allp)]
    open(MANIFEST, 'w').write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')


def check(allp):
    errs = []
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else []
    if [m['id'] for m in man] != sorted(allp): errs.append('posters.json 里的编号和 posters/ 源文件对不上（跑一次 build.py 登记）')
    for m in man:
        if m['id'] in allp and {k: allp[m['id']][0][k] for k in FIELDS} != m: errs.append(f'{m["id"]:02d}：posters.json 和源文件的 META 不一致（重跑 build.py）')
    for pid, (meta, _) in allp.items():
        for f in names(meta):
            if not os.path.exists(f): errs.append(f'缺图：{os.path.relpath(f, HERE)}（重跑 build.py --only {pid}）')
    return errs


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only'); ap.add_argument('--list', action='store_true'); ap.add_argument('--check', action='store_true')
    ap.add_argument('--sheet'); ap.add_argument('--hires')
    a = ap.parse_args()
    allp = load_posters()
    if a.list:
        for i, (m, _) in sorted(allp.items()): print(f'{i:02d} {m["title"]}｜{"/".join(m["style"])}·{m["tone"]}｜{m["concept"]}')
        sys.exit(0)
    if a.check:
        errs = check(allp)
        print('\n'.join(errs) if errs else f'物料一致：{len(allp)} 张'); sys.exit(1 if errs else 0)
    ids = [int(x) for x in a.only.split(',')] if a.only else sorted(allp)
    bad = [i for i in ids if i not in allp]
    if bad: sys.exit(f'没有这些编号：{bad}')
    sel = {i: allp[i] for i in ids}
    warns = render(sel, a.hires, None)
    write_manifest(allp)
    for pid, w in warns.items():
        for x in w: print(f'  ⚠ {pid:02d} {x}')
    if a.sheet: sheet(sel, a.sheet)
    print(f'完成：{len(sel)} 张，posters.json 共 {len(allp)} 张')
