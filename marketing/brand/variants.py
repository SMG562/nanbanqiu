"""南伴球衍生标志（周边用）：python3 marketing/brand/variants.py
→ marketing/brand/svg/variant-*.svg 和 marketing/brand/variants.html
几何全部沿用 logo.py：同样的两个半径（26 / 16.5）、同样的 44° 对角方向。"""
import math, os
import logo as L

C = L.COL
R1, R2 = L.BIG[2], L.SMALL[2]
ANG = math.atan2(L.SMALL[1] - L.BIG[1], L.SMALL[0] - L.BIG[0])  # 44°
DOT_GAP = 2 * L.GAP           # 点式：两球之间空 6.4u（= 两倍留白环，≈ r1/4）


def dots_geom(gap=DOT_GAP):
    d = R1 + gap + R2
    sx, sy = R1 + d * math.cos(ANG), R1 + d * math.sin(ANG)
    return (R1, R1, R1), (sx, sy, R2), max(2 * R1, sx + R2), max(2 * R1, sy + R2)


def dots(x, y, h, color, gap=DOT_GAP, color2=None):
    """点式：两颗纯色球，分开。左上角 (x,y)，外框高 h。"""
    (bx, by, br), (sx, sy, sr), W, H = dots_geom(gap)
    s = h / H
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">'
            f'<circle cx="{bx}" cy="{by}" r="{br}" fill="{color}"/>'
            f'<circle cx="{sx:.2f}" cy="{sy:.2f}" r="{sr}" fill="{color2 or color}"/></g>'), W * s, h


def dots_only(color, gap=DOT_GAP, h=100):
    b, w, h = dots(0, 0, h, color, gap)
    return b, w, h


def sig_dots(ink, ball, F=100):
    """点式签名（用户 11-10 指定的样子）：宽字距字标 + 分开的两颗纯色球，落在「伴」「球」字缝上方。"""
    m = L.zh_metrics(F, L.TRACK['sig'])
    gl = L.ZH['glyphs']
    seam = (m['adv'] + gl['伴']['bounds'][2] / 1000 * F + 2 * m['adv'] + gl['球']['bounds'][0] / 1000 * F) / 2 - m['left']
    mh = m['h'] * .5
    b, mw, _ = dots(0, 0, mh, ball)
    gap = m['h'] * .1
    body = f'<g transform="translate({seam - mw/2:.2f} 0)">{b}</g>' + L.wordmark(0, mh + gap - m['top'], F, L.TRACK['sig'], ink)
    return body, m['w'], mh + gap + m['h']


def sig_dots_center(ink, ball, F=100, optical=.5):
    """点式签名·居中版（11-10 用户要的第二版）：两点在整个「南伴球」字标正中上方（= 中间「伴」字上方）。
    对齐：optical=0 按两点外框中心；=1 按两球面积重心（大球偏左，重心在外框中心左边）。
    默认取一半：纯外框居中看起来点组偏左，纯重心居中又偏右。其余尺寸同点式签名。"""
    m = L.zh_metrics(F, L.TRACK['sig'])
    mh = m['h'] * .5
    b, mw, _ = dots(0, 0, mh, ball)
    (bx, _, br), (sx, _, sr), W, H = dots_geom()
    k = mh / H
    cent = (br * br * bx + sr * sr * sx) / (br * br + sr * sr) * k   # 重心 x（相对点组左边）
    ax = mw / 2 + (cent - mw / 2) * optical                             # 对准字标中线的那个 x
    gap = m['h'] * .1
    body = f'<g transform="translate({m["w"]/2 - ax:.2f} 0)">{b}</g>' + L.wordmark(0, mh + gap - m['top'], F, L.TRACK['sig'], ink)
    return body, m['w'], mh + gap + m['h']


