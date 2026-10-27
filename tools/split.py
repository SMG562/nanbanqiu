#!/usr/bin/env python3
"""一次性迁移脚本（R0，2026-10-27）：把 南伴球_PWA.html / 南伴球_Web.html 拆成 src/ 下的小源文件。

已经拆过了，以后改代码直接改 src/，再 `node tools/build.mjs`。
后台（南伴球_后台.html）用同一个办法拆过，见 tools/split_admin.py（E3）。

做法：
1. 两个文件逐行比对（difflib，保持顺序），连续相同 ≥ MIN_SHARED 行的段 → src/shared/（只放一份）；
   其余的 → src/pwa/ 或 src/web/。
2. 每一段再在「分节标题」（/* ===== 标题 =====、// ===== 标题 =====；样式里每个顶格注释）和页面区域边界处切开：
   page（head、markup、结尾，.html）· style（.css）· script（主脚本，.js）· side（PWA 第二个脚本 = 场边，.js）。
3. 文件名 = 序号 + 所在分节的标题；src/pwa.list、src/web.list 记拼接顺序。
4. 最后用 build 的同一个办法拼回，断言和原文件逐字节一致；不一致就不写任何文件。

用法：python3 tools/split.py <仓库目录> <输出 src 目录（必须不存在）>
"""
import difflib, os, re, sys

MIN_SHARED = 8
FILES = {'pwa': '南伴球_PWA.html', 'web': '南伴球_Web.html'}
EXT = {'page': 'html', 'style': 'css', 'script': 'js', 'side': 'js'}
HDR = re.compile(r'^\s*(/\*|//)\s?={3,}')
HDR_CSS = re.compile(r'^/\* ')  # 样式里每个顶格注释都算分节


def is_hdr(line, region):
    return bool(HDR.match(line) or region == 'style' and HDR_CSS.match(line))


def regions(lines):
    """每一行属于哪个区域。"""
    out, state, nscript = [], 'head', 0
    for ln in lines:
        s = ln.strip()
        if state == 'head':
            out.append('head')
            if s == '<style>': state = 'style'
        elif state == 'style':
            if s == '</style>':
                state = 'body'; out.append('body')
            else: out.append('style')
        elif state == 'body':
            out.append('body')
            if s == '<script>':
                nscript += 1; state = 'script' if nscript == 1 else 'side'
        elif state in ('script', 'side'):
            if s == '</script>':
                state = 'tail'; out.append('tail')
            else: out.append(state)
        elif state == 'tail':
            out.append('tail')
            if s == '<script>':
                nscript += 1; state = 'script' if nscript == 1 else 'side'
    return out


def dir_of(region):
    return {'head': 'page', 'body': 'page', 'tail': 'page'}.get(region, region)


def title_of(lines, i):
    """第 i 行是分节标题 → 返回标题文字（标题在下一行的也取）。"""
    t = re.sub(r'[=*/]+', ' ', lines[i]).strip()
    if not t and i + 1 < len(lines):
        t = re.sub(r'[=*/]+', ' ', lines[i + 1]).strip()
    return t


def slug(t):
    t = re.split(r'[（(：:，,。；;——]', t)[0]
    t = re.sub(r'[\s/·&|<>"\'`?*\\]+', '_', t).strip('_')
    return (t or '其他')[:24]


def cut_points(lines, reg, lo, hi):
    """[lo, hi) 里应该切开的位置（区域变化、分节标题）。"""
    pts = []
    for i in range(lo + 1, hi):
        if reg[i] != reg[i - 1]:
            pts.append(i)
        elif reg[i] in ('style', 'script', 'side') and is_hdr(lines[i], reg[i]):
            pts.append(i)
    return pts


def main(repo, out):
    assert not os.path.exists(out), out + ' 已存在'
    L, R, T = {}, {}, {}
    for k, f in FILES.items():
        L[k] = open(os.path.join(repo, f), encoding='utf-8', newline='').read().splitlines(keepends=True)
        R[k] = regions(L[k])
        cur, ts = '开头', []
        for i in range(len(L[k])):
            if i and R[k][i] != R[k][i - 1]: cur = {'tail': '结尾', 'body': '页面'}.get(R[k][i], '开头')
            if is_hdr(L[k][i], R[k][i]): cur = title_of(L[k], i)
            ts.append(cur)
        T[k] = ts
    a, b = L['pwa'], L['web']
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    blocks = [m for m in sm.get_matching_blocks() if m.size >= MIN_SHARED]

    # 段：('shared', pa, pb, n) / ('pwa', lo, hi) / ('web', lo, hi)，按顺序
    segs, pa, pb = [], 0, 0
    for m in blocks + [difflib.Match(len(a), len(b), 0)]:
        if m.a > pa: segs.append(('pwa', pa, m.a))
        if m.b > pb: segs.append(('web', pb, m.b))
        if m.size:
            # 共用段里两边的区域划分必须一致
            assert [dir_of(x) for x in R['pwa'][m.a:m.a + m.size]] == [dir_of(x) for x in R['web'][m.b:m.b + m.size]], m
            segs.append(('shared', m.a, m.b, m.size))
        pa, pb = m.a + m.size, m.b + m.size

    frags = []  # (owner, region, title, text, [targets])
    for s in segs:
        if s[0] == 'shared':
            _, x, y, n = s; k, lo, hi = 'pwa', x, x + n; targets = ['pwa', 'web']
        else:
            k, lo, hi = s; targets = [k]
        pts = [lo] + cut_points(L[k], R[k], lo, hi) + [hi]
        for p, q in zip(pts, pts[1:]):
            frags.append((s[0], R[k][p], T[k][p], ''.join(L[k][p:q]), targets))

    # 命名：每个目录里按出现顺序编号（步长 10，方便以后插新文件）
    seq, lists, written = {}, {'pwa': [], 'web': []}, {}
    for owner, reg, title, text, targets in frags:
        d = f'{owner}/{dir_of(reg)}'
        seq[d] = seq.get(d, 0) + 10
        rel = f'{d}/{seq[d]:04d}-{slug(title)}.{EXT[dir_of(reg)]}'
        written[rel] = text
        for t in targets: lists[t].append(rel)

    # 拼回核对
    for k, f in FILES.items():
        got = ''.join(written[r] for r in lists[k])
        assert got == ''.join(L[k]), f + ' 拼回不一致'

    for rel, text in written.items():
        p = os.path.join(out, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'x', encoding='utf-8', newline='') as fh: fh.write(text)
    for k in FILES:
        with open(os.path.join(out, f'{k}.list'), 'x', encoding='utf-8') as fh:
            fh.write(f'# {FILES[k]} 的拼接顺序（tools/build.mjs 按这里从上到下拼）\n' + '\n'.join(lists[k]) + '\n')

    sh = sum(s[3] for s in segs if s[0] == 'shared')
    by = {}
    for rel in written:
        o = rel.split('/')[0]; by[o] = by.get(o, 0) + 1
    print(f'共用 {sh} 行；PWA {len(a)} 行 / 网页端 {len(b)} 行；文件数 {by}；共 {len(written)} 个')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
