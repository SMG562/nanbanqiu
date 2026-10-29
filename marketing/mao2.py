"""小毛 v2：和 33–36 号同一种脸（亮晶晶的眼睛、腮红、小笑），再加一个很小的身体。
球就是身体，长出短短的手和脚（球鞋是奶油色）；手脚比球小一圈，动作靠手和脚传达。
figure(id, cx, cy, r, pose, mood, tilt, lift) 画一个完整的小毛；pose 见 POSES，mood 见 face2。
"""
from lib import *

LIMB, LIMB_O, SHOE, INK = '#B8DA38', '#5E8A1A', '#F7EBD6', '#0B3B2A'


def face2(cx, cy, s, mood='smile', look=0, ink=INK):
    """s = 球半径 / 118。mood: smile 微笑 / happy 弯眼笑 / cheer 张嘴大笑 / wow 惊讶 / plead 求约(大眼睛) / wink 眨眼 / sweat 不好意思 / sleep 闭眼。"""
    e = 42 * s
    f = lambda v: f'{v:.1f}'

    def eye(x, k=1.0):
        return (f'<ellipse cx="{f(x)}" cy="0" rx="{f(10*s*k)}" ry="{f(14*s*k)}" fill="{ink}"/>'
                f'<circle cx="{f(x+look*4*s-3*s*k)}" cy="{f(-5*s*k)}" r="{f(3.6*s*k)}" fill="#fff"/>'
                f'<circle cx="{f(x+4*s*k)}" cy="{f(5.5*s*k)}" r="{f(1.8*s*k)}" fill="#fff" opacity=".85"/>')

    def arc_up(x):   # ^ 形笑眼
        return f'<path d="M{f(x-18*s)} {f(6*s)} Q{f(x)} {f(-14*s)} {f(x+18*s)} {f(6*s)}" fill="none" stroke="{ink}" stroke-width="{f(6*s)}" stroke-linecap="round"/>'

    def arc_dn(x):   # ∪ 形闭眼
        return f'<path d="M{f(x-18*s)} 0 Q{f(x)} {f(20*s)} {f(x+18*s)} 0" fill="none" stroke="{ink}" stroke-width="{f(6*s)}" stroke-linecap="round"/>'

    st = f'fill="none" stroke="{ink}" stroke-width="{f(5*s)}" stroke-linecap="round" stroke-linejoin="round"'
    smile = f'<path d="M{f(-11*s)} {f(32*s)} Q0 {f(45*s)} {f(11*s)} {f(32*s)}" {st}/>'
    if mood == 'happy':
        g = arc_up(-e) + arc_up(e) + f'<path d="M{f(-13*s)} {f(30*s)} Q0 {f(50*s)} {f(13*s)} {f(30*s)}" {st}/>'
    elif mood == 'cheer':
        g = (arc_up(-e) + arc_up(e) +
             f'<path d="M{f(-18*s)} {f(26*s)} Q0 {f(66*s)} {f(18*s)} {f(26*s)} Z" fill="{ink}" stroke="{ink}" stroke-width="{f(3*s)}" stroke-linejoin="round"/>'
             f'<ellipse cx="0" cy="{f(45*s)}" rx="{f(9*s)}" ry="{f(5*s)}" fill="#F08A7A"/>')
    elif mood == 'wow':
        g = eye(-e, 1.2) + eye(e, 1.2) + f'<ellipse cx="0" cy="{f(41*s)}" rx="{f(8*s)}" ry="{f(11*s)}" fill="{ink}"/>'
    elif mood == 'plead':
        g = (eye(-e, 1.25) + eye(e, 1.25) +
             f'<path d="M{f(-15*s)} {f(37*s)} Q{f(-7.5*s)} {f(49*s)} 0 {f(37*s)} Q{f(7.5*s)} {f(49*s)} {f(15*s)} {f(37*s)}" {st}/>')
    elif mood == 'wink':
        g = arc_up(-e) + eye(e) + f'<path d="M{f(-13*s)} {f(30*s)} Q0 {f(50*s)} {f(13*s)} {f(30*s)}" {st}/>'
    elif mood == 'sweat':
        g = (eye(-e) + eye(e) + f'<path d="M{f(-9*s)} {f(36*s)} Q{f(-4.5*s)} {f(30*s)} 0 {f(36*s)} Q{f(4.5*s)} {f(42*s)} {f(9*s)} {f(36*s)}" {st}/>'
             f'<path transform="translate({f(e+44*s)} {f(-34*s)}) scale({f(s*1.5)})" d="M0 -14 C7 -3 10 4 0 10 C-10 4 -7 -3 0 -14 Z" fill="#BFE6F2" stroke="#7FB8CF" stroke-width="1.5"/>')
    elif mood == 'sleep':
        g = arc_dn(-e) + arc_dn(e) + f'<path d="M{f(-7*s)} {f(34*s)} Q0 {f(40*s)} {f(7*s)} {f(34*s)}" {st}/>'
    else:
        g = eye(-e) + eye(e) + smile
    blush = ''.join(f'<ellipse cx="{f(x)}" cy="{f(24*s)}" rx="{f(15*s)}" ry="{f(9*s)}" fill="#E8643C" opacity=".35"/>' for x in (-e - 30 * s, e + 30 * s))
    return f'<g transform="translate({f(cx)} {f(cy)})">{blush}{g}</g>'


def limb(d, w):
    """一条短短的手 / 脚：深色描边 + 荧光黄绿本体。"""
    return (f'<path d="{d}" fill="none" stroke="{LIMB_O}" stroke-width="{w*1.3:.1f}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{LIMB}" stroke-width="{w:.1f}" stroke-linecap="round"/>')


