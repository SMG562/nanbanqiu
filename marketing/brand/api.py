"""品牌标志的唯一调用入口：render(kind, on) → (svg片段, 宽, 高)。

海报里不用 import 这个文件，直接用 marketing/lib.py 的 logo(kind, on, x, y, w, anchor)。
kind 的选用见 README.md「选哪个标志」表；on = 放在什么底上（决定配色）。
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logo as L       # noqa: E402
import variants as V   # noqa: E402

C = L.COL
# on → (字色, 球色)。规则：黄绿球只上深底；浅 / 黄绿底整个标志深绿单色。
ON = {k: (v['ink'], v['ball']) for k, v in L.VERSIONS.items()}
ON['photo-dark'] = ON['dark']           # 暗部照片
ON['photo-light'] = ON['light']         # 亮部照片
BG = {'dark': C['deep'], 'light': C['cream'], 'lime': C['lime'], 'black': C['white'], 'white': C['ink']}

# kind → 函数(ink, ball, bg)。主标志 = main-*；衍生 = 其余。
KINDS = {
    # ── 主标志（带球缝，正式）──
    'main-h':      lambda i, b, g: L.lockup_h(i, b),
    'main-h-en':   lambda i, b, g: L.lockup_h(i, b, sub=True),
    'main-v':      lambda i, b, g: L.lockup_v(i, b),
    'main-v-noen': lambda i, b, g: L.lockup_v(i, b, sub=False),
    'main-sig':    lambda i, b, g: L.lockup_sig(i, b),
    'wordmark':    lambda i, b, g: L.wordmark_only(i),
    'mark':        lambda i, b, g: L.mark_only(b),
    'mark-simple': lambda i, b, g: L.mark_only(b, seams=False),
    # ── 衍生（周边、日常海报）──
    'dots':        lambda i, b, g: V.dots_only(b),
    'sig-dots':    lambda i, b, g: V.sig_dots(i, b),
    'h-dots':      lambda i, b, g: V.h_dots(i, b),
    'rally':       lambda i, b, g: V.rally(b, line=i),
    'bounce':      lambda i, b, g: V.bounce(b),
    'outline':     lambda i, b, g: V.outline_mark(b),
    'vertical':    lambda i, b, g: V.vertical(i, b),
}
# 印章、徽章自带底色：深底给深绿章 + 黄绿点，其他底给黄绿章 / 奶油徽章 + 深绿
KINDS['seal'] = lambda i, b, g: (V.seal(C['deep'], C['cream'], C['lime']) if b == C['lime'] else V.seal(C['lime'], C['deep'], C['deep']))
KINDS['badge'] = lambda i, b, g: (V.badge(C['deep'], C['cream'], C['lime']) if b == C['lime'] else V.badge(C['cream'], C['deep'], C['deep']))


def render(kind='sig-dots', on='dark'):
    if kind not in KINDS:
        raise KeyError(f'未知标志 {kind}；可选：{", ".join(KINDS)}')
    ink, ball = ON[on]
    return KINDS[kind](ink, ball, BG.get(on))


def place(kind='sig-dots', on='dark', x=540, y=1290, w=240, anchor='bottom'):
    """缩放到宽 w，按 anchor 放到 (x,y)：bottom=底边中点，center=中心，top=顶边中点，topleft=左上角。"""
    b, bw, bh = render(kind, on)
    s = w / bw
    h = bh * s
    ox = x if anchor == 'topleft' else x - w / 2
    oy = {'bottom': y - h, 'center': y - h / 2, 'top': y, 'topleft': y}[anchor]
    return f'<g transform="translate({ox:.2f} {oy:.2f}) scale({s:.4f})">{b}</g>'


if __name__ == '__main__':
    # 自检：每个 kind × 每种底色都能出图（改完 logo.py / variants.py 跑一次）
    n = 0
    for k in KINDS:
        for o in ON:
            b, w, h = render(k, o)
            assert b.startswith('<') and w > 0 and h > 0, (k, o)
            n += 1
    print(f'自检通过：{len(KINDS)} 种 × {len(ON)} 种底色 = {n}')
