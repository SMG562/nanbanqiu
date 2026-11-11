"""小毛 v3：荧光黄绿的写实球 + 黑色手写细线画的手和脚（像钢笔随手一笔）。
球是唯一有颜色和质感的东西，线条只负责动作，形成“实”与“简”的对比。
要放在浅色底上（奶油 / 纸色），黑线才看得见；深色底用 mao2。
figure3(id, cx, cy, r, pose, mood, ...) 画整只；pen / hand / shoe3 / face2 可单独拼姿势。
"""
from lib import *
from mao2 import face2

PEN, PAPER = '#171412', '#FFFBEF'


def pen(d, w, op=1.0):
    """一笔：主线 + 一条错开一点点的淡细线，像笔尖抖了一下。"""
    return (f'<path d="{d}" fill="none" stroke="{PEN}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>'
            f'<path d="{d}" transform="translate(.8 -.6)" fill="none" stroke="{PEN}" stroke-width="{w*.5:.2f}" stroke-linecap="round" opacity="{op*.45:.2f}"/>')


def hand3(x, y, r, w):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{.078*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w:.2f}"/>'


def shoe3(x, y, r, w, rot=0):
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot})"><ellipse rx="{.21*r:.1f}" ry="{.09*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w:.2f}"/>'
            f'<path d="M{-.17*r:.1f} {.04*r:.1f} Q0 {.085*r:.1f} {.17*r:.1f} {.04*r:.1f}" fill="none" stroke="{PEN}" stroke-width="{w*.75:.2f}" stroke-linecap="round"/>'
            f'<path d="M{-.03*r:.1f} {-.055*r:.1f} l{.06*r:.1f} {.025*r:.1f} M{.02*r:.1f} {-.075*r:.1f} l{.06*r:.1f} {.022*r:.1f}" fill="none" stroke="{PEN}" stroke-width="{w*.45:.2f}" stroke-linecap="round"/></g>')


SH_L, SH_R = (-.93, .12), (.93, .12)
DOWN_L, DOWN_R = ((-1.38, .45), (-1.24, .86)), ((1.38, .45), (1.24, .86))
POSES = {
    'wave':   dict(L=DOWN_L, R=((1.62, .0), (1.44, -.80)), legs='stand', sparks='wave', tilt=-2),
    'cheer':  dict(L=((-1.58, -.05), (-1.36, -1.00)), R=((1.58, -.05), (1.36, -1.00)), legs='jump', lift=.26, sparks='cheer'),
    'plead':  dict(L=((-.62, .62), (-.15, .82)), R=((.62, .62), (.15, .82)), front=True, legs='stand', sparks='plead', tilt=-5),
    'racket': dict(L=DOWN_L, R=((1.40, .36), (1.30, .30)), legs='stand', racket=True, tilt=3),
    'wow':    dict(L=((-1.52, .25), (-1.68, -.32)), R=((1.52, .25), (1.68, -.32)), legs='step', sparks='wow'),
    'sorry':  dict(L=DOWN_L, R=((1.55, -.55), (.56, -1.06)), legs='stand', tilt=-4),
    'sleep':  dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=-9, zz=True),
}
LEGS = {  # (髋, 控制点, 脚踝, 鞋的角度)
    'stand': [((-.34, .92), (-.42, 1.14), (-.40, 1.38), 6), ((.34, .92), (.42, 1.14), (.40, 1.38), -6)],
    'jump':  [((-.32, .92), (-.52, 1.06), (-.62, 1.22), 24), ((.32, .92), (.52, 1.02), (.60, 1.16), -24)],
    'step':  [((-.34, .92), (-.42, 1.14), (-.40, 1.38), 6), ((.34, .92), (.60, 1.0), (.66, 1.16), -26)],
}


def _flip(P):
    fl = lambda a: None if a is None else ((-a[0][0], a[0][1]), (-a[1][0], a[1][1]))
    Q = dict(P)
    Q['L'], Q['R'] = fl(P.get('R')), fl(P.get('L'))
    if 'tilt' in Q:
        Q['tilt'] = -Q['tilt']
    return Q


def _flip_legs(legs):
    return [((-h[0], h[1]), (-c[0], c[1]), (-a[0], a[1]), -rot) for h, c, a, rot in legs]