def h_dots(ink, ball, F=100):
    """点式横式：两点在左，与字等高居中。"""
    m = L.zh_metrics(F, L.TRACK['h'])
    mh = m['h'] * 1.1
    b, mw, _ = dots(0, 0, mh, ball)
    gap = .55 * mh
    return b + L.wordmark(mw + gap, (mh - m['h']) / 2 - m['top'], F, L.TRACK['h'], ink), mw + gap + m['w'], mh


def rally(color, h=100, line=None):
    """一来一回：大球在左、小球在右，中间一条虚线弧（球的飞行轨迹）+ 落地点。"""
    W = 300
    bx, by = R1, h - R1
    sx, sy = W - R2, h - R2 - 30
    peak = 6
    path = f'M{bx + R1 + 8:.1f} {by - 6:.1f} Q{W*.42:.1f} {peak - 40:.1f} {W*.62:.1f} {h - 3:.1f} Q{W*.74:.1f} {h*.25:.1f} {sx - R2 - 8:.1f} {sy - 4:.1f}'
    body = (f'<circle cx="{bx}" cy="{by}" r="{R1}" fill="{color}"/><circle cx="{sx}" cy="{sy}" r="{R2}" fill="{color}"/>'
            f'<path d="{path}" fill="none" stroke="{line or color}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 11"/>'
            f'<line x1="{W*.62 - 9:.1f}" y1="{h}" x2="{W*.62 + 9:.1f}" y2="{h}" stroke="{line or color}" stroke-width="3.2" stroke-linecap="round"/>')
    return body, W, h


def bounce(color, h=60):
    """三点弹跳：大 → 中 → 小，越来越低，像球弹了两下停下。加载、分隔符、结尾符号用。"""
    rs = [R1, (R1 + R2) / 2, R2 * .62]
    x, out = 0, ''
    ys = [0, 18, 32]
    s = h / (2 * R1 + 32)
    for r, yy in zip(rs, ys):
        out += f'<circle cx="{(x + r)*s:.2f}" cy="{(yy + 2*R1 - r)*s + yy*0:.2f}" r="{r*s:.2f}" fill="{color}"/>'
        x += 2 * r + 12
    return out, (x - 12) * s, h


def outline_mark(color, h=100, sw=2.6):
    """线框符号：同一几何，只描边。压纹、单线刺绣、激光雕刻用。"""
    (bx, by, br), (sx, sy, sr) = L.BIG, L.SMALL
    s = h / L.BOX_H
    mid = L._id('nbqom')
    st = f'fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"'
    return (f'<g transform="translate({-L.BOX[0]*s:.2f} {-L.BOX[1]*s:.2f}) scale({s:.4f})">'
            f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/>'
            f'<circle cx="{sx}" cy="{sy}" r="{sr + L.GAP - sw/2}" fill="#000"/></mask>'
            f'<g mask="url(#{mid})"><circle cx="{bx}" cy="{by}" r="{br - sw/2}" {st}/>'
            f'<path d="{L.seam_path(br - sw/2)}" transform="translate({bx} {by}) rotate({L.SEAM_ROT[0]})" {st}/></g>'
            f'<circle cx="{sx}" cy="{sy}" r="{sr - sw/2}" {st}/>'
            f'<path d="{L.seam_path(sr - sw/2)}" transform="translate({sx} {sy}) rotate({L.SEAM_ROT[1]})" {st}/></g>'), L.BOX_W * s, h


def vertical(ink, ball, F=100):
    """竖排：南 / 伴 / 球 从上往下，点式在顶。横幅、毛巾、球包侧面。"""
    gl = L.ZH['glyphs']
    step = F * 1.22
    s = F / 1000
    out = ''
    for i, c in enumerate('南伴球'):
        out += f'<path transform="translate(0 {F*0.849 + i*step + F*.75:.2f}) scale({s} {-s})" d="{gl[c]["d"]}"/>'
    b, mw, mh = dots(0, 0, F * .5, ball)
    total = F * .75 + 2 * step + F * 0.94
    return f'<g transform="translate({F/2 - mw/2:.2f} 0)">{b}</g><g fill="{ink}">{out}</g>', F, total


