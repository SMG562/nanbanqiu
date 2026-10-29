"""小毛 v4：真正毛茸茸的网球（毡毛质感）+ 婴儿比例的脸 + 短短的黑线手脚。
- fuzzball：球体 = 渐变底 + 轮廓一圈细毛（逆光发亮）+ 表面几千根短绒毛 + 带毛边的球缝 + 立体明暗；不再是光滑的蛋。
- face4：大而亮的眼睛（两个高光 + 下沿反光）、小嘴、柔和的腮红；没有睫毛。
- figure4：手脚比 v3 短一截（更“Q”），脚是小小的球鞋。
只放浅色底上（黑线手脚）。
"""
import math
import random
import zlib

from lib import *
from mao3 import pen, POSES, LEGS, SH_L, SH_R, _flip, _flip_legs, tuft3, star4, PEN, PAPER

EYE = '#2A1B18'
# 小毛：品牌荧光黄绿，阴影偏冷、不发棕
LIME_P = dict(hi='#F0FBA8', mid='#C9EC45', lo='#8EB82A', hair_hi='#F8FFCB', seam='#FFFEF4', blush='#FFC49C', blush_op=.7)
# 小绒：奶油棉花糖粉，嫩而不艳
PINK_P = dict(hi='#FFF0F5', mid='#FFC6D8', lo='#F2A0BD', hair_hi='#FFF8FA', seam='#FFFFFF', blush='#FF7FA3', blush_op=.55)


