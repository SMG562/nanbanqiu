from lib import *

META = dict(
    id=86, slug='first-light', title='第一个到', lines=['第一个到，', '整片场都是我的。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='贴地机位，清晨逆光：太阳从场后的高大桉树间升起，薄雾里一道道光柱；树影顺着球场长长地拉向镜头，露水把场地照出一条亮带；近处底线旁一颗球，逆光把一圈绒毛照亮，长影子一直伸到脚边',
    use='品牌情绪图：早场、第一个到场的人才见过的球场；自然大气',
)

# 贴地透视：眼高 0.45 m，地平线 y=640；地面点 (X 米, 距离 z 米) → 屏幕
HZ, F, EYE = 640, 1700, .45


def P(X, z, Y=0):
    return 540 + F * X / z, HZ + F * (EYE - Y) / z


SUN = (612, 596)          # 太阳在屏幕上的位置
VP = (SUN[0], HZ)         # 逆光时影子的消失点：太阳正下方的地平线上


def mix(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02X}' for x, y in zip(a, b))


def gum(rnd, x, z, h, lean, ws=1.0):
    """一棵桉树：细长、略弯、上部分叉；按远近混进雾色，向阳侧一道暖色轮廓光。"""
    k = min(1, max(0, (z - 34) / 46))           # 0 近 → 1 远
    col = mix('#101A14', '#C9C7A4', .12 + .62 * k)
    w = F * rnd.uniform(.55, .95) * ws / z
    gy = HZ + F * EYE / z
    top = gy - F * h / z
    pts_l, pts_r = [], []
    n = 12
    for i in range(n + 1):
        t = i / n
        y = gy + (top - gy) * t
        cx = x + lean * t * t * (gy - top) * .12 + math.sin(t * 5 + x) * w * .3
        ww = w * (1 - .55 * t) * (1 + .5 * max(0, .1 - t) * 10)
        pts_l.append((cx - ww / 2, y)); pts_r.append((cx + ww / 2, y))
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts_l) + ' L' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in reversed(pts_r)) + 'Z'
    side = 1 if x < SUN[0] else -1              # 向阳的一侧
    rim = pts_r if side == 1 else pts_l
    rimd = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in rim[:9])
    # 上部分叉
    limbs = ''
    for _ in range(rnd.randint(1, 2)):
        t0 = rnd.uniform(.6, .85)
        bx, by = pts_l[int(t0 * n)][0] + w * .4, gy + (top - gy) * t0
        L = (gy - top) * rnd.uniform(.25, .5)
        ang = rnd.uniform(-.45, .45)
        limbs += f'<path d="M{bx:.0f} {by:.0f} q{L*.25*math.sin(ang):.0f} {-L*.5:.0f} {L*math.sin(ang):.0f} {-L:.0f}" stroke="{col}" stroke-width="{max(1.2, w*.35):.1f}" fill="none" stroke-linecap="round"/>'
    rimop = .55 * (1 - k) + .15
    return f'<g><path d="{d}" fill="{col}"/>{limbs}<path d="{rimd}" stroke="#FFE2A8" stroke-width="{max(1, w*.12):.1f}" fill="none" opacity="{rimop:.2f}"/></g>'


def leaves(rnd, n, x0, x1, y0, y1, cols, size=1.0, droop=True):
    """桉树叶：细长、下垂的柳叶形，成簇。"""
    out = ''
    for _ in range(n):
        cx, cy = rnd.uniform(x0, x1), rnd.uniform(y0, y1) * (rnd.random() ** .5 if droop else 1)
        c = rnd.choice(cols)
        g = ''
        for _ in range(rnd.randint(8, 22)):
            px, py = cx + rnd.gauss(0, 22 * size), cy + abs(rnd.gauss(0, 26 * size))
            L = rnd.uniform(10, 22) * size
            a = rnd.uniform(60, 120) + rnd.uniform(-25, 25)
            g += f'<ellipse cx="{px:.0f}" cy="{py:.0f}" rx="{L:.1f}" ry="{L*.18:.1f}" transform="rotate({a:.0f} {px:.0f} {py:.0f})"/>'
        out += f'<g fill="{c}">{g}</g>'
    return out