def seal(bg, ink, ball, size=200):
    """印章：圆角方块里一个「伴」字，右上角两点。贴纸、球拍避震器、盖章。"""
    g = L.ZH['glyphs']['伴']
    F = size * .56
    s = F / 1000
    x0 = size * .46 - (g['bounds'][0] + g['bounds'][2]) / 2 * s
    base = size * .55 + (849 - 91) / 2 * s
    b, mw, mh = dots(0, 0, size * .17, ball)
    return (f'<rect width="{size}" height="{size}" rx="{size*.18}" fill="{bg}"/>'
            f'<path transform="translate({x0:.2f} {base:.2f}) scale({s:.4f} {-s:.4f})" d="{g["d"]}" fill="{ink}"/>'
            f'<g transform="translate({size*.9 - mw:.2f} {size*.1:.2f})">{b}</g>'), size, size


def _arc_text(text, cx, cy, R, cap, top=True):
    """沿圆弧排拉丁字：top=上弧（字头朝外），否则下弧（字头朝内、从左往右读）。字距按 0.3 em。"""
    gl = L.EN['glyphs']
    s = cap / 1490
    tr = cap * .42
    advs = [gl[c]['adv'] * s if c in gl else cap * .9 for c in text]
    total = sum(advs) + tr * (len(text) - 1)
    span = total / R
    a = -span / 2
    out = ''
    for c, w in zip(text, advs):
        mid = a + (w / 2) / R
        th = math.degrees(mid if top else -mid)
        if c in gl:
            if top:
                out += (f'<g transform="rotate({th:.2f} {cx} {cy})"><path transform="translate({cx - w/2:.2f} {cy - R:.2f}) scale({s:.5f} {-s:.5f})" d="{gl[c]["d"]}"/></g>')
            else:
                out += (f'<g transform="rotate({th:.2f} {cx} {cy})"><path transform="translate({cx - w/2:.2f} {cy + R + cap:.2f}) scale({s:.5f} {-s:.5f})" d="{gl[c]["d"]}"/></g>')
        else:
            yy = cy - R - cap / 2 if top else cy + R + cap / 2
            out += f'<g transform="rotate({th:.2f} {cx} {cy})"><circle cx="{cx}" cy="{yy:.2f}" r="{cap*.15:.2f}"/></g>'
        a += (w + tr) / R
    return out


def badge(bg, ink, ball, size=300):
    """圆形徽章：上弧 NANBANQIU，下弧 TENNIS · MELBOURNE（都从左往右读），两侧小点隔开，中间点式。"""
    cx = cy = size / 2
    cap = size * .055
    Rt, Rb = size * .36, size * .36 - cap * 0
    txt = _arc_text('NANBANQIU', cx, cy, Rt, cap, True) + _arc_text('MELBOURNE', cx, cy, Rb - cap * 0, cap, False)
    side = ''.join(f'<circle cx="{cx + sx*size*.385:.2f}" cy="{cy:.2f}" r="{size*.012:.2f}"/>' for sx in (-1, 1))
    b, mw, mh = dots(0, 0, size * .27, ball)
    return (f'<circle cx="{cx}" cy="{cy}" r="{size/2}" fill="{bg}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{size*.465}" fill="none" stroke="{ink}" stroke-width="{size*.007:.2f}" opacity=".55"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{size*.29}" fill="none" stroke="{ink}" stroke-width="{size*.007:.2f}" opacity=".55"/>'
            f'<g fill="{ink}">{txt}{side}</g><g transform="translate({cx - mw/2:.2f} {cy - mh/2:.2f})">{b}</g>'), size, size


