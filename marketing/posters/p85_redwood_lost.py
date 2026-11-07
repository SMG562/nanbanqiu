from lib import *

META = dict(
    id=85, slug='redwood-lost', title='这一拍，有点远', lines=['这一拍，', '打得有点远。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='清晨的巨木林，几道斜光穿过薄雾；最亮的一束正好落在蕨叶间一颗荧光球上，远处雾里隐约是球场的围网；旁边一行小字「在这儿。」',
    use='品牌情绪图（自然、大气）；打过球的人都懂的大实话：球飞出围网，去林子里找',
)

SUN = (.36, 1.0)  # 光线方向：从左上射向右下（每下降 1，向右 0.36）


def shaft_x(gx, y, gy=1110):
    return gx + (y - gy) * SUN[0]


def trunk(id, xc, wt, wb, ytop, ybot, lit, mid, dark, seed, flare=0, op=1, fog=None):
    """一根树干：上窄下宽、底部外扩；左侧受光、右侧背光；竖向纤维树皮。"""
    rnd = random.Random(seed)
    def edge(side):
        pts = []
        n = 14
        for i in range(n + 1):
            t = i / n
            y = ytop + (ybot - ytop) * t
            w = wt + (wb - wt) * t ** 1.6
            if t > .82:
                w += flare * ((t - .82) / .18) ** 2.2
            pts.append((xc + side * w / 2 + rnd.uniform(-1.5, 1.5) * w / 60, y))
        return pts
    L, R = edge(-1), edge(1)
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in L) + ' L' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in reversed(R)) + 'Z'
    # 树皮纹：竖向长条，深浅交替
    strokes = ''
    x0, x1 = xc - wb / 2 - flare, xc + wb / 2 + flare
    for _ in range(int((x1 - x0) / 1.4)):
        x = rnd.uniform(x0, x1)
        y1 = rnd.uniform(ytop - 200, ybot)
        ln = rnd.uniform(120, 700)
        sw = rnd.uniform(.8, 5.5) * max(.35, wb / 260)
        c = rnd.choice(['#120604', '#120604', '#120604', '#FFD2A6'])
        o = rnd.uniform(.12, .42) if c != '#FFD2A6' else rnd.uniform(.06, .2)
        wob = rnd.uniform(-6, 6)
        strokes += f'<path d="M{x:.1f} {y1:.0f} q{wob:.1f} {ln/2:.0f} {wob*.3:.1f} {ln:.0f}" stroke="{c}" stroke-width="{sw:.1f}" opacity="{o:.2f}" fill="none"/>'
    moss = ''.join(f'<ellipse cx="{rnd.uniform(xc-wb*.45, xc+wb*.1):.0f}" cy="{rnd.uniform(ytop+(ybot-ytop)*.3, ybot):.0f}" rx="{rnd.uniform(1, 3):.1f}" ry="{rnd.uniform(2, 6):.1f}" fill="#A9C94A" opacity="{rnd.uniform(.25, .6):.2f}"/>' for _ in range(int(wb * .25)))
    strokes += moss
    fogrect = f'<rect x="{x0-10:.0f}" y="{ytop-10}" width="{x1-x0+20:.0f}" height="{ybot-ytop+20}" fill="url(#{fog})"/>' if fog else ''
    return f'''<defs><linearGradient id="tg{id}" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="{lit}"/><stop offset=".35" stop-color="{mid}"/><stop offset=".78" stop-color="{dark}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
<clipPath id="tc{id}"><path d="{d}"/></clipPath></defs>
<g opacity="{op}"><path d="{d}" fill="url(#tg{id})"/>
<g clip-path="url(#tc{id})">{strokes}
<rect x="{x0-10:.0f}" y="{ytop-10}" width="{x1-x0+20:.0f}" height="{ybot-ytop+20}" fill="url(#ao{id})"/>{fogrect}</g></g>
<defs><linearGradient id="ao{id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC48A" stop-opacity=".28"/><stop offset=".08" stop-color="#FFC48A" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>'''


def foliage(rnd, n, x0, x1, y0, y1, cols, rx=(5, 16), ry=(2, 6), lit=None):
    out = ''
    for _ in range(n):
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        c = rnd.choice(cols)
        if lit:
            k = lit(x, y)
            if k > 0 and rnd.random() < k:
                c = rnd.choice(['#9CCB4A', '#B5DA5A', '#7FB33E', '#C9E77A'])
        out += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(*rx):.1f}" ry="{rnd.uniform(*ry):.1f}" transform="rotate({rnd.uniform(-50, 50):.0f} {x:.0f} {y:.0f})" fill="{c}" opacity="{rnd.uniform(.7, 1):.2f}"/>'
    return out