def _hex(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _mix(a, b, t):
    ca, cb = _hex(a), _hex(b)
    return '#%02X%02X%02X' % tuple(round(x + (y - x) * t) for x, y in zip(ca, cb))


def fuzzball(id, cx, cy, r, pal, seed=1, rot=-22, dens=1.0):
    R = random.Random(seed * 7919 + int(r))
    u = r / 100
    lx, ly = -math.sqrt(.5), -math.sqrt(.5)          # 光从左上来
    mid, lo, hh = pal['mid'], pal['lo'], pal['hair_hi']
    cols = [lo, _mix(lo, mid, .55), mid, _mix(mid, hh, .45), _mix(mid, hh, .8)]
    # 1) 轮廓一圈细毛（受光处发亮、背光处偏深）
    halo = [[] for _ in range(5)]
    for _ in range(int(12 * r * dens)):
        th = R.uniform(0, math.tau)
        lit = math.cos(th) * lx + math.sin(th) * ly
        t = max(0., min(1., .5 + .5 * lit + R.uniform(-.28, .28)))
        c, s = math.cos(th), math.sin(th)
        r0, r1 = r * R.uniform(.95, .985), r * R.uniform(1.014, 1.058)
        bend = R.uniform(-.05, .05) * r
        halo[min(4, int(t * 5))].append(
            f'M{r0*c:.1f} {r0*s:.1f} Q{(r0+r1)/2*c - s*bend:.1f} {(r0+r1)/2*s + c*bend:.1f} {r1*c:.1f} {r1*s:.1f}')
    halo_svg = ''.join(
        f'<path d="{" ".join(p)}" fill="none" stroke="{cols[k]}" stroke-width="{max(.6, .0092*r):.2f}" stroke-linecap="round" opacity=".9"/>'
        for k, p in enumerate(halo) if p)
    # 2) 表面绒毛：几千根短弧线，亮的偏左上，暗的偏右下
    buckets = {k: [] for k in ('lh', 'll', 'dh', 'dl')}
    for _ in range(int(r * r / 6.5 * dens)):
        rho = r * math.sqrt(R.random()) * .99
        th = R.uniform(0, math.tau)
        px, py = rho * math.cos(th), rho * math.sin(th)
        lit = (px * lx + py * ly) / r
        ang = th + math.pi / 2 + R.uniform(-1.0, 1.0)
        L = R.uniform(.028, .07) * r
        dx, dy = math.cos(ang) * L, math.sin(ang) * L
        cv = R.uniform(-.3, .3)
        seg = f'M{px:.1f} {py:.1f} q{dx/2 - dy*cv:.1f} {dy/2 + dx*cv:.1f} {dx:.1f} {dy:.1f}'
        light = R.random() < .5 + .32 * lit
        buckets[('l' if light else 'd') + ('h' if R.random() < .45 else 'l')].append(seg)
    spec = {'lh': (hh, .27, .0085), 'll': (hh, .15, .006), 'dh': (lo, .24, .0085), 'dl': (lo, .14, .006)}
    fiber_svg = ''.join(
        f'<path d="{" ".join(v)}" fill="none" stroke="{spec[k][0]}" stroke-opacity="{spec[k][1]}" stroke-width="{max(.5, spec[k][2]*r):.2f}" stroke-linecap="round"/>'
        for k, v in buckets.items() if v)

    # 3) 球缝：奶白色带毛边 + 压出来的暗槽 + 边缘几根白绒
    def bez(t, sx):
        p0, p1, p2, p3 = (sx * -67, -74), (sx * -30, -34), (sx * -30, 34), (sx * -67, 74)
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]
        dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
        dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
        n = math.hypot(dx, dy)
        return x, y, -dy / n, dx / n
    seam_d = ('M-67 -74 C-30 -34 -30 34 -67 74', 'M67 -74 C30 -34 30 34 67 74')
    tick = []
    for sx in (1, -1):
        for _ in range(int(46 * dens + 14)):
            t = R.random()
            x, y, nx, ny = bez(t, -sx)
            side = R.choice((-1, 1))
            o, l = 5.0 + R.uniform(-.8, .6), R.uniform(2.2, 5.5)
            a = R.uniform(-.5, .5)
            ex_, ey_ = nx * math.cos(a) - ny * math.sin(a), nx * math.sin(a) + ny * math.cos(a)
            tick.append(f'M{x + nx*side*o:.1f} {y + ny*side*o:.1f} l{ex_*side*l:.1f} {ey_*side*l:.1f}')
    seam_svg = (
        f'<g transform="rotate({rot})">'
        f'<g fill="none" stroke-linecap="round">'
        f'<path d="{seam_d[0]} {seam_d[1]}" stroke="{lo}" stroke-width="15" opacity=".22" filter="url(#sb{id})"/>'
        f'<path d="{seam_d[0]} {seam_d[1]}" stroke="{pal["seam"]}" stroke-width="10.5" opacity=".97" filter="url(#sf{id})"/>'
        f'<path d="{" ".join(tick)}" stroke="{pal["seam"]}" stroke-width=".8" opacity=".75"/></g></g>')

    defs = (
        f'<defs>'
        f'<radialGradient id="bg{id}" cx=".36" cy=".30" r=".82"><stop offset="0" stop-color="{pal["hi"]}"/><stop offset=".48" stop-color="{mid}"/><stop offset="1" stop-color="{lo}"/></radialGradient>'
        f'<radialGradient id="fs{id}" cx=".34" cy=".28" r=".98"><stop offset=".58" stop-color="{lo}" stop-opacity="0"/><stop offset="1" stop-color="{_mix(lo, "#3A1020" if pal is PINK_P else "#1F3A00", .35)}" stop-opacity=".55"/></radialGradient>'
        f'<radialGradient id="hl{id}" cx=".3" cy=".24" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
        f'<clipPath id="bc{id}"><circle r="{r}"/></clipPath>'
        f'<filter id="sf{id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="{seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/><feGaussianBlur stdDeviation=".45"/></filter>'
        f'<filter id="sb{id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>'
        f'<filter id="ed{id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="{.9/max(r,40)*40:.2f}" numOctaves="2" seed="{seed+3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="{max(1.2, .03*r):.1f}"/></filter>'
        f'</defs>')
    fr = min(1.0, max(.45, 110 / r))
    ds = max(1.4, .026 * r)
    felt = (
        f'<filter id="fz{id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">'
        f'<feTurbulence type="fractalNoise" baseFrequency="{fr*.8:.2f}" numOctaves="3" seed="{seed}" result="n"/>'
        f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{ds:.1f}" xChannelSelector="R" yChannelSelector="G" result="d"/>'
        f'<feGaussianBlur in="d" stdDeviation="{max(.6, .0065*r):.2f}" result="db"/>'
        f'<feTurbulence type="fractalNoise" baseFrequency="{fr*1.7:.2f}" numOctaves="2" seed="{seed+5}" result="n2"/>'
        f'<feDiffuseLighting in="n2" surfaceScale="1.5" diffuseConstant="1.15" lighting-color="#fff" result="lit"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>'
        f'<feComposite in="lit" in2="db" operator="in" result="li"/>'
        f'<feBlend in="li" in2="db" mode="multiply"/>'
        f'</filter>'
        f'<filter id="gl{id}" x="-15%" y="-15%" width="130%" height="130%">'
        f'<feTurbulence type="fractalNoise" baseFrequency="{fr*.9:.2f}" numOctaves="3" seed="{seed+9}" result="n"/>'
        f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{ds*1.9:.1f}" xChannelSelector="R" yChannelSelector="G"/>'
        f'<feGaussianBlur stdDeviation="{max(1., .01*r):.2f}"/></filter>')
    return (defs + f'<defs>{felt}</defs><g transform="translate({cx:.1f} {cy:.1f})">'
            f'<circle r="{r*1.0:.1f}" fill="{mid}" opacity=".55" filter="url(#gl{id})"/>'
            f'<g filter="url(#fz{id})"><circle r="{r}" fill="url(#bg{id})"/>'
            f'<g clip-path="url(#bc{id})"><g transform="scale({u})">{seam_svg}</g></g></g>'
            f'<g clip-path="url(#bc{id})"><circle r="{r}" fill="url(#fs{id})"/><circle r="{r}" fill="url(#hl{id})"/></g></g>')


