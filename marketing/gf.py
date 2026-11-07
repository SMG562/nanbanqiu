"""古风海报共用：竖排字、印章、山茶、红梅、轻纱（95–97 用）。"""
from lib import *


def vcol(text, x, y, size, color, gap=1.12, weight=900, op=1):
    """一列竖排字（从上到下）；x 是这一列的中心。"""
    return ''.join(f'<text x="{x}" y="{y + i*size*gap:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="{weight}" font-size="{size}" fill="{color}" opacity="{op}">{c}</text>' for i, c in enumerate(text))


def seal(x, y, s=64, text='南伴球'):
    """朱红小方印：三字竖排（右列两字，左列一字）。"""
    a, b, c = text
    f = s * .36
    return f'''<g><rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{s*.08:.1f}" fill="#C8372D"/>
<rect x="{x+s*.07:.1f}" y="{y+s*.07:.1f}" width="{s*.86:.1f}" height="{s*.86:.1f}" rx="{s*.05:.1f}" fill="none" stroke="#F6E9DD" stroke-width="{s*.03:.1f}"/>
<text x="{x+s*.7:.1f}" y="{y+s*.47:.1f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{f:.0f}" fill="#F6E9DD">{a}</text>
<text x="{x+s*.7:.1f}" y="{y+s*.84:.1f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{f:.0f}" fill="#F6E9DD">{b}</text>
<text x="{x+s*.3:.1f}" y="{y+s*.66:.1f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{f*1.2:.0f}" fill="#F6E9DD">{c}</text></g>'''


def camellia(id, cx, cy, r, kind='red', rot=0, seed=1):
    rnd = random.Random(seed)
    if kind == 'red':
        g0, g1, edge = '#FF8A5C', '#E2402A', '#B82E1E'
    else:
        g0, g1, edge = '#FFFFFF', '#EFE7E2', '#D9CEC6'
    out = f'<defs><radialGradient id="cp{id}" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="{g1}"/><stop offset="1" stop-color="{g0}"/></radialGradient></defs>'
    out += f'<ellipse cx="{cx + r*.12:.0f}" cy="{cy + r*.18:.0f}" rx="{r*1.05:.0f}" ry="{r*.95:.0f}" fill="#1E3B22" opacity=".25" filter="url(#bl6)"/>'
    for ring, n, dist, sz in [(0, 7, .5, 1.0), (1, 6, .3, .8), (2, 5, .12, .55)]:
        for k in range(n):
            a = rot + k * 360 / n + ring * 23 + rnd.uniform(-8, 8)
            px, py = cx + r * dist * math.cos(math.radians(a)), cy + r * dist * math.sin(math.radians(a))
            rx, ry = r * .55 * sz, r * .45 * sz
            out += (f'<g transform="translate({px:.1f} {py:.1f}) rotate({a:.0f})"><ellipse rx="{rx:.1f}" ry="{ry:.1f}" fill="url(#cp{id})" stroke="{edge}" stroke-width=".8" stroke-opacity=".5"/>'
                    f'<path d="M{-rx*.6:.1f} 0 Q0 {-ry*.2:.1f} {rx*.8:.1f} 0" stroke="{edge}" stroke-width=".8" fill="none" opacity=".35"/></g>')
    out += ''.join(f'<circle cx="{cx + rnd.gauss(0, r*.08):.1f}" cy="{cy + rnd.gauss(0, r*.08):.1f}" r="{r*.045:.1f}" fill="#F4C531"/>' for _ in range(16))
    return f'<g>{out}</g>'


def leaf(cx, cy, L, a, c1='#2C6B3A', c2='#3F8A4E'):
    return (f'<g transform="translate({cx:.0f} {cy:.0f}) rotate({a:.0f})"><path d="M0 0 Q{L*.5:.0f} {-L*.36:.0f} {L:.0f} 0 Q{L*.5:.0f} {L*.36:.0f} 0 0Z" fill="{c1}"/>'
            f'<path d="M0 0 Q{L*.5:.0f} {-L*.36:.0f} {L:.0f} 0 Q{L*.5:.0f} {-L*.08:.0f} 0 0Z" fill="{c2}"/>'
            f'<path d="M{L*.08:.0f} 0 Q{L*.5:.0f} {-L*.04:.0f} {L*.92:.0f} 0" stroke="#A9D39A" stroke-width="1.2" fill="none" opacity=".7"/></g>')


def silk(pts, w0, twist=3.0, op=.82, id='s'):
    """一条飘动的轻纱：沿中线 pts（列表）铺开，宽度随扭转忽宽忽窄。"""
    n = len(pts)
    L, R = [], []
    for i, (x, y) in enumerate(pts):
        x0, y0 = pts[max(0, i - 1)]
        x1, y1 = pts[min(n - 1, i + 1)]
        dx, dy = x1 - x0, y1 - y0
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        t = i / (n - 1)
        w = w0 * (.25 + .75 * abs(math.cos(t * twist * math.pi))) * (1 - .55 * t)
        L.append((x + nx * w / 2, y + ny * w / 2)); R.append((x - nx * w / 2, y - ny * w / 2))
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in L) + ' L' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in reversed(R)) + 'Z'
    edge = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in L)
    return (f'<defs><linearGradient id="sg{id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#F2F6FB"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>'
            f'<path d="{d}" fill="#7E9CC4" opacity=".18" filter="url(#bl6)" transform="translate(10 14)"/>'
            f'<path d="{d}" fill="url(#sg{id})" opacity="{op}"/><path d="{edge}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity=".9"/>'
            f'<path d="{d}" fill="none" stroke="#C9D6E6" stroke-width=".8" opacity=".6"/>')


def wave(x0, y0, x1, y1, amp, k, n=80, ph=0):
    pts = []
    for i in range(n):
        t = i / (n - 1)
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        dx, dy = x1 - x0, y1 - y0
        d = math.hypot(dx, dy)
        x += -dy / d * amp * math.sin(t * k * math.pi + ph) * (.4 + t)
        y += dx / d * amp * math.sin(t * k * math.pi + ph) * (.4 + t)
        pts.append((x, y))
    return pts