def branch_canopy(rnd, n, ymax):
    """顶部针叶树冠：一簇簇下垂的细枝，每簇几十片针叶。"""
    out = ''
    for _ in range(n):
        x, y = rnd.uniform(-60, 1140), rnd.uniform(-40, ymax) * rnd.random() ** .7
        L = rnd.uniform(50, 150)
        sweep = rnd.choice([-1, 1])
        c = rnd.choice(['#06150E', '#0A1E14', '#0D2618', '#08190F', '#11301E'])
        g = ''
        for k in range(int(L / 2.2)):
            t = rnd.random()
            px = x + sweep * L * t + rnd.uniform(-10, 10) * t
            py = y + 30 * t * t + rnd.uniform(-8, 12) * (.4 + t)
            g += f'<ellipse cx="{px:.0f}" cy="{py:.0f}" rx="{rnd.uniform(4, 9):.1f}" ry="{rnd.uniform(1.4, 2.6):.1f}" transform="rotate({sweep*rnd.uniform(20, 75):.0f} {px:.0f} {py:.0f})"/>'
        out += f'<g fill="{c}">{g}</g>'
    return out


def _unused(rnd, n, ymax):
    out = ''
    for _ in range(n):
        x, y = rnd.uniform(-60, 1140), rnd.uniform(-40, ymax) * rnd.random() ** .6
        L = rnd.uniform(60, 180)
        c = rnd.choice(['#06150E', '#0A1E14', '#0D2618', '#08190F'])
        sweep = rnd.choice([-1, 1])
        # 主枝 + 两侧细叶
        pts = ''
        for k in range(int(L / 7)):
            t = k / (L / 7)
            px = x + sweep * L * t
            py = y + 24 * t * t
            ln = 14 * (1 - t) + 6
            pts += f'<path d="M{px:.0f} {py:.0f} l{-5*sweep:.0f} {ln:.0f} M{px:.0f} {py:.0f} l{4*sweep:.0f} {ln*.9:.0f}" />'
        out += f'<g stroke="{c}" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M{x:.0f} {y:.0f} q{sweep*L/2:.0f} 4 {sweep*L:.0f} 24" stroke-width="4"/>{pts}</g>'
    return out