def svg():
    rnd = random.Random(86)
    sx, sy = SUN

    # ---- 树：远到近
    trees_far, trees_mid = '', ''
    for i in range(11):
        z = rnd.uniform(58, 90)
        trees_far += gum(rnd, rnd.uniform(-40, 1120), z, rnd.uniform(26, 40), rnd.uniform(-1, 1))
    for x, z, ws in [(30, 30, 1.7), (128, 40, .9), (292, 46, .7), (352, 37, 1.25), (476, 54, .6), (742, 41, 1.2), (792, 52, .7), (948, 33, 1.8), (1052, 44, .9)]:
        trees_mid += gum(rnd, x, z, rnd.uniform(30, 42), rnd.uniform(-1, 1), ws)

    # ---- 空中光柱：从太阳向外放射，避开树干之间的缝
    rays = ''
    for a, w, o in [(-62, 3.5, .5), (-40, 2.2, .35), (-22, 4, .55), (-6, 2.4, .4), (14, 3.2, .5), (33, 2, .35), (55, 4, .45), (78, 2.6, .3), (-85, 3, .3), (100, 3, .25)]:
        r = 1500
        a1, a2 = math.radians(a + 90 - w / 2), math.radians(a + 90 + w / 2)
        rays += f'<path d="M{sx} {sy} L{sx + r*math.cos(a1):.0f} {sy + r*math.sin(a1):.0f} L{sx + r*math.cos(a2):.0f} {sy + r*math.sin(a2):.0f}Z" fill="#FFF0C8" opacity="{o:.2f}"/>'

    # ---- 地面上的树影：从消失点向镜头放射的暗带；球所在的那条是亮带
    vx, vy = VP
    shadows = ''
    X = -2.6
    while X < 2.6:
        w = rnd.uniform(.08, .42)
        if not (X + w > -.07 and X < .17):          # 太阳正下方和球所在的一条保持亮
            a1, a2 = math.atan(X / EYE), math.atan((X + w) / EYE)
            L = 1700
            o = rnd.uniform(.5, 1)
            shadows += f'<path d="M{vx} {vy} L{vx + L*math.sin(a1):.0f} {vy + L*math.cos(a1):.0f} L{vx + L*math.sin(a2):.0f} {vy + L*math.cos(a2):.0f}Z" opacity="{o:.2f}"/>'
        X += w + rnd.uniform(.05, .3)

    # ---- 场地线（米）
    def line(X0, z0, X1, z1, wm=.05):
        (x0, y0), (x1, y1) = P(X0, z0), P(X1, z1)
        sw = max(1.2, F * wm / ((z0 + z1) / 2) * .9)
        return f'<path d="M{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f}" stroke-width="{sw:.1f}"/>'
    zb, zn = 1.3, 1.3 + 11.885
    zs, zf = zn - 6.4, 1.3 + 23.77
    lines = ''
    for X in (-5.485, -4.115, 4.115, 5.485):
        lines += line(X, max(zb, .6), X, zf)
    lines += line(-4.115, zs, 4.115, zs) + line(0, zs, 0, zn) + line(0, zn + 6.4, 0, zn)
    lines += line(-4.115, zn + 6.4, 4.115, zn + 6.4) + line(-5.485, zf, 5.485, zf)
    blx0, bly = P(-5.485, zb)
    bly1 = P(0, zb + .05)[1]
    baseline = f'<path d="M-20 {bly1:.1f} L1100 {bly1:.1f} L1100 {bly:.1f} L-20 {bly:.1f}Z" fill="#E9EFE6" opacity=".82"/>'
    cm = P(.025, zb + .1)
    centre_mark = f'<path d="M{540-(cm[0]-540):.1f} {cm[1]:.1f} H{cm[0]:.1f} V{bly1:.1f} H{540-(cm[0]-540):.1f}Z" fill="#E9EFE6" opacity=".82"/>'

    # ---- 球网（竖直平面，在 z=zn）
    ny_bot = P(0, zn)[1]
    def ntop(x):
        t = abs(x - 540) / 540
        return P(0, zn, .914)[1] - 16 * t * t
    nets = ''.join(f'<path d="M{x} {ntop(x):.1f} V{ny_bot:.1f}"/>' for x in range(-4, 1090, 6))
    nets += ''.join(f'<path d="M-10 {ntop(0) + (y - ntop(540)):.1f} Q540 {y:.1f} 1090 {ntop(1080) + (y - ntop(540)):.1f}"/>' for y in [ntop(540) + k * 6 for k in range(1, 20)])
    tape = f'M-10 {ntop(0):.1f} Q540 {ntop(540) + (ntop(540) - ntop(0)):.1f} 1090 {ntop(1080):.1f}'

    # ---- 铁丝网围栏（z=31）
    fz = 31
    fgy, fty = P(0, fz)[1], P(0, fz, 3.6)[1]
    fence = ''
    for X in range(-24, 25, 3):
        x = P(X, fz)[0]
        fence += f'<path d="M{x:.0f} {fty:.0f} V{fgy:.0f}" stroke-width="2.4"/>'
    mesh = ''.join(f'<path d="M{x} {fty:.0f} l{fgy-fty:.0f} {fgy-fty:.0f} M{x} {fty:.0f} l{-(fgy-fty):.0f} {fgy-fty:.0f}"/>' for x in range(-200, 1300, 7))

    # ---- 露水闪点：在太阳正下方的反光带里
    dew = ''
    for _ in range(140):
        y = rnd.uniform(672, 1060)
        spread = (y - HZ) * .28
        x = sx + rnd.gauss(0, spread)
        s = (y - HZ) / 380
        dew += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(.5, 1.6)*s+.3:.1f}" fill="#FFF8E0" opacity="{rnd.uniform(.3, .9):.2f}"/>'

    # ---- 球（逆光）：z=1.75, X=.2
    bz, bX, R = 1.75, .2, .0335
    bx, gy = P(bX, bz)
    br = F * R / bz
    by = gy - br
    fuzz = ''
    for _ in range(320):
        th = rnd.uniform(-math.pi * 1.05, math.pi * .05)          # 主要在上半圈（逆光）
        rr = br * rnd.uniform(.97, 1.02)
        L = rnd.uniform(1.5, 4.5)
        x0, y0 = bx + rr * math.cos(th), by + rr * math.sin(th)
        jit = rnd.uniform(-.5, .5)
        x1, y1 = bx + (rr + L) * math.cos(th + jit * .05), by + (rr + L) * math.sin(th + jit * .05)
        up = max(0, -math.sin(th))
        fuzz += f'<path d="M{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f}" opacity="{(.25 + .7*up) * rnd.uniform(.4, 1):.2f}"/>'
    sh_ang = math.atan2(gy - vy, bx - vx)
    sh_len = 330
    shx, shy = bx + sh_len * math.cos(sh_ang), gy + sh_len * math.sin(sh_ang)

    body = f'''
<defs>
<linearGradient id="sky86" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#07170F"/><stop offset=".22" stop-color="#16362A"/><stop offset=".38" stop-color="#4E6E58"/>
 <stop offset=".45" stop-color="#B9B38A"/><stop offset=".474" stop-color="#F3DDA6"/><stop offset=".5" stop-color="#E4C68E"/><stop offset="1" stop-color="#E4C68E"/></linearGradient>
<linearGradient id="court86" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#8FA37C"/><stop offset=".06" stop-color="#4D7C5E"/><stop offset=".3" stop-color="#2C5E45"/><stop offset=".7" stop-color="#1B4532"/><stop offset="1" stop-color="#0E2A1E"/></linearGradient>
<linearGradient id="sheen86" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C6" stop-opacity=".95"/><stop offset=".35" stop-color="#FFE6AE" stop-opacity=".4"/><stop offset="1" stop-color="#FFE6AE" stop-opacity="0"/></linearGradient>
<linearGradient id="vig86" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030B07" stop-opacity=".7"/><stop offset=".28" stop-color="#030B07" stop-opacity="0"/><stop offset=".8" stop-color="#030B07" stop-opacity="0"/><stop offset="1" stop-color="#030B07" stop-opacity=".7"/></linearGradient>
<radialGradient id="shade86" cx="50%" cy="66%" r="62%"><stop offset="0" stop-color="#16260A" stop-opacity=".72"/><stop offset=".6" stop-color="#16260A" stop-opacity=".55"/><stop offset=".9" stop-color="#16260A" stop-opacity=".15"/><stop offset="1" stop-color="#16260A" stop-opacity="0"/></radialGradient>
<linearGradient id="bsh86" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#061108" stop-opacity=".85"/><stop offset="1" stop-color="#061108" stop-opacity="0"/></linearGradient>
<linearGradient id="topdark86" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05120B" stop-opacity=".95"/><stop offset=".45" stop-color="#05120B" stop-opacity=".6"/><stop offset="1" stop-color="#05120B" stop-opacity="0"/></linearGradient>
<linearGradient id="bshg86" gradientUnits="userSpaceOnUse" x1="{bx:.0f}" y1="{gy:.0f}" x2="{shx:.0f}" y2="{shy:.0f}"><stop offset="0" stop-color="#03100A" stop-opacity=".85"/><stop offset="1" stop-color="#03100A" stop-opacity="0"/></linearGradient>
<clipPath id="ground86"><rect x="0" y="{HZ+18}" width="{W}" height="{H}"/></clipPath>
<clipPath id="sky86c"><rect x="0" y="0" width="{W}" height="{HZ+26}"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky86)"/>
<circle cx="{sx}" cy="{sy}" r="330" fill="#FFE2A0" opacity=".55" filter="url(#bl60)"/>
<g opacity=".9">{trees_far}</g>
<rect y="{HZ-140}" width="{W}" height="200" fill="#F2DEAC" opacity=".38" filter="url(#bl28)"/>
<circle cx="{sx}" cy="{sy}" r="120" fill="#FFF3D0" opacity=".7" filter="url(#bl28)"/>
{trees_mid}
<rect width="{W}" height="520" fill="url(#topdark86)"/>
<circle cx="{sx}" cy="{sy}" r="34" fill="#FFFBEA" filter="url(#bl6)"/><circle cx="{sx}" cy="{sy}" r="16" fill="#fff"/>
<g clip-path="url(#sky86c)" filter="url(#bl14)" style="mix-blend-mode:screen">{rays}</g>
<g stroke="#2A332A" opacity=".4" fill="none"><g stroke-width=".7" opacity=".45">{mesh}</g>{fence}</g>
<path d="M0 {fgy-6:.0f} H{W} V{HZ+40} H0Z" fill="#33402F" opacity=".8"/>
<g clip-path="url(#ground86)">
 <rect y="{HZ}" width="{W}" height="{H-HZ}" fill="url(#court86)"/>
 <path d="M{sx} {HZ} L{sx-260} {H} L{sx+260} {H}Z" fill="url(#sheen86)" filter="url(#bl28)" opacity=".75" style="mix-blend-mode:screen"/>
 <g fill="#04140B" opacity=".5" filter="url(#bl14)">{shadows}</g>
 <g stroke="#ECF2E8" fill="none" opacity=".82">{lines}</g>
 {dew}
</g>
<rect y="{HZ-30}" width="{W}" height="70" fill="#F6E2B0" opacity=".42" filter="url(#bl14)"/>
<g stroke="#0A1A12" stroke-width="1" fill="none" opacity=".5">{nets}</g>
<path d="{tape}" stroke="#F7F0DC" stroke-width="7" fill="none"/>
<path d="{tape}" stroke="#FFF6D8" stroke-width="10" fill="none" opacity=".5" filter="url(#bl6)"/>
<path d="M{bx-br*.9:.0f} {gy} L{bx+br*.9:.0f} {gy} L{shx + br*1.3:.0f} {shy:.0f} L{shx - br*1.3:.0f} {shy:.0f}Z" fill="url(#bshg86)" filter="url(#bl6)"/>
<ellipse cx="{bx}" cy="{gy+2}" rx="{br*1.1:.0f}" ry="{br*.22:.0f}" fill="#061108" opacity=".8" filter="url(#bl6)"/>
{ball('b86', round(bx), round(by), round(br), rot=-28)}
<circle cx="{bx:.0f}" cy="{by:.0f}" r="{br:.0f}" fill="url(#shade86)" style="mix-blend-mode:multiply"/><circle cx="{bx:.0f}" cy="{by:.0f}" r="{br:.0f}" fill="url(#shade86)" opacity=".6"/>
<g stroke="#F4FFB0" stroke-width=".9" stroke-linecap="round" fill="none">{fuzz}</g>
<path d="M{bx-br*.92:.1f} {by-br*.35:.1f} A{br:.1f} {br:.1f} 0 0 1 {bx+br*.92:.1f} {by-br*.35:.1f}" stroke="#FAFFD8" stroke-width="2.4" fill="none" opacity=".85" filter="url(#bl6)"/>
<g>{leaves(random.Random(5), 44, -60, 1140, -40, 230, ['#06140C', '#0A1C12', '#0E2417'], size=1.3)}</g>
<g opacity=".9" filter="url(#bl6)">{leaves(random.Random(6), 10, 300, 1000, -60, 60, ['#081A10'], size=2.2)}</g>
<rect width="{W}" height="{H}" fill="url(#vig86)"/>
{tag('COURT 3 · 6:48 AM')}
{headline(META['lines'], y=290, size=60, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
