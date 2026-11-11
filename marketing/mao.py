"""小毛：南伴球的角色（一颗戴头带、半睁眼、嘴硬心软的荧光网球）。
不画腮红、不为萌而萌；表情都是打过球的人才懂的小毛病。
mao(id, cx, cy, r, mood, style) 返回 SVG 片段；style: flat 扁平 / real 写实 / chalk 粉笔。
mood: flat 平时 / wait 等人 / knee 膝盖有意见 / down 袜子红了 / snap 断线了 / resched 改期 / calm 赢了假装淡定
"""
from lib import *

LIME, CREAM, INK = '#C6EA3D', '#F7EBD6', '#0B3B2A'


def _drop(x, y, k):
    return (f'<path transform="translate({x:.1f} {y:.1f}) scale({k:.2f})" '
            f'd="M0 -14 C7 -3 10 4 0 10 C-10 4 -7 -3 0 -14 Z" fill="#BFE6F2" opacity=".95"/>')


def mao_face(cx, cy, u, mood='flat', ink=INK, paper='#FFF8E6'):
    """脸中心 (cx,cy)，u = 球半径 / 100。"""
    e = 26 * u
    sw = f'stroke="{ink}" stroke-width="{5.5*u:.1f}" stroke-linecap="round" stroke-linejoin="round" fill="none"'
    f = lambda v: f'{v:.1f}'

    def dot(x):
        return f'<circle cx="{f(x)}" cy="0" r="{f(7.5*u)}" fill="{ink}"/>'

    def lid(x):  # 半睁眼：平的上沿 + 圆的下沿
        return (f'<path d="M{f(x-10*u)} {f(-1*u)} A{f(10*u)} {f(10*u)} 0 0 0 {f(x+10*u)} {f(-1*u)} Z" fill="{ink}"/>'
                f'<path d="M{f(x-13*u)} {f(-1*u)} H{f(x+13*u)}" {sw}/>')

    def eye(x, lx=0, ly=0, pr=5.5, sr=11):  # 睁眼：眼白 + 瞳孔，可以斜着看
        return (f'<circle cx="{f(x)}" cy="0" r="{f(sr*u)}" fill="{paper}" stroke="{ink}" stroke-width="{f(3*u)}"/>'
                f'<circle cx="{f(x+lx*5*u)}" cy="{f(ly*5*u)}" r="{f(pr*u)}" fill="{ink}"/>')

    def shut(x):  # 闭眼，一条线
        return f'<path d="M{f(x-11*u)} 0 H{f(x+11*u)}" {sw}/>'

    def brow(x1, y1, x2, y2):
        return f'<path d="M{f(x1*u)} {f(y1*u)} L{f(x2*u)} {f(y2*u)}" {sw}/>'

    flat_mouth = f'<path d="M{f(-12*u)} {f(34*u)} H{f(12*u)}" {sw}/>'
    g = ''
    if mood == 'wait':      # 假装没在等：余光瞟向门口
        g = eye(-e, 1, -.6) + eye(e, 1, -.6) + f'<path d="M{f(-9*u)} {f(34*u)} H{f(15*u)}" {sw}/>'
    elif mood == 'knee':    # 膝盖有意见：八字眉 + 波浪嘴
        g = (lid(-e) + lid(e) + brow(-38, -18, -14, -28) + brow(14, -28, 38, -18) +
             f'<path d="M{f(-18*u)} {f(34*u)} q{f(6*u)} {f(-7*u)} {f(12*u)} 0 t{f(12*u)} 0 t{f(12*u)} 0" {sw}/>')
    elif mood == 'down':    # 袜子红了：低头叹气
        g = lid(-e) + lid(e) + f'<path d="M{f(-8*u)} {f(36*u)} H{f(8*u)}" {sw}/>'
    elif mood == 'snap':    # 断线了：眼睛睁大，嘴张成小圆
        g = (eye(-e, 0, 0, 3.5, 12) + eye(e, 0, 0, 3.5, 12) + brow(-38, -24, -14, -24) + brow(14, -24, 38, -24) +
             f'<circle cx="0" cy="{f(37*u)}" r="{f(6.5*u)}" {sw}/>')
    elif mood == 'resched':  # 改期：眼神躲闪，嘴角发抖，一滴汗
        g = (eye(-e, -1, -.8) + eye(e, -1, -.8) + _drop(-e - 34 * u, -22 * u, u * .9) +
             f'<path d="M{f(-12*u)} {f(35*u)} q{f(6*u)} {f(-6*u)} {f(12*u)} 0 t{f(12*u)} 0" {sw}/>')
    elif mood == 'calm':    # 赢了假装淡定：闭眼，歪嘴，一滴汗出卖了它
        g = (shut(-e) + shut(e) + _drop(e + 36 * u, -26 * u, u * .9) +
             f'<path d="M{f(-14*u)} {f(36*u)} H{f(4*u)} Q{f(14*u)} {f(36*u)} {f(19*u)} {f(27*u)}" {sw}/>')
    else:                   # flat：平时，两个点一条线
        g = dot(-e) + dot(e) + flat_mouth
    return f'<g transform="translate({cx:.1f} {cy:.1f})">{g}</g>'