def face4(id, cx, cy, r, mood='smile', look=0, pal=LIME_P):
    u = r / 100
    f = lambda v: f'{v:.1f}'
    ex, ey = 31 * u, 8 * u
    st = f'fill="none" stroke="{EYE}" stroke-width="{f(2.8*u)}" stroke-linecap="round" stroke-linejoin="round"'

    def eye(x, k=1.0):
        rx, ry = 9.5 * u * k, 12.5 * u * k
        return (f'<ellipse cx="{f(x)}" cy="{f(ey)}" rx="{f(rx)}" ry="{f(ry)}" fill="{EYE}"/>'
                f'<ellipse cx="{f(x)}" cy="{f(ey + ry*.5)}" rx="{f(rx*.6)}" ry="{f(ry*.30)}" fill="#8A5E50" opacity=".55"/>'
                f'<circle cx="{f(x - rx*.3 + look*2*u)}" cy="{f(ey - ry*.36)}" r="{f(rx*.40)}" fill="#fff"/>'
                f'<circle cx="{f(x + rx*.36 + look*2*u)}" cy="{f(ey + ry*.36)}" r="{f(rx*.17)}" fill="#fff" opacity=".9"/>')

    def arc_up(x):
        return f'<path d="M{f(x-10.5*u)} {f(ey+4.5*u)} Q{f(x)} {f(ey-11*u)} {f(x+10.5*u)} {f(ey+4.5*u)}" fill="none" stroke="{EYE}" stroke-width="{f(4.4*u)}" stroke-linecap="round"/>'

    def arc_dn(x):
        return f'<path d="M{f(x-10*u)} {f(ey-1*u)} Q{f(x)} {f(ey+9*u)} {f(x+10*u)} {f(ey-1*u)}" fill="none" stroke="{EYE}" stroke-width="{f(4.2*u)}" stroke-linecap="round"/>'

    def brow(x1, y1, x2, y2):
        return f'<path d="M{f(x1*u)} {f(y1*u)} L{f(x2*u)} {f(y2*u)}" fill="none" stroke="{EYE}" stroke-width="{f(2.4*u)}" stroke-linecap="round" opacity=".85"/>'

    cat = f'<path d="M{f(-9*u)} {f(28*u)} Q{f(-4.5*u)} {f(35*u)} 0 {f(29*u)} Q{f(4.5*u)} {f(35*u)} {f(9*u)} {f(28*u)}" {st}/>'
    smile = f'<path d="M{f(-7*u)} {f(28*u)} Q0 {f(36*u)} {f(7*u)} {f(28*u)}" {st}/>'
    openm = (f'<path d="M{f(-9*u)} {f(26*u)} Q{f(-9*u)} {f(43*u)} 0 {f(43*u)} Q{f(9*u)} {f(43*u)} {f(9*u)} {f(26*u)} Q0 {f(23.5*u)} {f(-9*u)} {f(26*u)} Z" fill="#3A1F1C" stroke="#3A1F1C" stroke-width="{f(2*u)}" stroke-linejoin="round"/>'
             f'<ellipse cx="0" cy="{f(37.5*u)}" rx="{f(5*u)}" ry="{f(3.4*u)}" fill="#F6808F"/>')
    if mood == 'happy':
        g = arc_up(-ex) + arc_up(ex) + openm
    elif mood == 'cheer':
        g = arc_up(-ex) + arc_up(ex) + openm
    elif mood == 'wow':
        g = eye(-ex, 1.12) + eye(ex, 1.12) + f'<ellipse cx="0" cy="{f(32*u)}" rx="{f(4.8*u)}" ry="{f(6.6*u)}" fill="#3A1F1C"/>' + brow(-ex - 8, ey - 25, -ex + 8, ey - 27) + brow(ex - 8, ey - 27, ex + 8, ey - 25)
    elif mood == 'plead':
        g = eye(-ex, 1.22) + eye(ex, 1.22) + cat + brow(-ex - 9, ey - 21, -ex + 8, ey - 28) + brow(ex - 8, ey - 28, ex + 9, ey - 21)
    elif mood == 'wink':
        g = arc_up(-ex) + eye(ex) + smile
    elif mood == 'sweat':
        g = (eye(-ex) + eye(ex) + brow(-ex - 8, ey - 20, -ex + 8, ey - 26) + brow(ex - 8, ey - 26, ex + 8, ey - 20)
             + f'<path d="M{f(-8*u)} {f(31*u)} q{f(4*u)} {f(-5*u)} {f(8*u)} 0 t{f(8*u)} 0" {st}/>'
             + f'<path transform="translate({f(ex + 27*u)} {f(-18*u)}) scale({f(u*1.25)})" d="M0 -14 C7 -3 10 4 0 10 C-10 4 -7 -3 0 -14 Z" fill="#CFEAF4" stroke="#8DBBD0" stroke-width="1.4"/>')
    elif mood == 'sleep':
        g = (arc_dn(-ex) + arc_dn(ex) + smile
             + f'<circle cx="{f(19*u)}" cy="{f(34*u)}" r="{f(6.5*u)}" fill="#fff" fill-opacity=".6" stroke="{EYE}" stroke-width="{f(1.8*u)}"/>')
    else:
        g = eye(-ex) + eye(ex) + smile
    blush = ''.join(f'<ellipse cx="{f(x)}" cy="{f(27*u)}" rx="{f(11.5*u)}" ry="{f(6.8*u)}" fill="{pal["blush"]}" opacity="{pal["blush_op"]}" filter="url(#bb{id})"/>' for x in (-ex - 17 * u, ex + 17 * u))
    return (f'<defs><filter id="bb{id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="{max(.8, .028*r):.2f}"/></filter></defs>'
            f'<g transform="translate({f(cx)} {f(cy)})">{blush}{g}</g>')