def pattern(bg, ball, w=400, h=400, cell=100, pid='pt'):
    """满版图案：点式交错排列，每行转 180°（一来一回）。布袋、毛巾、包装纸、App 背景。"""
    b1, mw, mh = dots(0, 0, cell * .34, ball)
    tile = (f'<rect width="{cell}" height="{cell}" fill="{bg}"/>'
            f'<g transform="translate({cell*.25 - mw/2:.2f} {cell*.25 - mh/2:.2f})">{b1}</g>'
            f'<g transform="rotate(180 {cell*.75:.2f} {cell*.75:.2f}) translate({cell*.75 - mw/2:.2f} {cell*.75 - mh/2:.2f})">{b1}</g>')
    return (f'<defs><pattern id="{pid}" width="{cell}" height="{cell}" patternUnits="userSpaceOnUse">{tile}</pattern></defs>'
            f'<rect width="{w}" height="{h}" fill="url(#{pid})"/>'), w, h


# ───────────────────────── 周边示意 ─────────────────────────
def svg(body, w, h, pad=0, bg=None, cls=''):
    W, H = w + 2 * pad, h + 2 * pad
    bgr = f'<rect x="{-pad:.1f}" y="{-pad:.1f}" width="{W:.1f}" height="{H:.1f}" fill="{bg}"/>' if bg else ''
    return f'<svg class="{cls}" viewBox="{-pad:.1f} {-pad:.1f} {W:.1f} {H:.1f}" xmlns="http://www.w3.org/2000/svg" role="img">{bgr}{body}</svg>'


def place(b, w, h, cx, cy, tw):
    s = tw / w
    return f'<g transform="translate({cx - tw/2:.2f} {cy - h*s/2:.2f}) scale({s:.4f})">{b}</g>'


STAGE = '#E9E4D6'


def m_tee():
    body = ('M118 40 L160 28 Q200 52 240 28 L282 40 L340 92 L306 130 L284 112 L284 330 L116 330 L116 112 L94 130 L60 92 Z')
    b, w, h = dots_only(C['lime'])
    return (f'<path d="{body}" fill="{C["deep"]}"/><path d="M160 28 Q200 60 240 28" fill="none" stroke="#082C1F" stroke-width="5"/>'
            + place(b, w, h, 248, 120, 34))


def m_tote():
    p, w, h = pattern(C['deep'], C['lime'], 200, 220, 50, 'tp')
    return (f'<path d="M150 120 Q150 50 200 50 Q250 50 250 120" fill="none" stroke="#CDBF9E" stroke-width="12"/>'
            f'<g transform="translate(100 110)"><clipPath id="tc"><rect width="200" height="220" rx="6"/></clipPath><g clip-path="url(#tc)">{p}</g></g>')


def m_cap():
    b, w, h = dots_only(C['lime'])
    return (f'<path d="M92 220 Q92 92 200 88 Q308 92 308 220 Z" fill="{C["deep"]}"/>'
            f'<path d="M200 88 L200 220 M140 100 Q160 160 150 220 M260 100 Q240 160 250 220" stroke="#082C1F" stroke-width="3" fill="none"/>'
            f'<circle cx="200" cy="90" r="9" fill="#082C1F"/>'
            f'<path d="M70 222 Q200 196 330 222 Q340 262 300 270 Q200 250 100 270 Q60 262 70 222Z" fill="#082C1F"/>'
            + place(b, w, h, 200, 168, 58))


def m_badge():
    b, w, h = badge(C['deep'], C['cream'], C['lime'])
    return place(b, w, h, 200, 190, 250)


def m_seal():
    b, w, h = seal(C['lime'], C['deep'], C['deep'])
    b2, w2, h2 = seal(C['deep'], C['cream'], C['lime'])
    return (f'<circle cx="138" cy="190" r="70" fill="#F4F4EE"/><circle cx="138" cy="190" r="70" fill="none" stroke="#D7D2C4" stroke-width="2"/>'
            + place(b, w, h, 138, 190, 86) + place(b2, w2, h2, 278, 190, 120))


