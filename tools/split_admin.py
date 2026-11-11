#!/usr/bin/env python3
"""一次性迁移脚本（E3，2026-10-28）：把 南伴球_后台.html 拆成 src/admin/ 下的小源文件，照 R0 的办法（tools/split.py）。

已经拆过了，以后改后台直接改 src/admin/，再 `node tools/build.mjs`。
和 split.py 的区别：只有一个文件，不用和另一端比对；后台 HTML 里 </style></head><body> 和 </script></body></html> 各在一行里。

用法：python3 tools/split_admin.py <仓库目录> <输出 src 目录（必须不存在）>
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import split as S

FILE = '南伴球_后台.html'
_slug = S.slug
S.slug = lambda t: _slug(t.replace('-', ' ').replace('—', ' ').replace('–', ' ').strip())  # 后台样式分节标题带一串横线


def regions(lines):
    out, state = [], 'head'
    for ln in lines:
        s = ln.strip()
        if state == 'head':
            out.append('head')
            if s == '<style>': state = 'style'
        elif state == 'style':
            if s.startswith('</style>'): state = 'body'; out.append('body')
            else: out.append('style')
        elif state == 'body':
            out.append('body')
            if s == '<script>': state = 'script'
        elif state == 'script':
            if s.startswith('</script>'): state = 'tail'; out.append('tail')
            else: out.append('script')
        else:
            out.append('tail')
    return out


def main(repo, out):
    assert not os.path.exists(out), out + ' 已存在'
    L = open(os.path.join(repo, FILE), encoding='utf-8', newline='').read().splitlines(keepends=True)
    R = regions(L)
    T, cur = [], '开头'
    for i in range(len(L)):
        if i and R[i] != R[i - 1]: cur = {'tail': '结尾', 'body': '页面'}.get(R[i], '开头')
        if S.is_hdr(L[i], R[i]): cur = S.title_of(L, i)
        T.append(cur)
    pts = [0] + S.cut_points(L, R, 0, len(L)) + [len(L)]
    seq, names, written = {}, [], {}
    for p, q in zip(pts, pts[1:]):
        d = f'admin/{S.dir_of(R[p])}'
        seq[d] = seq.get(d, 0) + 10
        rel = f'{d}/{seq[d]:04d}-{S.slug(T[p])}.{S.EXT[S.dir_of(R[p])]}'
        written[rel] = ''.join(L[p:q]); names.append(rel)
    assert ''.join(written[r] for r in names) == ''.join(L), '拼回不一致'
    for rel, text in written.items():
        path = os.path.join(out, rel); os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'x', encoding='utf-8', newline='') as fh: fh.write(text)
    with open(os.path.join(out, 'admin.list'), 'x', encoding='utf-8') as fh:
        fh.write(f'# {FILE} 的拼接顺序（tools/build.mjs 按这里从上到下拼）\n' + '\n'.join(names) + '\n')
    print(f'{len(L)} 行 → {len(written)} 个文件')
    for r in names: print(f'  {r}  {len(written[r].splitlines())} 行')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
