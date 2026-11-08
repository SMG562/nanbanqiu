"""综艺风（201 起）：立体厚字、贴纸徽章、爆炸星、手绘箭头、彩带。"""
import math
from lib import SANS, SERIF

INK = '#1E2A3A'


def block(text, x, y, size, face='#FFFFFF', side='#F28A2E', depth=14, rot=-6, outline=INK, font=None, anchor='start', ls=0):
    """立体厚字：同一行字往右下叠 depth 层做侧面，再盖一层带描边的正面。"""
    font = font or SANS
    t = lambda dx, dy, fill, extra='': (f'<text x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{anchor}" font-family="{font}" font-weight="900" font-size="{size}" letter-spacing="{ls}" fill="{fill}" {extra}>{text}</text>')
    o = ''.join(t(k * .8, k, side, f'stroke="{side}" stroke-width="{size * .06:.1f}" stroke-linejoin="round"') for k in range(depth, 0, -1))
    o += t(0, 0, face, f'stroke="{outline}" stroke-width="{size * .05:.1f}" stroke-linejoin="round" paint-order="stroke"')
    return f'<g transform="rotate({rot} {x} {y})">{o}</g>'


def burst(cx, cy, r, fill, n=14, inner=.72, rot=0):
    pts = []
    for k in range(n * 2):
        a = math.radians(rot + k * 180 / n)
        rr = r if k % 2 == 0 else r * inner
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'


def badge(x, y, w, h, text, fill='#FF5A7A', color='#FFFFFF', rot=-6, size=30):
    return (f'<g transform="rotate({rot} {x + w / 2} {y + h / 2})"><rect x="{x + 5}" y="{y + 6}" width="{w}" height="{h}" rx="{h / 2}" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{fill}" stroke="{INK}" stroke-width="4"/>'
            f'<text x="{x + w / 2}" y="{y + h / 2 + size * .36:.0f}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="{size}" fill="{color}">{text}</text></g>')


def bubble(x, y, w, h, text, tail='left', fill='#FFFFFF', size=30):
    tx = x + 40 if tail == 'left' else x + w - 40
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{fill}" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M{tx - 14} {y + h - 2} L{tx + (-20 if tail == "left" else 20)} {y + h + 30} L{tx + 14} {y + h - 2}Z" fill="{fill}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<rect x="{tx - 12}" y="{y + h - 6}" width="24" height="8" fill="{fill}"/>'
            f'<text x="{x + w / 2}" y="{y + h / 2 + size * .36:.0f}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="{size}" fill="{INK}">{text}</text>')


def arrow(x1, y1, x2, y2, c=INK):
    a = math.atan2(y2 - y1, x2 - x1)
    hx1, hy1 = x2 - 22 * math.cos(a - .5), y2 - 22 * math.sin(a - .5)
    hx2, hy2 = x2 - 22 * math.cos(a + .5), y2 - 22 * math.sin(a + .5)
    mx, my = (x1 + x2) / 2 - (y2 - y1) * .2, (y1 + y2) / 2 + (x2 - x1) * .2
    return (f'<path d="M{x1} {y1} Q{mx:.0f} {my:.0f} {x2} {y2}" stroke="{c}" stroke-width="5" fill="none" stroke-linecap="round"/>'
            f'<path d="M{hx1:.0f} {hy1:.0f} L{x2} {y2} L{hx2:.0f} {hy2:.0f}" stroke="{c}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')


def confetti(r, n=50, area=(0, 0, 1080, 1350)):
    cols = ['#FF5A7A', '#FFC93C', '#3EC6FF', '#C6EA3D', '#8A6CFF', '#FF8A3D']
    o = ''
    for _ in range(n):
        x, y = r.uniform(area[0], area[2]), r.uniform(area[1], area[3])
        o += f'<rect x="{x:.0f}" y="{y:.0f}" width="{r.uniform(10, 20):.0f}" height="{r.uniform(5, 9):.0f}" rx="2" transform="rotate({r.uniform(0, 180):.0f} {x:.0f} {y:.0f})" fill="{r.choice(cols)}"/>'
    return o