def svg():
    random.seed(85)
    rnd = random.Random(85)

    shafts = [(150, 70, .10), (395, 120, .20), (600, 54, .08), (850, 90, .07)]  # 地面落点、宽度、亮度

    def lit(x, y):
        best = 0
        for gx, w, a in shafts:
            d = abs(x - shaft_x(gx, y))
            if d < w * .55:
                best = max(best, (1 - d / (w * .55)) * a * 4)
        return min(best, 1)

    # 光柱
    beams = ''
    for gx, w, a in shafts:
        top, bot = -60, 1250
        xt, xb = shaft_x(gx, top), shaft_x(gx, bot)
        beams += f'<path d="M{xt - w*.35:.0f} {top} L{xt + w*.35:.0f} {top} L{xb + w*.65:.0f} {bot} L{xb - w*.65:.0f} {bot}Z" fill="url(#beam85)" opacity="{a*3.2:.2f}"/>'

    # 远景树（雾里，灰绿、细）
    far = ''
    for i, x in enumerate([40, 120, 205, 300, 470, 520, 640, 905, 990, 1060]):
        w = rnd.uniform(14, 30)
        far += trunk(f'f{i}', x, w * .7, w, 120, 1010, '#8FA08A', '#71856F', '#5A6D5C', 100 + i, op=.55)
    mid = ''
    for i, (x, w) in enumerate([(-10, 120), (232, 50), (1010, 70)]):
        mid += trunk(f'm{i}', x, w * .78, w, -20, 1060, '#B0694A', '#6E3B26', '#3C2216', 200 + i, flare=w * .3, fog='fogm85')
    hero = trunk('h', 742, 236, 300, -40, 1250, '#D98455', '#8F4A2C', '#321A10', 77, flare=90)

    # 远处雾里的围网（球是从那边飞过来的）
    fence = ''
    fx0, fx1, fy0, fy1 = 92, 300, 900, 1004
    for k in range(0, int(fx1 - fx0), 9):
        fence += f'<path d="M{fx0+k} {fy0} l{fy1-fy0} {fy1-fy0}" /><path d="M{fx0+k} {fy0} l{-(fy1-fy0)} {fy1-fy0}" />'
    fence_svg = f'''<clipPath id="fc85"><rect x="{fx0}" y="{fy0}" width="{fx1-fx0}" height="{fy1-fy0}"/></clipPath>
<rect x="{fx0}" y="{fy0+70}" width="{fx1-fx0}" height="{fy1-fy0-70}" fill="#3F7C5A" opacity=".35"/>
<g clip-path="url(#fc85)" stroke="#D8E2D2" stroke-width=".8" opacity=".35" fill="none">{fence}</g>
<g stroke="#C8D2C2" stroke-width="2.4" opacity=".45"><path d="M{fx0} {fy0-6} V{fy1}"/><path d="M{fx0+104} {fy0-6} V{fy1}"/><path d="M{fx1} {fy0-6} V{fy1}"/><path d="M{fx0} {fy0} H{fx1}"/></g>'''

    canopy_back = branch_canopy(random.Random(3), 260, 480)
    canopy_front = branch_canopy(random.Random(4), 230, 260)

    # 地面植被：远处一层、近处一层
    under_far = foliage(random.Random(11), 1600, -20, 1100, 990, 1110, ['#1F4A2A', '#2A5A31', '#173B22', '#3B6B36'], lit=lit)
    under_near = foliage(random.Random(12), 2600, -20, 1100, 1080, 1360, ['#0E2716', '#14331C', '#0A1E10', '#1C4425'], rx=(8, 24), ry=(3, 8), lit=lambda x, y: lit(x, y) * .8)
    front = foliage(random.Random(13), 900, -20, 1100, 1190, 1380, ['#06140A', '#081A0D', '#0B2112'], rx=(12, 30), ry=(4, 10))

    bx, by, br = 392, 1112, 25

    body = f'''
<defs>
<linearGradient id="sky85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9C9C0"/><stop offset=".35" stop-color="#5E8A72"/><stop offset=".7" stop-color="#2E5A40"/><stop offset="1" stop-color="#173A26"/></linearGradient>
<linearGradient id="beam85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D6" stop-opacity=".0"/><stop offset=".25" stop-color="#FFF1CC" stop-opacity=".9"/><stop offset=".85" stop-color="#FFEFC4" stop-opacity=".75"/><stop offset="1" stop-color="#FFEFC4" stop-opacity="0"/></linearGradient>
<linearGradient id="fogm85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7E9C8A" stop-opacity=".0"/><stop offset=".55" stop-color="#7E9C8A" stop-opacity=".15"/><stop offset=".9" stop-color="#A9BFAE" stop-opacity=".45"/><stop offset="1" stop-color="#A9BFAE" stop-opacity=".2"/></linearGradient>
<linearGradient id="vig85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020805" stop-opacity=".85"/><stop offset=".3" stop-color="#020805" stop-opacity=".0"/><stop offset=".78" stop-color="#020805" stop-opacity="0"/><stop offset="1" stop-color="#020805" stop-opacity=".75"/></linearGradient>
<filter id="bark85" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".09 .0045" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .04  0 0 0 0 .02  0 0 0 -2.4 1.45"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky85)"/>
<ellipse cx="180" cy="80" rx="420" ry="260" fill="#F5F0D8" opacity=".35" filter="url(#bl60)"/>
<g filter="url(#bl6)" opacity=".75">{canopy_back}</g>
{far}
<ellipse cx="420" cy="980" rx="620" ry="90" fill="#C9D6C4" opacity=".28" filter="url(#bl60)"/>
{fence_svg}
{under_far}
<g filter="url(#bl28)" style="mix-blend-mode:screen">{beams}</g>
{mid}
<ellipse cx="300" cy="1060" rx="420" ry="70" fill="#E9EFD8" opacity=".22" filter="url(#bl60)"/>
{under_near}
<ellipse cx="{bx+6}" cy="{by+18}" rx="{br*1.3:.0f}" ry="5" fill="#04100A" opacity=".75" filter="url(#bl6)"/>
<ellipse cx="{bx}" cy="{by}" rx="110" ry="46" fill="#F6F2C8" opacity=".38" filter="url(#bl28)"/>
{hero}
<g style="mix-blend-mode:screen" filter="url(#bl14)">{beams.replace('fill="url(#beam85)"', 'fill="#FFE9C0"').replace('opacity="0.', 'opacity="0.0')}</g>
{front}
<ellipse cx="{bx+4}" cy="{by+6}" rx="62" ry="34" fill="#071A0C" opacity=".75" filter="url(#bl14)"/>
<ellipse cx="{bx}" cy="{by-2}" rx="44" ry="40" fill="#FFF3C4" opacity=".35" filter="url(#bl14)"/>
{ball('b85', bx, by, br, rot=-30)}
<g opacity=".97">{foliage(random.Random(21), 46, bx-64, bx+64, by+12, by+44, ['#173F1F', '#1F4D26', '#0F2E16'], rx=(7, 15), ry=(2.5, 5))}</g>
<g filter="url(#bl14)" opacity=".9">{canopy_front}</g>
{canopy_front}
<rect width="{W}" height="{H}" fill="url(#vig85)"/>
<g stroke="#F7EBD6" stroke-width="1.4" fill="none" opacity=".8"><path d="M{bx+28} {by-14} L{bx+56} {by-40} H{bx+80}"/></g>
<text x="{bx+88}" y="{by-33}" font-family="{SANS}" font-size="22" letter-spacing="3" fill="#F7EBD6" opacity=".9">在这儿。</text>
{tag('OUT · 7:12 AM')}
{headline(META['lines'], y=290, size=62, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
