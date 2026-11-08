from lib import *
from lin import blob, ink, seal, gball, frame_dark as frame, X0, Y0, S

META = dict(
    id=115, slug='ink-egret-rain', title='雨天的场', lines=['下雨了，', '场地让给它。'],
    style=['水墨重彩', '插画', '意境', '天气'], tone='深色', demo=False,
    concept='水墨重彩方画：灰蓝的雨天，空球场积了水，一只白鹭单脚站在网前，水里有它的倒影；左下几笔浓墨芦苇，斜斜的雨丝',
    use='下雨天改期 / 雨后通知；墨尔本说下就下的雨',
)


def egret(cx, cy, s=1.0, op=1):
    """白鹭：几笔白粉 + 墨线腿和喙（cx,cy 是脚底）。"""
    def P(pts):
        return [(cx + x * s, cy + y * s) for x, y in pts]
    out = ink(P([(0, 0), (2, -70), (6, -140)]), 5 * s, '#121212', op, (0, 0))                       # 立腿
    out += ink(P([(5, -105), (-26, -120), (-40, -106)]), 4 * s, '#121212', op, (0, .2))             # 收起的腿
    out += ink(P([(-110, -140), (-30, -150), (40, -178), (64, -196)]), 64 * s, '#F4F1E8', op, (.75, .2))   # 身子：尾尖、胸圆
    out += ink(P([(-100, -146), (-20, -158), (30, -176)]), 22 * s, '#C3CBC8', op * .7, (.6, .4))  # 腹下暗部
    out += ink(P([(-96, -158), (-10, -184), (44, -198)]), 30 * s, '#FFFFFF', op, (.7, .3))         # 翅
    out += ink(P([(-104, -146), (-150, -128)]), 5 * s, '#F4F1E8', op, (0, .9))                     # 蓑羽
    out += ink(P([(52, -196), (34, -236), (56, -270), (82, -282)]), 14 * s, '#F4F1E8', op, (.1, .1))  # 颈
    out += ink(P([(76, -284), (94, -291), (104, -282)]), 22 * s, '#F4F1E8', op, (.2, .3))          # 头
    out += ink(P([(102, -284), (152, -277)]), 6 * s, '#2A2418', op, (0, .9))                       # 喙
    out += f'<circle cx="{cx+92*s:.1f}" cy="{cy-287*s:.1f}" r="{3*s:.1f}" fill="#111" opacity="{op}"/>'
    return out


def svg():
    r = random.Random(86)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#6F8590"/>']
    for k in range(26):                           # 天：横向湿笔，长短不一
        y = r.uniform(Y0, 470)
        x = r.uniform(X0 - 200, x1 - 200)
        p.append(ink([(x, y), (x + r.uniform(200, 600), y + r.uniform(-14, 14))], r.uniform(24, 70), r.choice(['#7C93A0', '#90A5AE', '#61798A', '#A9B9BB', '#C3CFCD']), r.uniform(.3, .65), (.35, .35)))
    for k in range(3):                            # 远处树线
        y = 470 + k * 16
        pts = [(X0 - 20 + i * 100, y - r.uniform(10, 60) * (1 - k * .3)) for i in range(11)]
        d = 'M' + ' L'.join(f'{a:.0f} {b:.0f}' for a, b in pts) + f' L{x1+20} 560 L{X0-20} 560Z'
        p.append(f'<path d="{d}" fill="{["#3C5058", "#2C3D44", "#22302F"][k]}" opacity=".85"/>')
    p.append(f'<path d="M{X0} 550 L{x1} 540 L{x1} {y1} L{X0} {y1}Z" fill="#46645A"/>')         # 湿球场
    for _ in range(22):
        y = r.uniform(560, 1000)
        x = r.uniform(X0 - 60, x1 - 120)
        p.append(ink([(x, y), (x + r.uniform(140, 380), y + r.uniform(-4, 4))], r.uniform(10, 26), r.choice(['#5B7B6E', '#3B5A4F', '#8FA6A6', '#9DB2B2']), .55, (.3, .3)))
    for a, b in [((160, 1010), (330, 570)), ((330, 570), (790, 562)), ((790, 562), (980, 1010))]:
        p.append(ink([a, b], 7, '#E4E2D6', .8, (0, 0)))
    p.append(ink([(260, 700), (850, 692)], 6, '#E4E2D6', .75, (0, 0)))
    p.append(ink([(555, 698), (560, 1010)], 6, '#E4E2D6', .7, (0, 0)))
    p.append(blob(r, 610, 950, 270, 52, '#A7BDBF', .6, 0, .12, 12))                                 # 积水
    p.append(blob(r, 610, 950, 200, 34, '#C3D2D0', .5, 0, .12, 12))
    p.append(f'<g transform="translate(0 {960*1.55:.0f}) scale(1 -.55)" opacity=".3">{egret(590, 960, 1.25)}</g>')
    p.append(ink([(170, 640), (540, 632), (910, 628)], 10, '#141414', .95, (.02, .02)))             # 网
    p.append(ink([(170, 640), (170, 700)], 12, '#141414', 1, (0, 0)))
    p.append(ink([(910, 628), (910, 690)], 12, '#141414', 1, (0, 0)))
    for i in range(18):
        xx = 190 + i * 40
        p.append(ink([(xx, 640), (xx + 1, 670)], 2.5, '#141414', .55, (0, 0)))
    p.append(ink([(178, 672), (540, 666), (902, 662)], 3, '#141414', .4, (0, 0)))
    p.append('<ellipse cx="812" cy="922" rx="22" ry="5" fill="#C6EA3D" opacity=".3"/>')
    p.append(gball(810, 904, 19, -15, '86'))
    p.append(egret(590, 960, 1.25))
    for i in range(9):                            # 芦苇
        bx = X0 + 10 + i * 26 + r.uniform(-8, 8)
        top = (bx + r.uniform(40, 140), r.uniform(560, 780))
        p.append(ink([(bx, y1 + 10), ((bx + top[0]) / 2 + r.uniform(-10, 10), (y1 + top[1]) / 2), top], r.uniform(6, 12), '#141210', .92, (.02, .8)))
        if i % 2 == 0:
            p.append(ink([(bx + 30, 940), (bx + 110, 880), (bx + 170, 900)], r.uniform(12, 18), '#141210', .85, (.1, .9)))
    rain = ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x-14:.0f}" y2="{y+46:.0f}" stroke="#E6EEEE" stroke-width="1.6" opacity="{r.uniform(.2, .45):.2f}"/>'
                   for x, y in ((r.uniform(X0, x1 + 40), r.uniform(Y0, y1)) for _ in range(170)))
    p.append(rain)
    p.append(seal(940, 120, 40))
    return page(frame(''.join(p), '下雨了，场地让给它。', 'RAIN', 86))
