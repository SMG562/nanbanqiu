"""南伴球标志系统：唯一的几何来源。

python3 marketing/brand/logo.py  → 重出全部（之后 python3 marketing/brand/api.py 自检）：svg/*.svg（转曲）+ guide.html + variants.html
规范说明见同目录 README.md；规范页 guide.html 由 guide.py 生成。
所有尺寸都从这里的常量推出来，改标志只改这里。
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, 'glyphs.json'), encoding='utf-8'))

# ── 色彩 ──────────────────────────────────────────────
COL = dict(deep='#0B3B2A', mid='#0E5139', green='#176B4D', lime='#C6EA3D',
           cream='#F7EBD6', paper='#F3E6CC', white='#FFFFFF', ink='#0A0A0A')

# ── 符号几何（100 单位网格，来自 App 图标 icons/icon.svg，保持一致）──
BIG = (40.0, 40.0, 26.0)      # 大球 cx cy r
SMALL = (67.0, 66.0, 16.5)    # 小球，r2/r1 ≈ 0.635
GAP = 3.2                     # 小球外的留白环（切进大球），≈ r1/8
SEAM_ROT = (-22, 28)          # 两个球缝的转角
SEAM_W = 0.14                 # 球缝线宽 = 0.14 r（比 App 图标略粗，小尺寸不糊）
BOX = (BIG[0] - BIG[2], BIG[1] - BIG[2], SMALL[0] + SMALL[2], SMALL[1] + SMALL[2])  # 14,14,83.5,82.5
BOX_W, BOX_H = BOX[2] - BOX[0], BOX[3] - BOX[1]
X_UNIT = SMALL[2] * 2         # 模块 x = 小球直径（33u），安全区、间距都用它

_uid = [0]
def _id(p):
    _uid[0] += 1
    return f'{p}{_uid[0]}'


def seam_path(r):
    a, b, c, d = .669 * r, .743 * r, .30 * r, .34 * r
    return (f'M{-a:.2f} {-b:.2f} C{-c:.2f} {-d:.2f} {-c:.2f} {d:.2f} {-a:.2f} {b:.2f}'
            f'M{a:.2f} {-b:.2f} C{c:.2f} {-d:.2f} {c:.2f} {d:.2f} {a:.2f} {b:.2f}')


def mark(x, y, h, color, seams=True):
    """符号：左上角 (x,y)，外框高 h（px）。单色 + 镂空（球缝和留白环都透出底色），任何颜色都成立。"""
    s = h / BOX_H
    ma, mb = _id('nbqma'), _id('nbqmb')
    (bx, by, br), (sx, sy, sr) = BIG, SMALL
    sa = (f'<path d="{seam_path(br)}" transform="translate({bx} {by}) rotate({SEAM_ROT[0]})" stroke="#000" '
          f'stroke-width="{SEAM_W*br:.2f}" stroke-linecap="round" fill="none"/>') if seams else ''
    sb = (f'<path d="{seam_path(sr)}" transform="translate({sx} {sy}) rotate({SEAM_ROT[1]})" stroke="#000" '
          f'stroke-width="{SEAM_W*sr:.2f}" stroke-linecap="round" fill="none"/>') if seams else ''
    return (f'<g transform="translate({x - BOX[0]*s:.2f} {y - BOX[1]*s:.2f}) scale({s:.4f})">'
            f'<mask id="{ma}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">'
            f'<rect width="100" height="100" fill="#fff"/><circle cx="{sx}" cy="{sy}" r="{sr+GAP}" fill="#000"/>{sa}</mask>'
            f'<mask id="{mb}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">'
            f'<rect width="100" height="100" fill="#fff"/>{sb}</mask>'
            f'<circle cx="{bx}" cy="{by}" r="{br}" fill="{color}" mask="url(#{ma})"/>'
            f'<circle cx="{sx}" cy="{sy}" r="{sr}" fill="{color}" mask="url(#{mb})"/></g>')


# ── 中文字标：思源黑体 Bold，转曲 ─────────────────────
ZH = G['zh700']
INK_TOP, INK_BOT = 849, 91   # 三个字的墨迹上下沿（em 千分）
INK_H = (INK_TOP + INK_BOT) / 1000


def zh_metrics(F, track):
    """F=字号，track=字距（em）。返回墨迹左右（相对起点 x）、上下（相对基线）。"""
    adv = (1 + track) * F
    gl = ZH['glyphs']
    left = gl['南']['bounds'][0] / 1000 * F
    right = 2 * adv + gl['球']['bounds'][2] / 1000 * F
    return dict(adv=adv, left=left, right=right, w=right - left,
                top=-INK_TOP / 1000 * F, bot=INK_BOT / 1000 * F, h=INK_H * F)


def wordmark(x, base, F, track, color):
    """以墨迹左沿为 x 起点（不是字身框），基线 base。"""
    m = zh_metrics(F, track)
    x0 = x - m['left']
    s = F / 1000
    out = ''.join(f'<path transform="translate({x0 + i*m["adv"]:.2f} {base:.2f}) scale({s:.4f} {-s:.4f})" d="{ZH["glyphs"][c]["d"]}"/>'
                  for i, c in enumerate('南伴球'))
    return f'<g fill="{color}">{out}</g>'


# ── 拉丁副标：Inter SemiBold，转曲；按目标墨迹宽度自动算字距 ──
EN = G['en600']


def latin(text, x, cap_top, cap_h, color, width=None, track=0.3):
    s = cap_h / 1490
    gl = EN['glyphs']
    advs = [gl[c]['adv'] * s for c in text]
    lsb, rsb = gl[text[0]]['bounds'][0] * s, (gl[text[-1]]['adv'] - gl[text[-1]]['bounds'][2]) * s
    ink = sum(advs) - lsb - rsb
    tr = (width - ink) / (len(text) - 1) if width else track * cap_h / .7275
    cx, base, out = x - lsb, cap_top + cap_h, ''
    for c, a in zip(text, advs):
        out += f'<path transform="translate({cx:.2f} {base:.2f}) scale({s:.5f} {-s:.5f})" d="{gl[c]["d"]}"/>'
        cx += a + tr
    return f'<g fill="{color}">{out}</g>', ink + tr * (len(text) - 1)


# ── 四种组合（全部以 F=100 计算，返回 (svg内容, 宽, 高)，原点在外框左上）──
# 字距：横式 0.16em（标准）；竖式 0.24em；签名式 0.32em（宽距，海报落款）
TRACK = dict(h=.16, v=.24, sig=.32)


def lockup_h(ink, ball, F=100, sub=False):
    """横式：符号在左，高 = 字墨迹高 × 1.25（圆形视觉上比方块字小，要放大才等重），与字墨迹垂直居中；间距 = 0.75x。"""
    m = zh_metrics(F, TRACK['h'])
    mh = m['h'] * 1.25
    x = .75 * X_UNIT * mh / BOX_H
    mw = BOX_W * mh / BOX_H
    if not sub:
        top = 0
        base = (mh - m['h']) / 2 - m['top']
        body = mark(0, top, mh, ball) + wordmark(mw + x, base, F, TRACK['h'], ink)
        return body, mw + x + m['w'], mh
    # 双行：字 + 英文，整块与符号垂直居中；符号高 = 两行总高
    cap = m['h'] * .2
    gapl = m['h'] * .3
    blk = m['h'] + gapl + cap
    mh2 = blk * 1.0
    x2 = .75 * X_UNIT * mh2 / BOX_H
    mw2 = BOX_W * mh2 / BOX_H
    tx = mw2 + x2
    en, _ = latin('NANBANQIU', tx, m['h'] + gapl, cap, ink, width=m['w'])
    body = mark(0, 0, mh2, ball) + wordmark(tx, -m['top'], F, TRACK['h'], ink) + en
    return body, tx + m['w'], mh2


def lockup_v(ink, ball, F=100, sub=True):
    """竖式：符号居中在上，高 = 字墨迹高 × 1.9；符号与字间距 = 0.55 字高；英文与字同宽。"""
    m = zh_metrics(F, TRACK['v'])
    mh = m['h'] * 1.9
    mw = BOX_W * mh / BOX_H
    W = m['w']
    gap = m['h'] * .55
    body = mark((W - mw) / 2, 0, mh, ball) + wordmark(0, mh + gap - m['top'], F, TRACK['v'], ink)
    H = mh + gap + m['h']
    if sub:
        cap = m['h'] * .22
        g2 = m['h'] * .34
        en, _ = latin('NANBANQIU', 0, H + g2, cap, ink, width=W)
        body += en
        H += g2 + cap
    return body, W, H


def lockup_sig(ink, ball, F=100):
    """签名式（海报落款，用户给的样子）：宽字距字标，小双球抛在「伴」「球」之间的上方，像发球前的抛球。
    符号高 = 字墨迹高 × 0.55；符号底 与 字顶 间距 = 0.12 字高；符号中心对准「伴」「球」的字缝。"""
    m = zh_metrics(F, TRACK['sig'])
    mh = m['h'] * .55
    mw = BOX_W * mh / BOX_H
    gl = ZH['glyphs']
    seam_x = (m['adv'] + gl['伴']['bounds'][2] / 1000 * F + 2 * m['adv'] + gl['球']['bounds'][0] / 1000 * F) / 2 - m['left']
    gap = m['h'] * .12
    body = mark(seam_x - mw / 2, 0, mh, ball) + wordmark(0, mh + gap - m['top'], F, TRACK['sig'], ink)
    return body, m['w'], mh + gap + m['h']


def wordmark_only(ink, F=100, track=TRACK['h']):
    m = zh_metrics(F, track)
    return wordmark(0, -m['top'], F, track, ink), m['w'], m['h']


def mark_only(color, h=100, seams=True):
    return mark(0, 0, h, color, seams), BOX_W * h / BOX_H, h


# ── 配色版本 ──────────────────────────────────────────
VERSIONS = {
    'dark':  dict(bg=COL['deep'],  ink=COL['white'], ball=COL['lime'], name='深底全彩（主版）'),
    'light': dict(bg=COL['cream'], ink=COL['deep'],  ball=COL['deep'], name='浅底单色'),
    'lime':  dict(bg=COL['lime'],  ink=COL['deep'],  ball=COL['deep'], name='黄绿底单色'),
    'black': dict(bg=COL['white'], ink=COL['ink'],   ball=COL['ink'],  name='黑色单色（印刷 / 盖章）'),
    'white': dict(bg=COL['ink'],   ink=COL['white'], ball=COL['white'], name='反白单色'),
}


def svg_doc(body, w, h, pad=0, bg=None):
    W, H = w + 2 * pad, h + 2 * pad
    bgr = f'<rect x="{-pad:.2f}" y="{-pad:.2f}" width="{W:.2f}" height="{H:.2f}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad:.2f} {-pad:.2f} {W:.2f} {H:.2f}" '
            f'width="{W:.0f}" height="{H:.0f}">{bgr}{body}</svg>')


def build():
    out = os.path.join(HERE, 'svg')
    os.makedirs(out, exist_ok=True)
    n = 0
    for v, c in VERSIONS.items():
        items = {
            'horizontal': lockup_h(c['ink'], c['ball']),
            'horizontal-en': lockup_h(c['ink'], c['ball'], sub=True),
            'stacked': lockup_v(c['ink'], c['ball']),
            'signature': lockup_sig(c['ink'], c['ball']),
            'wordmark': wordmark_only(c['ink']),
            'mark': mark_only(c['ball']),
        }
        for k, (b, w, h) in items.items():
            open(os.path.join(out, f'nanbanqiu-{k}-{v}.svg'), 'w').write(svg_doc(b, w, h))
            n += 1
    b, w, h = mark_only(COL['lime'], seams=False)
    open(os.path.join(out, 'nanbanqiu-mark-simple-dark.svg'), 'w').write(svg_doc(b, w, h))
    print(f'{n + 1} 个 SVG → {out}')


if __name__ == '__main__':
    # 一条命令重出全部：主标志 SVG + 衍生 SVG + 两个规范页
    build()
    import variants, guide
    variants.build()
    open(os.path.join(HERE, 'guide.html'), 'w', encoding='utf-8').write(guide.page())
    print('guide.html 已更新')