def tuft3(cx, cy, r, w):
    """小毛头顶一小撮毛：三笔，往右翘。"""
    out = ''
    for x, hgt, bend in ((-.17, .20, .5), (-.02, .30, .7), (.13, .22, .9)):
        by = -math.sqrt(1 - x * x)
        out += pen(f'M{cx + x*r:.1f} {cy + (by + .02)*r:.1f} Q{cx + (x + .02)*r:.1f} {cy + (by - hgt*.6)*r:.1f} {cx + (x + .04 + bend*.08)*r:.1f} {cy + (by - hgt)*r:.1f}', w * 1.7)
    return out


def bow3(cx, cy, r, w):
    """小绒头顶右侧的小蝴蝶结：奶油白 + 黑线描边，中间一个结，两瓣各一道褶。"""
    bx, by = .50, -.87
    lobe = lambda k: (f'<path d="M0 0 L{k*.27*r:.1f} {-.17*r:.1f} Q{k*.34*r:.1f} 0 {k*.27*r:.1f} {.17*r:.1f} Z" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.8:.2f}" stroke-linejoin="round"/>'
                      f'<path d="M{k*.06*r:.1f} 0 L{k*.23*r:.1f} {-.07*r:.1f} M{k*.06*r:.1f} 0 L{k*.23*r:.1f} {.07*r:.1f}" stroke="{PEN}" stroke-width="{w*.4:.2f}" stroke-linecap="round" opacity=".55"/>')
    return (f'<g transform="translate({cx + bx*r:.1f} {cy + by*r:.1f}) rotate(-24)">{lobe(-1)}{lobe(1)}'
            f'<circle r="{.07*r:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="{w*.8:.2f}"/></g>')


def ball_c(id, cx, cy, r, hi, mid, lo, seam='#FFF6F0', rim='#3b0d1f', rot=-22):
    """和 lib.ball 同一种写实网球，只是换颜色（粉色的小绒用）。"""
    s = r / 100
    return f'''
<g transform="translate({cx} {cy}) scale({s})">
  <circle r="100" fill="url(#pg{id})"/>
  <clipPath id="pc{id}"><circle r="100"/></clipPath>
  <g clip-path="url(#pc{id})">
    <g transform="rotate({rot})">
      <path d="M-67 -74 C-30 -34 -30 34 -67 74" fill="none" stroke="{seam}" stroke-width="11" stroke-linecap="round" opacity=".92"/>
      <path d="M67 -74 C30 -34 30 34 67 74" fill="none" stroke="{seam}" stroke-width="11" stroke-linecap="round" opacity=".92"/>
    </g>
    <circle r="100" fill="#000" filter="url(#fuzz)" opacity=".30" style="mix-blend-mode:multiply"/>
    <circle r="100" fill="url(#pr{id})"/>
  </g>
</g>
<defs>
 <radialGradient id="pg{id}" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="{hi}"/><stop offset=".55" stop-color="{mid}"/><stop offset="1" stop-color="{lo}"/></radialGradient>
 <radialGradient id="pr{id}" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="{rim}" stop-opacity="0"/><stop offset="1" stop-color="{rim}" stop-opacity=".5"/></radialGradient>
</defs>'''


PINK = dict(hi='#FFEEF4', mid='#FFC6D8', lo='#F29DBA', seam='#FFFDF6', rim='#7a2a4a')


def brows3(cx, cy, s, mood):
    """细细的眉毛：不同心情抬得不一样；睡着了没有。"""
    if mood == 'sleep':
        return ''
    e = 42 * s
    f = lambda v: f'{v:.1f}'
    table = {'happy': (-30, -32), 'cheer': (-31, -34), 'wink': (-30, -32), 'wow': (-36, -41), 'plead': (-22, -34), 'sweat': (-22, -31)}
    yo, yi = table.get(mood, (-23, -25))
    out = ''
    for sx in (-1, 1):
        xo, xi = sx * (e + 14 * s), sx * (e - 13 * s)
        if mood == 'wink' and sx == 1:
            yo, yi = -23, -25
        out += (f'<path d="M{f(cx + xo)} {f(cy + yo*s)} Q{f(cx + (xo + xi)/2)} {f(cy + (min(yo, yi) - 6)*s)} {f(cx + xi)} {f(cy + yi*s)}" '
                f'fill="none" stroke="{PEN}" stroke-width="{f(3*s)}" stroke-linecap="round" opacity=".9"/>')
    return out


