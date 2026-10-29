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
            f'<path d="M{-.15*r:.1f} {.035*r:.1f} Q0 {.075*r:.1f} {.15*r:.1f} {.035*r:.1f}" fill="none" stroke="{PEN}" stroke-width="{w*.6:.2f}" stroke-linecap="round"/></g>')


SH_L, SH_R = (-.93, .12), (.93, .12)
DOWN_L, DOWN_R = ((-1.38, .45), (-1.24, .86)), ((1.38, .45), (1.24, .86))
POSES = {
    'wave':   dict(L=DOWN_L, R=((1.62, .0), (1.44, -.80)), legs='stand', sparks='wave'),
    'cheer':  dict(L=((-1.58, -.05), (-1.36, -1.00)), R=((1.58, -.05), (1.36, -1.00)), legs='jump', lift=.26, sparks='cheer'),
    'plead':  dict(L=((-.62, .62), (-.15, .82)), R=((.62, .62), (.15, .82)), front=True, legs='stand'),
    'racket': dict(L=DOWN_L, R=((1.40, .36), (1.30, .30)), legs='stand', racket=True),
    'wow':    dict(L=((-1.52, .25), (-1.68, -.32)), R=((1.52, .25), (1.68, -.32)), legs='step', sparks='wow'),
    'sorry':  dict(L=DOWN_L, R=((1.55, -.55), (.56, -1.06)), legs='stand'),
    'sleep':  dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=-9, zz=True),
}
LEGS = {  # (髋, 控制点, 脚踝, 鞋的角度)
    'stand': [((-.34, .92), (-.42, 1.14), (-.40, 1.38), 6), ((.34, .92), (.42, 1.14), (.40, 1.38), -6)],
    'jump':  [((-.32, .92), (-.52, 1.06), (-.62, 1.22), 24), ((.32, .92), (.52, 1.02), (.60, 1.16), -24)],
    'step':  [((-.34, .92), (-.42, 1.14), (-.40, 1.38), 6), ((.34, .92), (.60, 1.0), (.66, 1.16), -26)],
}


def figure3(id, cx, cy, r, pose='wave', mood='happy', tilt=None, lift=None, look=0, soft=True):
    P = POSES[pose]
    tilt = P.get('tilt', 0) if tilt is None else tilt
    lift = P.get('lift', 0) if lift is None else lift
    gy = cy + 1.53 * r
    cy = cy - lift * r
    w = max(2.2, .034 * r)
    p = lambda x, y: f'{cx + x * r:.1f} {cy + y * r:.1f}'
    xy = lambda x, y: (cx + x * r, cy + y * r)
    legs = ''.join(pen(f'M{p(*h)} Q{p(*c)} {p(*a)}', w) for h, c, a, _ in LEGS[P['legs']]) + \
        ''.join(shoe3(*xy(a[0] + (.06 if a[0] > 0 else -.06), a[1] + .06), r, w * .9, rot) for _, _, a, rot in LEGS[P['legs']])
    arm = lambda sh, a: pen(f'M{p(*sh)} Q{p(*a[0])} {p(*a[1])}', w) + hand3(*xy(*a[1]), r, w * .9)
    arms = arm(SH_L, P['L']) + arm(SH_R, P['R'])
    extra = ''
    if P.get('racket'):
        hx, hy = xy(*P['R'][1])
        hx2, hy2 = cx + 1.52 * r, cy - .22 * r
        extra = (pen(f'M{hx:.1f} {hy:.1f} L{hx2:.1f} {hy2:.1f}', w)
                 + f'<g transform="translate({cx + 1.78*r:.1f} {cy - .78*r:.1f}) rotate(24)"><ellipse rx="{.38*r:.1f}" ry="{.50*r:.1f}" fill="#fff" fill-opacity=".35" stroke="{PEN}" stroke-width="{w:.2f}"/>'
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
        hx, hy = xy(1.44, -.80)
        for k, rad in enumerate((.20, .32)):
            extra += pen(f'M{hx + rad*r:.1f} {hy - .14*r:.1f} Q{hx + (rad+.07)*r:.1f} {hy:.1f} {hx + rad*r:.1f} {hy + .14*r:.1f}', w * .8)
    elif sp == 'wow':
        for a in (-125, -90, -55):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            extra += pen(f'M{cx + ca*1.12*r:.1f} {cy + sa*1.12*r:.1f} L{cx + ca*1.30*r:.1f} {cy + sa*1.30*r:.1f}', w * .8)
    z = ''
    if P.get('zz'):
        for i in range(3):
            s = (.16 + i * .06) * r
            ox, oy = cx + (1.10 + i * .26) * r, cy - (.60 + i * .40) * r
            z += pen(f'M{ox:.1f} {oy:.1f} H{ox + s:.1f} L{ox:.1f} {oy + s:.1f} H{ox + s:.1f}', w * .75)
    ground = pen(f'M{cx - .95*r:.1f} {gy:.1f} Q{cx - .3*r:.1f} {gy - .035*r:.1f} {cx + .15*r:.1f} {gy:.1f} T{cx + .95*r:.1f} {gy - .004*r:.1f}', w * .7, .55)
    soft_sh = f'<ellipse cx="{cx + .05*r:.1f}" cy="{gy:.1f}" rx="{(.85 - lift*.4)*r:.1f}" ry="{.09*r:.1f}" fill="#0B3B2A" opacity="{.16 - lift*.2:.2f}" filter="url(#{"bl6" if r < 80 else "bl14"})"/>' if soft else ''
    s = r / 118
    limbs = f'<g filter="url(#rough2)">{legs}{arms if not P.get("front") else ""}</g>'
    gnd = f'<g filter="url(#rough2)">{ground}</g>'
    front = f'<g filter="url(#rough2)">{arms}</g>' if P.get('front') else ''
    marks = f'<g filter="url(#rough2)">{extra}{z}</g>'
    return soft_sh + gnd + f'<g transform="rotate({tilt} {cx} {cy})">{limbs}{ball(id, cx, cy, r)}{face2(cx + .04*r, cy + .06*r, s, mood, look, ink=PEN)}{front}{marks}</g>'