def m_can():
    b, w, h = dots_only(C['lime'])
    wm = L.wordmark_only(C['cream'], track=.32)
    return (f'<rect x="130" y="70" width="140" height="250" rx="16" fill="{C["deep"]}"/>'
            f'<ellipse cx="200" cy="70" rx="70" ry="16" fill="{C["lime"]}"/><ellipse cx="200" cy="70" rx="58" ry="11" fill="#B3D532"/>'
            + place(b, w, h, 200, 170, 70) + place(*wm, 200, 258, 96))


def m_pin():
    (bx, by, br), (sx, sy, sr), W, H = dots_geom()
    s = 150 / H
    return (f'<g transform="translate({200 - W*s/2:.1f} {190 - H*s/2:.1f}) scale({s:.4f})">'
            f'<circle cx="{bx}" cy="{by}" r="{br + 2.4}" fill="#C9A24A"/><circle cx="{sx:.2f}" cy="{sy:.2f}" r="{sr + 2.4}" fill="#C9A24A"/>'
            f'<circle cx="{bx}" cy="{by}" r="{br}" fill="{C["lime"]}"/><circle cx="{sx:.2f}" cy="{sy:.2f}" r="{sr}" fill="{C["lime"]}"/>'
            f'<circle cx="{bx - 8}" cy="{by - 9}" r="5" fill="#fff" opacity=".45"/></g>')


def m_towel():
    b, w, h = vertical(C['cream'], C['lime'])
    stripes = ''.join(f'<rect x="120" y="{y}" width="160" height="6" fill="{C["cream"]}" opacity=".85"/>' for y in (300, 312))
    return (f'<rect x="120" y="40" width="160" height="300" rx="6" fill="{C["deep"]}"/>{stripes}'
            + place(b, w, h, 200, 160, 44))


MOCKS = [
    ('T 恤胸口', '点式', '深绿 T 恤左胸，黄绿刺绣两点，宽 3.5 cm。不写字，认得的人一眼就认得。', m_tee),
    ('帆布袋', '满版图案', '点式交错排列，每行转 180°，像一来一回。也用于毛巾边、包装纸。', m_tote),
    ('棒球帽', '点式', '帽前正中刺绣，宽 5–6 cm。', m_cap),
    ('圆形贴纸 / 刺绣章', '徽章', '上弧 NANBANQIU、下弧 MELBOURNE，都从左往右读，中间点式。', m_badge),
    ('避震器 / 方形贴纸', '「伴」字印章', '一个字就够。黄绿底用深绿，深底用黄绿点。', m_seal),
    ('球罐', '点式 + 签名字标', '球罐身深绿，盖子就是球的颜色。', m_can),
    ('徽章别针', '点式', '金属描边珐琅，两颗球各自一块，中间的距离刚好放金属边。', m_pin),
    ('毛巾', '竖排', '南 / 伴 / 球 竖排，点式在顶，底部两道奶油色条纹。', m_towel),
]