def sleepbubble(cx, cy, s):
    return (f'<circle cx="{cx + 25*s:.1f}" cy="{cy + 39*s:.1f}" r="{8*s:.1f}" fill="#fff" fill-opacity=".55" stroke="{PEN}" stroke-width="{2.4*s:.2f}"/>'
            f'<path d="M{cx + 21*s:.1f} {cy + 37*s:.1f} q{2*s:.1f} {-3*s:.1f} {5*s:.1f} {-3*s:.1f}" fill="none" stroke="#fff" stroke-width="{1.6*s:.2f}" stroke-linecap="round"/>')


def star4(x, y, k, w):
    return (f'<path d="M{x:.1f} {y-k:.1f} L{x+.28*k:.1f} {y-.28*k:.1f} L{x+k:.1f} {y:.1f} L{x+.28*k:.1f} {y+.28*k:.1f} L{x:.1f} {y+k:.1f} '
            f'L{x-.28*k:.1f} {y+.28*k:.1f} L{x-k:.1f} {y:.1f} L{x-.28*k:.1f} {y-.28*k:.1f} Z" fill="none" stroke="{PEN}" stroke-width="{w:.2f}" stroke-linejoin="round"/>')


def face3(cx, cy, s, mood='smile', look=0, char='mao'):
    """脸 + 眉毛；小绒加睫毛、玫瑰色腮红；睡着了鼻子吹个泡泡。cx,cy 为脸中心。"""
    pink = char == 'rong'
    out = face2(cx, cy, s, mood, look, ink=PEN, blush_c=('#FF7FA3' if pink else '#E8643C'), blush_op=(.50 if pink else .35))
    if mood == 'sleep':
        out += sleepbubble(cx, cy, s)
    return out


def lashes3(cx, cy, s):
    """睫毛：每只眼睛外角两笔。cx,cy 与 face2 的脸中心一致。"""
    e, out = 42 * s, ''
    for sx in (-1, 1):
        x = sx * (e + 13 * s)
        for dy1, dy2, dx in ((-4, -14, 8), (1, -3, 10)):
            out += (f'<path d="M{cx + x:.1f} {cy + dy1*s:.1f} L{cx + x + sx*dx*s:.1f} {cy + dy2*s:.1f}" stroke="{PEN}" '
                    f'stroke-width="{3.4*s:.2f}" stroke-linecap="round"/>')
    return out