def tuft4(cx, cy, r, w):
    """小毛头顶那一小撮毛：三笔锥形（根粗尖细），根扎在绒毛里。"""
    out = []
    for x, hgt, bend in ((-.15, .17, .45), (-.01, .26, .65), (.13, .19, .85)):
        by = -math.sqrt(1 - x * x) + .035
        p0 = (cx + x * r, cy + by * r)
        c = (cx + (x + .02) * r, cy + (by - hgt * .62) * r)
        p1 = (cx + (x + .035 + bend * .07) * r, cy + (by - hgt) * r)
        L, Rt = [], []
        for i in range(13):
            t = i / 12
            mt = 1 - t
            px = mt * mt * p0[0] + 2 * mt * t * c[0] + t * t * p1[0]
            py = mt * mt * p0[1] + 2 * mt * t * c[1] + t * t * p1[1]
            dx = 2 * mt * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0])
            dy = 2 * mt * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])
            n = math.hypot(dx, dy) or 1
            hw = .0185 * r * (1 - t) ** .85 + .0016 * r
            L.append((px - dy / n * hw, py + dx / n * hw))
            Rt.append((px + dy / n * hw, py - dx / n * hw))
        pts = L + Rt[::-1]
        out.append('M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + ' Z')
    return f'<path d="{" ".join(out)}" fill="{EYE}" stroke="{EYE}" stroke-width="{w*.25:.2f}" stroke-linejoin="round"/>'


def bow4(cx, cy, r, w):
    """小绒的小蝴蝶结（比 v3 小一圈）。"""
    bx, by = .50, -.86
    lobe = lambda k: (f'<path d="M0 0 L{k*.21*r:.1f} {-.13*r:.1f} Q{k*.27*r:.1f} 0 {k*.21*r:.1f} {.13*r:.1f} Z" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.8:.2f}" stroke-linejoin="round"/>'
                      f'<path d="M{k*.05*r:.1f} 0 L{k*.18*r:.1f} {-.05*r:.1f} M{k*.05*r:.1f} 0 L{k*.18*r:.1f} {.05*r:.1f}" stroke="{PEN}" stroke-width="{w*.4:.2f}" stroke-linecap="round" opacity=".5"/>')
    return (f'<g transform="translate({cx + bx*r:.1f} {cy + by*r:.1f}) rotate(-24)">{lobe(-1)}{lobe(1)}'
            f'<circle r="{.055*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.8:.2f}"/></g>')


K_ARM, K_LEG, GROUND = .80, .66, 1.36


def figure4(id, cx, cy, r, pose='wave', mood='happy', char='mao', tilt=None, lift=None, look=0, mirror=None, gy=None, soft=True, seed=None):
    pal = PINK_P if char == 'rong' else LIME_P
    if isinstance(pose, str):
        P = POSES[pose]
        legs_def = LEGS[P['legs']]
        mirror = (char == 'rong') if mirror is None else mirror
        if mirror:
            P, legs_def = _flip(P), _flip_legs(legs_def)
    else:
        P = pose
        legs_def = LEGS[P.get('legs', 'stand')]
        mirror = bool(mirror)
    m = -1 if mirror else 1
    tilt = P.get('tilt', 0) if tilt is None else tilt
    lift = P.get('lift', 0) if lift is None else lift
    if gy is None:
        gy = cy + GROUND * r
    else:
        cy = gy - GROUND * r
    cy -= lift * r
    w = max(2.0, .032 * r)
    xy = lambda x, y: (cx + x * r, cy + y * r)
    p = lambda x, y: f'{cx + x * r:.1f} {cy + y * r:.1f}'
    # 手脚缩短一截
    sa = lambda sh, a: None if a is None else (
        (sh[0] + K_ARM * (a[0][0] - sh[0]), sh[1] + K_ARM * (a[0][1] - sh[1])),
        (sh[0] + K_ARM * (a[1][0] - sh[0]), sh[1] + K_ARM * (a[1][1] - sh[1])))
    L, Rr = sa(SH_L, P.get('L')), sa(SH_R, P.get('R'))
    legs_s = [(h, (h[0] + K_LEG * (c[0] - h[0]), h[1] + K_LEG * (c[1] - h[1])), (h[0] + K_LEG * (a[0] - h[0]), h[1] + K_LEG * (a[1] - h[1])), rot)
              for h, c, a, rot in legs_def]
    hand = lambda x, y: f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{.066*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.9:.2f}"/>'

    def shoe(x, y, rot):
        return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot})"><ellipse rx="{.185*r:.1f}" ry="{.088*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.9:.2f}"/>'
                f'<path d="M{-.15*r:.1f} {.04*r:.1f} Q0 {.083*r:.1f} {.15*r:.1f} {.04*r:.1f}" fill="none" stroke="{PEN}" stroke-width="{w*.7:.2f}" stroke-linecap="round"/>'
                f'<path d="M{-.02*r:.1f} {-.05*r:.1f} l{.05*r:.1f} {.022*r:.1f} M{.02*r:.1f} {-.066*r:.1f} l{.05*r:.1f} {.02*r:.1f}" fill="none" stroke="{PEN}" stroke-width="{w*.42:.2f}" stroke-linecap="round"/></g>')

    legs = ''.join(pen(f'M{p(*h)} Q{p(*c)} {p(*a)}', w) for h, c, a, _ in legs_s) + \
        ''.join(shoe(*xy(a[0] + (.05 if a[0] > 0 else -.05), a[1] + .05), rot) for _, _, a, rot in legs_s)
    arm = lambda sh, a: '' if a is None else pen(f'M{p(*sh)} Q{p(*a[0])} {p(*a[1])}', w) + hand(*xy(*a[1]))
    arms = arm(SH_L, L) + arm(SH_R, Rr)
    extra = ''
    if P.get('racket'):
        ra = L if mirror else Rr
        hx, hy = xy(*ra[1])
        extra = (pen(f'M{hx:.1f} {hy:.1f} L{hx + m*.22*r:.1f} {hy - .38*r:.1f}', w)
                 + f'<g transform="translate({hx + m*.46*r:.1f} {hy - .92*r:.1f}) rotate({24*m})"><ellipse rx="{.33*r:.1f}" ry="{.44*r:.1f}" fill="#fff" fill-opacity=".35" stroke="{PEN}" stroke-width="{w:.2f}"/>'
                 + ''.join(f'<path d="M{-.28*r:.1f} {k*.13*r:.1f} H{.28*r:.1f}" stroke="{PEN}" stroke-width="{w*.35:.2f}" opacity=".55"/>' for k in range(-2, 3))
                 + ''.join(f'<path d="M{k*.13*r:.1f} {-.37*r:.1f} V{.37*r:.1f}" stroke="{PEN}" stroke-width="{w*.35:.2f}" opacity=".55"/>' for k in range(-2, 3)) + '</g>'
                 + hand(hx, hy))
    sp = P.get('sparks')
    if sp == 'cheer':
        for a_ in (L, Rr):
            hx, hy = xy(*a_[1])
            for ang in (-125, -90, -55):
                ca, sn = math.cos(math.radians(ang)), math.sin(math.radians(ang))
                extra += pen(f'M{hx + ca*.15*r:.1f} {hy + sn*.15*r:.1f} L{hx + ca*.28*r:.1f} {hy + sn*.28*r:.1f}', w * .8)
    elif sp == 'wave':
        a_ = L if mirror else Rr
        hx, hy = xy(*a_[1])
        for rad in (.17, .28):
            extra += pen(f'M{hx + m*rad*r:.1f} {hy - .12*r:.1f} Q{hx + m*(rad+.06)*r:.1f} {hy:.1f} {hx + m*rad*r:.1f} {hy + .12*r:.1f}', w * .8)
    elif sp == 'wow':
        for ang in (-125, -90, -55):
            ca, sn = math.cos(math.radians(ang)), math.sin(math.radians(ang))
            extra += pen(f'M{cx + ca*1.12*r:.1f} {cy + sn*1.12*r:.1f} L{cx + ca*1.30*r:.1f} {cy + sn*1.30*r:.1f}', w * .8)
    elif sp == 'plead':
        extra += star4(cx - 1.12 * r, cy - .50 * r, .14 * r, w * .7) + star4(cx + 1.18 * r, cy - .68 * r, .10 * r, w * .7) + star4(cx - 1.30 * r, cy - .84 * r, .065 * r, w * .6)
    z = ''
    if P.get('zz'):
        for i in range(3):
            s_ = (.15 + i * .055) * r
            ox, oy = cx + m * (1.08 + i * .24) * r, cy - (.55 + i * .38) * r
            z += pen(f'M{ox:.1f} {oy:.1f} H{ox + s_:.1f} L{ox:.1f} {oy + s_:.1f} H{ox + s_:.1f}', w * .75)
    ground = pen(f'M{cx - .9*r:.1f} {gy:.1f} Q{cx - .3*r:.1f} {gy - .03*r:.1f} {cx + .15*r:.1f} {gy:.1f} T{cx + .9*r:.1f} {gy - .004*r:.1f}', w * .7, .55)
    soft_sh = (f'<ellipse cx="{cx + .05*r:.1f}" cy="{gy:.1f}" rx="{(.82 - lift*.4)*r:.1f}" ry="{.085*r:.1f}" fill="#0B3B2A" opacity="{.16 - lift*.2:.2f}" '
               f'filter="url(#{"bl6" if r < 80 else "bl14"})"/>') if soft else ''
    hair = bow4(cx, cy, r, w) if char == 'rong' else ''
    seed = seed or (zlib.crc32(str(id).encode()) % 97 + 3)
    front = f'<g filter="url(#rough2)">{arms}</g>' if P.get('front') else ''
    limbs = f'<g filter="url(#rough2)">{legs}{arms if not P.get("front") else ""}</g>'
    return (soft_sh + f'<g filter="url(#rough2)">{ground}</g>'
            f'<g transform="rotate({tilt} {cx} {cy})">{limbs}{fuzzball(id, cx, cy, r, pal, seed)}'
            f'{face4(id, cx, cy, r, mood, look, pal)}<g filter="url(#rough2)">{hair}</g>{front}<g filter="url(#rough2)">{extra}{z}</g></g>')