def page():
    dk = L.VERSIONS['dark']
    fams = [
        ('点式', 'Dots', '你选的那版：两颗纯色球分开，间距 = 两倍留白环（≈ 大球半径的 1/4），方向和主标志一样是 44° 对角。周边的主角。',
         dots_only(C['lime'])),
        ('点式签名', 'Dots Signature', '宽字距字标 + 点式，点落在「伴」「球」字缝上方。海报落款、周边印字。', sig_dots(dk['ink'], dk['ball'])),
        ('点式签名 · 居中', 'Dots Signature Centered', '同一套尺寸，两点在整个字标正中上方（「伴」字上方），按视觉重心对齐。对称、端正，适合居中构图的封面、周边正面、印章式落款。', sig_dots_center(dk['ink'], dk['ball'])),
        ('点式横式', 'Dots Horizontal', '点式放在字左边，比主标志轻松，适合周边吊牌、袋子侧面。', h_dots(dk['ink'], dk['ball'])),
        ('一来一回', 'Rally', '大球打过去，落地一下，小球接住。贴在长条物件上：球拍包、横幅、邮件签名。', rally(C['lime'], line=C['cream'])),
        ('弹跳三点', 'Bounce', '大、中、小三颗依次变低，像球弹了两下停下。加载动画、段落分隔、文章结尾符。', bounce(C['lime'])),
        ('线框符号', 'Outline', '主符号只描边，几何不变。压纹、皮标、单线刺绣、激光雕刻。', outline_mark(C['lime'])),
        ('竖排', 'Vertical', '南 / 伴 / 球 竖排，点式在顶。毛巾、竖幅、球包侧面。', vertical(dk['ink'], dk['ball'])),
        ('「伴」字印章', 'Seal', '只用一个「伴」字，右上角两点。避震器、方形贴纸、盖章。', seal(C['deep'], C['cream'], C['lime'])),
        ('徽章', 'Badge', '外圈英文环绕，中间点式。圆形贴纸、刺绣章、杯垫。', badge(C['deep'], C['cream'], C['lime'])),
        ('满版图案', 'Pattern', '点式交错，每行转 180°。帆布袋、毛巾边、包装纸、App 空白背景（降到 6% 透明度）。', pattern(C['deep'], C['lime'], 300, 200, 60, 'fp')),
    ]
    fam_html = ''
    for zh, en, use, (b, w, h) in fams:
        fam_html += f'<figure class="fam"><div class="fam-art">{svg(b, w, h)}</div><figcaption><b>{zh}</b><span class="en">{en}</span><p>{use}</p></figcaption></figure>'
    mock_html = ''.join(
        f'<figure class="mk"><div class="mk-art">{svg(fn(), 400, 380, bg=STAGE)}</div><figcaption><b>{t}</b><span class="tag">{v}</span><p>{d}</p></figcaption></figure>'
        for t, v, d, fn in MOCKS)
    (bx, by, br), (sx, sy, sr), W, H = dots_geom()
    geo = svg(f'''<rect x="-6" y="-6" width="{W+12:.1f}" height="{H+12:.1f}" class="gbg"/>
<circle cx="{bx}" cy="{by}" r="{br}" class="d"/><circle cx="{sx:.2f}" cy="{sy:.2f}" r="{sr}" class="d"/>
<line x1="{bx}" y1="{by}" x2="{sx:.2f}" y2="{sy:.2f}" class="ln"/>
<line x1="{bx + br*math.cos(ANG):.2f}" y1="{by + br*math.sin(ANG):.2f}" x2="{sx - sr*math.cos(ANG):.2f}" y2="{sy - sr*math.sin(ANG):.2f}" class="gp"/>
<text x="{(bx + sx)/2 + 6:.1f}" y="{(by + sy)/2 - 2:.1f}" class="lab">间距 {DOT_GAP:.1f}</text>
<text x="{bx}" y="{by + 4}" class="lab" text-anchor="middle">r 26</text><text x="{sx:.1f}" y="{sy + 4:.1f}" class="lab" text-anchor="middle">r 16.5</text>''', W, H, pad=8, cls='geo')
    return f'''<title>南伴球周边标志</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@900&display=swap">
<style>
/* 版式：接着《南伴球标志规范》的品牌手册样式；先讲点式几何，再列 10 个变体，最后放 8 个周边示意 */
:root{{
  --bg:#F6F3EA; --surface:#FFFFFF; --fg:#0B3B2A; --muted:#55685F; --rule:#D9D4C4; --accent:#176B4D; --warn:#B4381F;
  --f-zh:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif; --f-disp:'Noto Serif SC','Songti SC',serif; --f-lat:Inter,'Helvetica Neue',Arial,sans-serif;
}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#07150F;--surface:#0E2219;--fg:#EEF2E6;--muted:#9DB2A6;--rule:#21392E;--accent:#C6EA3D;--warn:#F08A6C;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#07150F;--surface:#0E2219;--fg:#EEF2E6;--muted:#9DB2A6;--rule:#21392E;--accent:#C6EA3D;--warn:#F08A6C;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--fg);font:15px/1.75 var(--f-zh)}}
.wrap{{max-width:1080px;margin:0 auto;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}}
.hero{{background:#0B3B2A;color:#fff}}
.hero .wrap{{padding-block:64px 52px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:48px;align-items:center}}
.hero-art svg{{width:min(100%,340px);display:block;margin:0 auto}}
.eyebrow{{font:600 12px/1 var(--f-lat);letter-spacing:.28em;text-transform:uppercase;color:#C6EA3D}}
.hero h1{{font:900 clamp(32px,5vw,50px)/1.15 var(--f-disp);margin:18px 0 16px}}
.hero p{{color:#D6E2D9;max-width:34em;margin:0}}
section{{border-top:1px solid var(--rule)}}
section .wrap{{padding-block:60px;display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px}}
.sh .no{{font:600 12px/1 var(--f-lat);letter-spacing:.2em;color:var(--accent)}}
.sh h2{{font:900 26px/1.3 var(--f-disp);margin:10px 0 8px}}
.sh .en{{font:500 11px/1 var(--f-lat);letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}}
.body{{min-width:0;display:grid;gap:26px}}
.lead{{font-size:17px;max-width:38em;margin:0}} p{{margin:0}}
.rules{{margin:0;padding-left:1.2em;display:grid;gap:6px;max-width:42em}} .rules b{{color:var(--accent)}}
.geo-row{{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:32px;align-items:center}}
svg.geo{{width:100%;background:var(--surface);border:1px solid var(--rule)}}
.geo .gbg{{fill:var(--surface)}} .geo .d{{fill:#C6EA3D}} .geo .ln{{stroke:var(--fg);stroke-width:.3;stroke-dasharray:1 1;opacity:.6}}
.geo .gp{{stroke:var(--warn);stroke-width:1.2}} .geo .lab{{font:600 4px var(--f-lat);fill:var(--warn)}}
.fams{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.fam{{margin:0;background:var(--surface);border:1px solid var(--rule)}}
.fam-art{{background:#0B3B2A;height:190px;display:flex;align-items:center;justify-content:center;padding:34px}}
.fam-art svg{{max-width:100%;max-height:100%;width:auto;height:auto}}
.fam figcaption{{padding:15px 18px 18px}} .fam b{{font-size:16px}}
.en{{margin-left:10px;font:500 11px var(--f-lat);letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}}
.fam p{{color:var(--muted);font-size:14px;margin-top:4px}}
.mks{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}}
.mk{{margin:0;display:grid;gap:10px;align-content:start}}
.mk-art svg{{width:100%;height:auto;display:block}}
.mk b{{font-size:15px}} .tag{{margin-left:8px;font-size:12px;color:var(--accent);font-weight:700}}
.mk p{{color:var(--muted);font-size:13px;margin-top:2px}}
footer .wrap{{padding-block:36px 56px;color:var(--muted);font-size:13px}}
@media (max-width:820px){{
  .hero .wrap,section .wrap,.geo-row{{grid-template-columns:minmax(0,1fr);gap:22px}}
  .fams{{grid-template-columns:minmax(0,1fr)}} .mks{{grid-template-columns:repeat(2,minmax(0,1fr))}}
}}
</style>
<header class="hero"><div class="wrap">
  <div class="hero-art">{svg(*sig_dots(dk['ink'], dk['ball']))}</div>
  <div><div class="eyebrow">Brand Extensions · Merch</div><h1>南伴球周边标志</h1>
  <p>主标志管“认得出”，衍生标志管“想带走”。十一个变体都用主标志的两个半径和 44° 对角，形状变了，认得出来是同一对球。</p></div>
</div></div></header>

<section><div class="wrap">
  <div class="sh"><div class="no">01</div><h2>点式</h2><div class="en">The Dots</div></div>
  <div class="body">
    <div class="geo-row">{geo}
      <ul class="rules">
        <li>主标志里两球相切、互相咬合；点式把它们<b>拉开</b>，去掉球缝，只剩两颗纯色圆。少了约束，多了轻松，最适合穿戴。</li>
        <li>间距固定 <b>{DOT_GAP:.1f}</b>（网格单位，≈ 大球半径 1/4）。再近就粘成一团，再远就散成两颗不相干的点。</li>
        <li>永远大球在左上、小球在右下。满版图案里可以整体转 180°，不单独翻转其中一颗。</li>
        <li>配色同主标志：黄绿点只放深底；浅底用深绿点。</li>
      </ul>
    </div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">02</div><h2>衍生变体</h2><div class="en">Variants</div></div>
  <div class="body"><div class="fams">{fam_html}</div>
  <ul class="rules"><li>同一件周边上只用一种变体；主标志（带球缝）留给 App、官方文件和需要“正式”的地方。</li>
  <li>衍生变体不替代主标志出现在 App 图标、商店页、合作文件里。</li></ul></div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">03</div><h2>周边示意</h2><div class="en">Merch</div></div>
  <div class="body"><div class="mks">{mock_html}</div>
  <p style="font-size:13px;color:var(--muted)">示意图只表达位置和配色。实际制作前要按供应商的工艺打样：刺绣最小线宽约 1 mm，丝印黄绿用专色。</p></div>
</div></section>
<footer><div class="wrap">南伴球 Nanbanqiu · 周边标志 v1.0 · 2026-11-10 · 几何来源 marketing/brand/logo.py、variants.py</div></footer>'''


