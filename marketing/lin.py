"""水墨重彩画风工具（85–88 号用）：方形画芯 + 深绿装裱、粉彩色块、粗细变化的墨线、印章。
做法：画芯里的形状都是不规则色块 blob() 和墨线 ink()，整组套 paint 滤镜（边缘抖动）+ 纸纹；
画芯固定在 (X0,Y0) 边长 S，画芯外是装裱和文字。每张用自己的 random.Random(seed)。
"""
import math
from lib import W, H, SERIF, SANS, C, wordmark

X0, Y0, S = 70, 70, 940          # 方形画芯

DEFS = '''
<filter id="paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="11"/></filter>
<filter id="paint2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="12" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
<filter id="dry" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9 .04" numOctaves="2" seed="13" result="t"/><feColorMatrix in="t" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
<filter id="canvas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="21" result="n"/><feDiffuseLighting in="n" surfaceScale="1.6" lighting-color="#fff"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting></filter>
'''


def blob(rng, cx, cy, rx, ry, fill, op=1, rot=0, jag=.22, n=9):
    """不规则粉彩色块：随机半径的闭合曲线。"""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-.2, .2)
        k = 1 + rng.uniform(-jag, jag)
        x, y = rx * k * math.cos(a), ry * k * math.sin(a)
        r = math.radians(rot)
        pts.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    mids = [((pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2) for i in range(n)]
    d = f'M{mids[-1][0]:.1f} {mids[-1][1]:.1f}' + ''.join(f' Q{pts[i][0]:.1f} {pts[i][1]:.1f} {mids[i][0]:.1f} {mids[i][1]:.1f}' for i in range(n))
    return f'<path d="{d}Z" fill="{fill}" opacity="{op}"/>'


def _bez(p, t):
    """多点 Catmull-Rom 取点。"""
    n = len(p) - 1
    s = min(int(t * n), n - 1)
    u = t * n - s
    p0, p1, p2, p3 = p[max(s - 1, 0)], p[s], p[s + 1], p[min(s + 2, n)]
    return tuple(.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u ** 3) for k in (0, 1))


def ink(pts, w, color='#111', op=1, taper=(.25, .15), steps=40, press=None):
    """一笔墨线：中间粗、两头收（taper=起笔/收笔长度比例），press(t) 可自定粗细曲线。"""
    L, R = [], []
    for i in range(steps + 1):
        t = i / steps
        x, y = _bez(pts, t)
        x2, y2 = _bez(pts, min(t + .01, 1)) if t < 1 else _bez(pts, t)
        x1, y1 = _bez(pts, max(t - .01, 0))
        dx, dy = x2 - x1, y2 - y1
        l = math.hypot(dx, dy) or 1
        if press:
            k = press(t)
        else:
            k = min(1, t / taper[0] if taper[0] else 1, (1 - t) / taper[1] if taper[1] else 1)
            k = .18 + .82 * math.sin(k * math.pi / 2)
        hw = w * k / 2
        L.append((x - dy / l * hw, y + dx / l * hw))
        R.append((x + dy / l * hw, y - dx / l * hw))
    poly = L + R[::-1]
    return f'<path d="M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in poly) + f'Z" fill="{color}" opacity="{op}"/>'


def seal(x, y, s=58, text=('南', '伴')):
    """朱红小方印（白文）：画芯角落的落款印。"""
    return f'''<g transform="translate({x} {y})" filter="url(#paint2)"><rect width="{s}" height="{s*1.5:.0f}" rx="3" fill="#B8322A"/>
<text x="{s/2}" y="{s*.62:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{s*.56:.0f}" fill="#F3E6CC">{text[0]}</text>
<text x="{s/2}" y="{s*1.3:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{s*.56:.0f}" fill="#F3E6CC">{text[1]}</text></g>'''


def gball(cx, cy, r, rot=-20, id='g'):
    """粉彩画法的网球：平涂荧光黄绿 + 一笔暗部 + 两道奶白球缝（随画面一起抖动）。"""
    return f'''<g transform="translate({cx} {cy}) rotate({rot})"><clipPath id="gb{id}"><circle r="{r}"/></clipPath>
<circle r="{r}" fill="#C6EA3D"/><g clip-path="url(#gb{id})"><circle cx="{r*.35:.1f}" cy="{r*.4:.1f}" r="{r*.95:.1f}" fill="#8DB424" opacity=".55"/><circle cx="{-r*.3:.1f}" cy="{-r*.35:.1f}" r="{r*.45:.1f}" fill="#E8FA7A" opacity=".6"/>
<path d="M{-r*.67:.1f} {-r*.74:.1f} C{-r*.3:.1f} {-r*.34:.1f} {-r*.3:.1f} {r*.34:.1f} {-r*.67:.1f} {r*.74:.1f} M{r*.67:.1f} {-r*.74:.1f} C{r*.3:.1f} {-r*.34:.1f} {r*.3:.1f} {r*.34:.1f} {r*.67:.1f} {r*.74:.1f}" fill="none" stroke="#F7F3DC" stroke-width="{r*.11:.1f}" stroke-linecap="round"/></g></g>'''


def frame(painting, caption, tagtext, sid):
    """装裱：深绿底 + 画芯（套 paint 滤镜和纸纹）+ 下方一句话 + 字标。"""
    return f'''<defs>{DEFS}<clipPath id="pc{sid}"><rect x="{X0}" y="{Y0}" width="{S}" height="{S}"/></clipPath>
<linearGradient id="mt{sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E4431"/><stop offset="1" stop-color="#062419"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#mt{sid})"/>
<rect x="{X0-4}" y="{Y0+10}" width="{S+8}" height="{S+6}" fill="#000" opacity=".45" filter="url(#bl14)"/>
<g clip-path="url(#pc{sid})"><g filter="url(#paint)">{painting}</g>
<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" filter="url(#canvas)" opacity=".22" style="mix-blend-mode:multiply"/></g>
<text x="84" y="1112" font-family="{SERIF}" font-weight="700" font-size="46" letter-spacing="4" fill="#F7EBD6">{caption}</text>
<text x="996" y="1112" text-anchor="end" font-family="{SANS}" font-size="16" letter-spacing="7" fill="#F7EBD6" opacity=".55">{tagtext}</text>
{wordmark(1262, '#fff', sub=False)}'''


def glow(cx, cy, rx, ry, color, op=1, blur=60):
    """一团光（大半径模糊），浓墨里透出来的亮。"""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{color}" opacity="{op}" filter="url(#bl{blur})"/>'


def wash(rng, y0, y1, colors, n=24, w=(30, 70), op=(.35, .7), x0=X0 - 200, x1=X0 + S):
    """横向湿笔铺色：长短不一的宽笔一层层压上去。"""
    out = ''
    for _ in range(n):
        y = rng.uniform(y0, y1)
        x = rng.uniform(x0, x1 - 150)
        out += ink([(x, y), (x + rng.uniform(250, 700), y + rng.uniform(-10, 10))], rng.uniform(*w), rng.choice(colors), rng.uniform(*op), (.35, .35))
    return out