def _band(cx, cy, r, cid, tilt, blow, chalk):
    y1, y2, sag = -.64 * r, -.40 * r, .10 * r
    d = (f'M{-1.1*r:.1f} {y1:.1f} Q0 {y1+sag:.1f} {1.1*r:.1f} {y1:.1f} '
         f'L{1.1*r:.1f} {y2:.1f} Q0 {y2+sag:.1f} {-1.1*r:.1f} {y2:.1f} Z')
    if blow:  # 风大：两条带子被吹得很平
        t1, t2 = (-.84, -.52, -1.40, -.66, -1.36, -.50), (-.84, -.45, -1.44, -.42, -1.34, -.30)
    else:
        t1, t2 = (-.84, -.52, -1.16, -.66, -1.10, -.46), (-.84, -.45, -1.18, -.36, -1.06, -.24)
    tail = lambda t: f'M{t[0]*r:.1f} {t[1]*r:.1f} L{t[2]*r:.1f} {t[3]*r:.1f} L{t[4]*r:.1f} {t[5]*r:.1f} Z'
    fill = f'fill="{CREAM}" fill-opacity=".28" stroke="{CREAM}" stroke-width="{.05*r:.1f}" stroke-linejoin="round"' if chalk else f'fill="{CREAM}"'
    return (f'<g transform="translate({cx} {cy})"><clipPath id="{cid}"><circle r="{r}"/></clipPath>'
            f'<g clip-path="url(#{cid})"><g transform="rotate({tilt})"><path d="{d}" {fill}/></g></g>'
            f'<g transform="rotate({tilt})"><path d="{tail(t1)}" {fill}/><path d="{tail(t2)}" {fill}/></g></g>')


def mao(id, cx, cy, r, mood='flat', style='flat', rot=-10, tilt=-4, blow=False):
    u = r / 100
    if style == 'real':
        base = ball(id, cx, cy, r, rot=-22)
        ink, paper = INK, '#FFF8E6'
    elif style == 'chalk':
        ticks = ''.join(
            f'<path d="M{(r*1.0)*math.cos(a):.1f} {(r*1.0)*math.sin(a):.1f} L{(r*random.uniform(1.025,1.07))*math.cos(a):.1f} {(r*random.uniform(1.025,1.07))*math.sin(a):.1f}"/>'
            for a in [i * math.pi * 2 / 64 + random.uniform(-.03, .03) for i in range(64)])
        seams = (f'<path d="M-72 -70 C-44 -34 -44 34 -72 70"/><path d="M72 -70 C44 -34 44 34 72 70"/>')
        base = (f'<g transform="translate({cx} {cy})"><circle r="{r}" fill="{LIME}" fill-opacity=".38" stroke="{LIME}" stroke-width="{.07*r:.1f}"/>'
                f'<g fill="none" stroke="{LIME}" stroke-width="{.028*r:.1f}" stroke-linecap="round" opacity=".7">{ticks}</g>'
                f'<clipPath id="mc{id}"><circle r="{r}"/></clipPath><g clip-path="url(#mc{id})"><g transform="rotate({rot}) scale({u})" fill="none" stroke="{CREAM}" stroke-width="7" stroke-linecap="round" opacity=".55">{seams}</g></g></g>')
        ink, paper = CREAM, 'none'
    else:
        base = (f'<g transform="translate({cx} {cy})"><circle r="{r}" fill="{LIME}"/>'
                f'<clipPath id="mf{id}"><circle r="{r}"/></clipPath><g clip-path="url(#mf{id})"><g transform="rotate({rot}) scale({u})" fill="none" stroke="{CREAM}" stroke-width="8" stroke-linecap="round">'
                f'<path d="M-72 -70 C-44 -34 -44 34 -72 70"/><path d="M72 -70 C44 -34 44 34 72 70"/></g>'
                f'<radialGradient id="sh{id}" cx=".32" cy=".28" r=".95"><stop offset=".55" stop-color="#0B3B2A" stop-opacity="0"/><stop offset="1" stop-color="#0B3B2A" stop-opacity=".28"/></radialGradient>'
                f'<circle r="{r}" fill="url(#sh{id})"/></g></g>')
        ink, paper = INK, '#FFF8E6'
    return base + _band(cx, cy, r, f'mb{id}', tilt, blow, style == 'chalk') + mao_face(cx, cy + .10 * r, u, mood, ink, paper)