def build():
    out = os.path.join(L.HERE, 'svg')
    dk = L.VERSIONS['dark']
    lt = L.VERSIONS['light']
    files = {
        'variant-dots-dark': dots_only(C['lime']), 'variant-dots-light': dots_only(C['deep']),
        'variant-dots-signature-dark': sig_dots(dk['ink'], dk['ball']), 'variant-dots-signature-light': sig_dots(lt['ink'], lt['ball']),
        'variant-dots-signature-center-dark': sig_dots_center(dk['ink'], dk['ball']), 'variant-dots-signature-center-light': sig_dots_center(lt['ink'], lt['ball']),
        'variant-dots-horizontal-dark': h_dots(dk['ink'], dk['ball']), 'variant-dots-horizontal-light': h_dots(lt['ink'], lt['ball']),
        'variant-rally-dark': rally(C['lime'], line=C['cream']), 'variant-rally-light': rally(C['deep']),
        'variant-bounce-dark': bounce(C['lime']), 'variant-bounce-light': bounce(C['deep']),
        'variant-outline-dark': outline_mark(C['lime']), 'variant-outline-light': outline_mark(C['deep']),
        'variant-vertical-dark': vertical(dk['ink'], dk['ball']), 'variant-vertical-light': vertical(lt['ink'], lt['ball']),
        'variant-seal-deep': seal(C['deep'], C['cream'], C['lime']), 'variant-seal-lime': seal(C['lime'], C['deep'], C['deep']),
        'variant-badge-deep': badge(C['deep'], C['cream'], C['lime']), 'variant-badge-cream': badge(C['cream'], C['deep'], C['deep']),
        'variant-pattern-deep': pattern(C['deep'], C['lime'], 400, 400, 100, 'p1'), 'variant-pattern-cream': pattern(C['cream'], C['deep'], 400, 400, 100, 'p2'),
    }
    for k, (b, w, h) in files.items():
        open(os.path.join(out, f'nanbanqiu-{k}.svg'), 'w').write(L.svg_doc(b, w, h))
    p = os.path.join(L.HERE, 'variants.html')
    open(p, 'w', encoding='utf-8').write(page())
    print(len(files), 'SVG +', p)


if __name__ == '__main__':
    build()
