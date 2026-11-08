"""几何体育图标（156 起）：圆头 + 圆角粗杆的四肢 + 球拍，按关节坐标拼。原创图标，不照搬任何赛事的图标体系。"""

POSE = {
    # 原点在胯部，向上为负；h 头，s 肩，两手 lh/rh（rh 持拍），两肘 le/re，两膝 lk/rk，两脚 lf/rf，拍头 rk_c 和角度 ra
    'serve':    dict(h=(-8, -118), s=(-4, -88), le=(12, -118), lh=(20, -150), re=(-30, -96), rh=(-34, -128), rk_c=(-40, -170), ra=-10, lk=(8, 40), lf=(14, 86), rk=(-18, 40), rf=(-30, 84)),
    'forehand': dict(h=(14, -114), s=(8, -86), le=(-22, -80), lh=(-46, -84), re=(34, -74), rh=(62, -66), rk_c=(100, -62), ra=80, lk=(34, 36), lf=(52, 84), rk=(-26, 40), rf=(-50, 82)),
    'backhand': dict(h=(-10, -114), s=(-6, -86), le=(-30, -70), lh=(-50, -60), re=(-28, -74), rh=(-52, -64), rk_c=(-94, -56), ra=-80, lk=(-28, 38), lf=(-46, 84), rk=(24, 40), rf=(46, 84)),
    'volley':   dict(h=(12, -116), s=(8, -88), le=(-16, -86), lh=(-30, -104), re=(36, -98), rh=(54, -112), rk_c=(80, -134), ra=40, lk=(26, 36), lf=(30, 84), rk=(-20, 38), rf=(-30, 84)),
    'smash':    dict(h=(-4, -118), s=(0, -88), le=(26, -118), lh=(30, -150), re=(-26, -110), rh=(-16, -144), rk_c=(-6, -186), ra=10, lk=(26, 20), lf=(10, 56), rk=(-22, 24), rf=(-44, 52)),
    'wait':     dict(h=(0, -118), s=(0, -88), le=(18, -60), lh=(14, -76), re=(-14, -58), rh=(4, -78), rk_c=(-40, 30), ra=0, lk=(8, 40), lf=(10, 86), rk=(-8, 40), rf=(-12, 86)),
    'pick':     dict(h=(48, -74), s=(30, -64), le=(46, -30), lh=(54, 6), re=(20, -30), rh=(10, -6), rk_c=(-60, 40), ra=60, lk=(18, 40), lf=(20, 86), rk=(-10, 40), rf=(-14, 86)),
    'cheer':    dict(h=(0, -118), s=(0, -88), le=(-26, -114), lh=(-38, -150), re=(26, -114), rh=(38, -150), rk_c=(48, -190), ra=20, lk=(10, 40), lf=(14, 86), rk=(-10, 40), rf=(-14, 86)),
}


def picto(cx, cy, s=1.0, pose='serve', color='#1D2440', flip=1, racket=True, w=20):
    P = POSE[pose]
    T = lambda p: (cx + p[0] * s * flip, cy + p[1] * s)
    def bar(a, b, k=1.0):
        (x1, y1), (x2, y2) = T(a), T(b)
        return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{w * s * k:.1f}" stroke-linecap="round"/>'
    o = [bar((0, 0), P['s'], 1.25)]
    o += [bar(P['s'], P['le']), bar(P['le'], P['lh']), bar(P['s'], P['re']), bar(P['re'], P['rh'])]
    o += [bar((0, 0), P['lk'], 1.1), bar(P['lk'], P['lf'], 1.1), bar((0, 0), P['rk'], 1.1), bar(P['rk'], P['rf'], 1.1)]
    hx, hy = T(P['h'])
    o.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{15 * s:.1f}" fill="{color}"/>')
    if racket and pose not in ('wait', 'pick'):
        rx, ry = T(P['rh'])
        kx, ky = T(P['rk_c'])
        o.append(f'<line x1="{rx:.1f}" y1="{ry:.1f}" x2="{rx + (kx - rx) * .5:.1f}" y2="{ry + (ky - ry) * .5:.1f}" stroke="{color}" stroke-width="{7 * s:.1f}" stroke-linecap="round"/>')
        o.append(f'<ellipse cx="{kx:.1f}" cy="{ky:.1f}" rx="{16 * s:.1f}" ry="{22 * s:.1f}" transform="rotate({P["ra"] * flip} {kx:.1f} {ky:.1f})" fill="none" stroke="{color}" stroke-width="{7 * s:.1f}"/>')
    return ''.join(o)