def figure3(id, cx, cy, r, pose='wave', mood='happy', tilt=None, lift=None, look=0, soft=True, char='mao', mirror=None, gy=None):
    """char: 'mao' 小毛（头顶一小撮毛）/ 'rong' 小绒（高马尾 + 蝴蝶结 + 睫毛 + 网球裙）。
    pose 可以是名字，也可以是自己拼的 dict（L / R 为 None 表示这只手不画）；
    小绒用名字时左右镜像（有动作的手在左边，不和马尾打架）；gy 给定则按地面线定位。"""
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
        gy = cy + 1.53 * r
    else:
        cy = gy - 1.53 * r
    cy = cy - lift * r
    w = max(2.2, .034 * r)
    p = lambda x, y: f'{cx + x * r:.1f} {cy + y * r:.1f}'
    xy = lambda x, y: (cx + x * r, cy + y * r)
    legs = ''.join(pen(f'M{p(*h)} Q{p(*c)} {p(*a)}', w) for h, c, a, _ in legs_def) + \
        ''.join(shoe3(*xy(a[0] + (.06 if a[0] > 0 else -.06), a[1] + .06), r, w * .9, rot) for _, _, a, rot in legs_def)
    arm = lambda sh, a: '' if a is None else pen(f'M{p(*sh)} Q{p(*a[0])} {p(*a[1])}', w) + hand3(*xy(*a[1]), r, w * .9)
    arms = arm(SH_L, P.get('L')) + arm(SH_R, P.get('R'))
    extra = ''
    if P.get('racket'):
        ra = P['L'] if mirror else P['R']
        hx, hy = xy(*ra[1])
        hx2, hy2 = cx + m * 1.52 * r, cy - .22 * r
        extra = (pen(f'M{hx:.1f} {hy:.1f} L{hx2:.1f} {hy2:.1f}', w)
                 + f'<g transform="translate({cx + m*1.78*r:.1f} {cy - .78*r:.1f}) rotate({24*m})"><ellipse rx="{.38*r:.1f}" ry="{.50*r:.1f}" fill="#fff" fill-opacity=".35" stroke="{PEN}" stroke-width="{w:.2f}"/>'
                 + ''.join(f'<path d="M{-.32*r:.1f} {k*.15*r:.1f} H{.32*r:.1f}" stroke="{PEN}" stroke-width="{w*.35:.2f}" opacity=".55"/>' for k in range(-2, 3))
                 + ''.join(f'<path d="M{k*.15*r:.1f} {-.42*r:.1f} V{.42*r:.1f}" stroke="{PEN}" stroke-width="{w*.35:.2f}" opacity=".55"/>' for k in range(-2, 3)) + '</g>'
                 + hand3(hx, hy, r, w * .9))
    sp = P.get('sparks')
    if sp == 'cheer':
        for sx in (-1, 1):
            hx, hy = xy(sx * 1.36, -1.00)
            for a in (-125, -90, -55):
                ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
                extra += pen(f'M{hx + ca*.17*r:.1f} {hy + sa*.17*r:.1f} L{hx + ca*.31*r:.1f} {hy + sa*.31*r:.1f}', w * .8)
    elif sp == 'wave':
        hx, hy = xy(m * 1.44, -.80)
        for rad in (.20, .32):
            extra += pen(f'M{hx + m*rad*r:.1f} {hy - .14*r:.1f} Q{hx + m*(rad+.07)*r:.1f} {hy:.1f} {hx + m*rad*r:.1f} {hy + .14*r:.1f}', w * .8)
    elif sp == 'wow':
        for a in (-125, -90, -55):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            extra += pen(f'M{cx + ca*1.12*r:.1f} {cy + sa*1.12*r:.1f} L{cx + ca*1.30*r:.1f} {cy + sa*1.30*r:.1f}', w * .8)
    if sp == 'plead':
        extra += star4(cx - 1.12 * r, cy - .50 * r, .15 * r, w * .7) + star4(cx + 1.20 * r, cy - .70 * r, .10 * r, w * .7) + star4(cx - 1.34 * r, cy - .86 * r, .07 * r, w * .6)
    z = ''
    if P.get('zz'):
        for i in range(3):
            s_ = (.16 + i * .06) * r
            ox, oy = cx + m * (1.10 + i * .26) * r, cy - (.60 + i * .40) * r
            z += pen(f'M{ox:.1f} {oy:.1f} H{ox + s_:.1f} L{ox:.1f} {oy + s_:.1f} H{ox + s_:.1f}', w * .75)
    ground = pen(f'M{cx - .95*r:.1f} {gy:.1f} Q{cx - .3*r:.1f} {gy - .035*r:.1f} {cx + .15*r:.1f} {gy:.1f} T{cx + .95*r:.1f} {gy - .004*r:.1f}', w * .7, .55)
    soft_sh = f'<ellipse cx="{cx + .05*r:.1f}" cy="{gy:.1f}" rx="{(.85 - lift*.4)*r:.1f}" ry="{.09*r:.1f}" fill="#0B3B2A" opacity="{.16 - lift*.2:.2f}" filter="url(#{"bl6" if r < 80 else "bl14"})"/>' if soft else ''
    s = r / 118
    fc = (cx + .04 * r, cy + .06 * r)
    limbs = f'<g filter="url(#rough2)">{legs}{arms if not P.get("front") else ""}</g>'
    gnd = f'<g filter="url(#rough2)">{ground}</g>'
    front = f'<g filter="url(#rough2)">{arms}</g>' if P.get('front') else ''
    marks = f'<g filter="url(#rough2)">{extra}{z}</g>'
    if char == 'rong':
        hair = f'<g filter="url(#rough2)">{bow3(cx, cy, r, w)}</g>'
        body = ball_c(id, cx, cy, r, **PINK)
    else:
        hair = ''
        body = ball(id, cx, cy, r)
    return (soft_sh + gnd + f'<g transform="rotate({tilt} {cx} {cy})">{limbs}{body}'
            f'{face3(*fc, s, mood, look, char)}{hair}{front}{marks}</g>')