def hand(x, y, rr):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr*1.16:.1f}" fill="{LIMB_O}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}" fill="{LIMB}"/>'


def shoe(x, y, r, rot=0):
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot})"><ellipse rx="{.27*r:.1f}" ry="{.145*r:.1f}" fill="{SHOE}" stroke="{INK}" stroke-width="{.03*r:.1f}"/>'
            f'<path d="M{-.23*r:.1f} {.075*r:.1f} Q0 {.17*r:.1f} {.23*r:.1f} {.075*r:.1f}" fill="none" stroke="{INK}" stroke-width="{.035*r:.1f}" stroke-linecap="round"/></g>')


# 手：(控制点, 手的位置) 单位 = 球半径，原点在球心；front=True 画在球前面
SH_L, SH_R = (-.90, .10), (.90, .10)
DOWN_L, DOWN_R = ((-1.30, .35), (-1.20, .72)), ((1.30, .35), (1.20, .72))
POSES = {
    'wave':  dict(L=DOWN_L, R=((1.45, -.10), (1.32, -.74)), legs='stand'),
    'cheer': dict(L=((-1.45, -.10), (-1.28, -.92)), R=((1.45, -.10), (1.28, -.92)), legs='jump', lift=.26),
    'plead': dict(L=((-.55, .55), (-.15, .76)), R=((.55, .55), (.15, .76)), front=True, legs='stand'),
    'racket': dict(L=DOWN_L, R=((1.30, .30), (1.18, .30)), legs='stand', racket=True),
    'wow':   dict(L=((-1.40, .20), (-1.52, -.28)), R=((1.40, .20), (1.52, -.28)), legs='step'),
    'sorry': dict(L=DOWN_L, R=((1.35, -.55), (.52, -1.00)), legs='stand'),
    'sleep': dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=-9),
}
LEGS = {  # (髋, 脚, 鞋的角度)
    'stand': [((-.36, .88), (-.42, 1.28), 8), ((.36, .88), (.42, 1.28), -8)],
    'jump':  [((-.34, .88), (-.60, 1.18), 22), ((.34, .88), (.58, 1.12), -22)],
    'step':  [((-.36, .88), (-.42, 1.28), 8), ((.36, .88), (.64, 1.10), -26)],
}


def figure(id, cx, cy, r, pose='wave', mood='happy', tilt=None, lift=None, look=0, shadow_blur='bl14'):
    P = POSES[pose]
    tilt = P.get('tilt', 0) if tilt is None else tilt
    lift = P.get('lift', 0) if lift is None else lift
    gy = cy + 1.46 * r                       # 地面
    cy = cy - lift * r
    p = lambda x, y: f'{cx + x * r:.1f} {cy + y * r:.1f}'
    xy = lambda x, y: (cx + x * r, cy + y * r)
    w = .17 * r
    legs = ''.join(limb(f'M{p(*h)} L{p(*ft)}', .155 * r) for h, ft, _ in LEGS[P['legs']]) + \
        ''.join(shoe(*xy(ft[0] + (.05 if ft[0] > 0 else -.05), ft[1] + .05), r, rot) for _, ft, rot in LEGS[P['legs']])
    arm = lambda sh, a: limb(f'M{p(*sh)} Q{p(*a[0])} {p(*a[1])}', w)
    hands = lambda a: hand(*xy(*a[1]), .15 * r)
    arms = arm(SH_L, P['L']) + arm(SH_R, P['R'])
    hs = hands(P['L']) + hands(P['R'])
    prop = ''
    if P.get('racket'):
        hx, hy = xy(*P['R'][1])
        prop = (f'<path d="M{hx:.1f} {hy:.1f} L{cx + 1.50*r:.1f} {cy - .20*r:.1f}" stroke="{SHOE}" stroke-width="{.075*r:.1f}" stroke-linecap="round"/>'
                f'<g transform="translate({cx + 1.72*r:.1f} {cy - .72*r:.1f}) rotate(24)"><ellipse rx="{.36*r:.1f}" ry="{.47*r:.1f}" fill="#fff" fill-opacity=".06" stroke="{SHOE}" stroke-width="{.06*r:.1f}"/>'
                + ''.join(f'<path d="M{-.3*r:.1f} {k*.14*r:.1f} H{.3*r:.1f}" stroke="{SHOE}" stroke-width="{.012*r:.1f}" opacity=".5"/>' for k in range(-2, 3))
                + ''.join(f'<path d="M{k*.14*r:.1f} {-.4*r:.1f} V{.4*r:.1f}" stroke="{SHOE}" stroke-width="{.012*r:.1f}" opacity=".5"/>' for k in range(-2, 3)) + '</g>'
                + hand(hx, hy, .15 * r))
    z = ''
    if mood == 'sleep':
        z = ''.join(f'<text x="{cx + (1.05 + i*.22)*r:.1f}" y="{cy - (.55 + i*.38)*r:.1f}" font-family="{SERIF}" font-weight="700" font-size="{(.26 + i*.1)*r:.0f}" fill="#F7EBD6" opacity="{.85 - i*.15:.2f}">z</text>' for i in range(3))
    back = legs + ('' if P.get('front') else arms + hs)
    front = (arms + hs) if P.get('front') else ''
    sh = f'<ellipse cx="{cx + .06*r:.1f}" cy="{gy:.1f}" rx="{(.95 - lift*.5)*r:.1f}" ry="{.11*r:.1f}" fill="#000" opacity="{.38 - lift*.4:.2f}" filter="url(#{shadow_blur})"/>'
    s = r / 118
    return (sh + f'<g transform="rotate({tilt} {cx} {cy})">{back}{ball(id, cx, cy, r)}{face2(cx + .04*r, cy + .06*r, s, mood, look)}{front}{prop}</g>{z}')
