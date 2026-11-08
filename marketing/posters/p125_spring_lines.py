from lib import *
from lin import DEFS, blob, ink

META = dict(
    id=125, slug='spring-lines', title='春天回来了', lines=['柳条一绿，', '球友就都回来了。'],
    style=['点线', '极简', '自然', '光亮'], tone='浅色', demo=False,
    concept='借吴冠中「点线面」的方法：大片留白里，右上垂下一蓬柳条，长长的墨线被风吹成一个方向的弧，线上缀着嫩绿的点，周围飘着粉、黄、红的彩点；左下几根灰线就是球场，四个人是四个小点，一颗黄绿的点是球',
    use='春天回暖、约球的人变多；轻快、透气、明亮',
)


def _pt(pts, t):
    n = len(pts) - 1
    s = min(int(t * n), n - 1)
    u = t * n - s
    return pts[s][0] + (pts[s + 1][0] - pts[s][0]) * u, pts[s][1] + (pts[s + 1][1] - pts[s][1]) * u


def svg():
    r = random.Random(125)
    p = [f'<defs>{DEFS}</defs><rect width="{W}" height="{H}" fill="#FBF8F0"/>']
    g = []
    for i in range(26):                                                                         # 柳条：从画外垂进来，被风吹向左
        x0 = 640 + i * 17 + r.uniform(-8, 8)
        L = r.uniform(380, 860) * (.6 + .4 * i / 26)
        drift = r.uniform(80, 220)
        pts = [(x0 + 40, -30), (x0 - drift * .1, L * .35), (x0 - drift * .45, L * .7), (x0 - drift, L)]
        g.append(ink(pts, r.uniform(2, 4.5), '#2A2A26', r.uniform(.55, .9), (.02, .95)))
        for _ in range(int(L / 40)):
            x, y = _pt(pts, r.uniform(.15, .98))
            g.append(blob(r, x + r.uniform(-6, 6), y, r.uniform(4, 7), r.uniform(2.2, 3.5), r.choice(['#9ACD4A', '#B8DE5A', '#6FB23E']), .9, r.uniform(20, 70)))
    for cx, cy, n in [(600, 600, 22), (820, 780, 22), (470, 820, 14), (940, 440, 16), (720, 380, 12)]:   # 彩点：一簇一簇
        for _ in range(n):
            a, d = r.uniform(0, 2 * math.pi), r.uniform(0, 120) ** .9
            g.append(f'<circle cx="{cx + d * math.cos(a):.0f}" cy="{cy + d * math.sin(a) * .8:.0f}" r="{r.uniform(3, 10):.1f}" fill="{r.choice(["#E8607A", "#F4B6C2", "#F2C12E", "#D9442E", "#7FB8E0", "#9ACD4A"])}" opacity="{r.uniform(.6, .95):.2f}"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    for d in ['M150 1000 L470 1000 L540 1080 L80 1080Z', 'M115 1040 L505 1040', 'M310 1000 L310 1080']:   # 球场：几根灰线
        p.append(f'<path d="{d}" stroke="#9A988C" stroke-width="2" fill="none"/>')
    for x, y in [(210, 1020), (410, 1018), (180, 1062), (450, 1064)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="5.5" fill="#2A2A26"/>')
    p.append('<circle cx="330" cy="1030" r="4.5" fill="#C6EA3D" stroke="#7FA21C" stroke-width="1.2"/>')
    p.append(tag('SPRING', color='#0B3B2A', rule='#9ACD4A', op=.6))
    p.append(headline(META['lines'], y=262, size=46, colors=('#0B3B2A', '#C2410C'), lh=66))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
