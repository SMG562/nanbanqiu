from lib import *
from lin import DEFS, blob, ink, gball, glow, wash

META = dict(
    id=122, slug='qinglv-summit', title='有人比我早', lines=['爬到山顶，', '发现有人比我早。'],
    style=['青绿山水', '自然', '天地', '光亮'], tone='亮色', demo=False,
    concept='借王希孟青绿山水的设色和格局：一层层石青石绿的山峰，峰顶青、山脚赭金，山腰白云横过；半山一块小平台上有块球场，两个人已经在打——人只有米粒大，天地占满画面',
    use='户外 / 周末远一点的球场；天地很大，人在里面很自在',
)


def peak(r, cx, base, h, w, gid):
    pts = []
    n = 22
    for i in range(n + 1):
        t = -1 + 2 * i / n
        k = (1 - abs(t)) ** 1.5 * (1 + .18 * math.sin(t * 9 + cx)) + r.uniform(-.03, .03)
        y = base - h * max(0, k) if 0 < i < n else base
        pts.append((cx + w * t, y))
    mids = [((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) for i in range(n)]
    d = f'M{pts[0][0]:.0f} 1240 L{pts[0][0]:.0f} {base}' + ''.join(f' Q{pts[i][0]:.0f} {pts[i][1]:.0f} {mids[i][0]:.0f} {mids[i][1]:.0f}' for i in range(1, n)) + f' L{pts[-1][0]:.0f} {base} L{pts[-1][0]:.0f} 1240Z'
    return f'<path d="{d}" fill="url(#{gid})"/>'


def svg():
    r = random.Random(122)
    grads = ''
    for gid, top, mid in [('pa', '#6E9EC4', '#9CC8B4'), ('pb', '#2F6FA8', '#46A486'), ('pc', '#1C5A92', '#2E9474')]:
        grads += (f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
                  f'<stop offset=".45" stop-color="{mid}"/><stop offset="1" stop-color="#E2C68A"/></linearGradient>')
    p = [f'<defs>{DEFS}{grads}<linearGradient id="sk122" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DFAE"/><stop offset="1" stop-color="#FCF6E4"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk122)"/>', glow(820, 330, 200, 160, '#FFFFFF', .9)]
    g = []
    for cx, base, h, w in [(200, 800, 330, 320), (560, 780, 340, 300), (920, 800, 330, 330)]:   # 远峰
        g.append(peak(r, cx, base, h, w, 'pa'))
    g.append(glow(540, 760, 560, 60, '#FFFFFF', .95, 28))
    for cx, base, h, w in [(60, 1040, 480, 340), (780, 1020, 560, 340), (1080, 1060, 400, 240)]:  # 主峰
        g.append(peak(r, cx, base, h, w, 'pb'))
    g.append(glow(560, 900, 600, 70, '#FFFFFF', .95, 28))                                        # 山腰白云
    g.append(glow(300, 940, 300, 40, '#FFFFFF', .9, 14))
    for cx, base, h, w in [(410, 1200, 222, 300), (1000, 1220, 230, 300)]:                       # 近峰，最浓
        g.append(peak(r, cx, base, h, w, 'pc'))
    # 平台和球场：在中间近峰的肩上
    g.append('<path d="M290 960 C330 944 500 940 540 956 L548 990 C470 1000 360 1000 284 992Z" fill="#D8BC78"/>')
    g.append('<path d="M326 954 L506 950 L518 972 L316 976Z" fill="#3E9C6E"/>')
    for a, b in [((326, 954), (506, 950)), ((506, 950), (518, 972)), ((518, 972), (316, 976)), ((316, 976), (326, 954)), ((321, 964), (512, 960))]:
        g.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#FFFBEE" stroke-width="1.8"/>')
    g.append('<line x1="416" y1="952" x2="417" y2="974" stroke="#1B2A22" stroke-width="2"/>')
    for x, y in [(360, 960), (470, 956)]:
        g.append(f'<rect x="{x-2.5}" y="{y-14}" width="5" height="14" rx="2.5" fill="#FFFFFF"/><circle cx="{x}" cy="{y-18}" r="3.4" fill="#2A1E14"/>')
    g.append('<circle cx="428" cy="940" r="3" fill="#C6EA3D"/>')
    g.append(ink([(250, 1180), (320, 1110), (280, 1040), (300, 990)], 3, '#F6E9C8', .9, (0, 0)))        # 上山小路
    for cx, cy in [(270, 1000), (560, 1000), (230, 1080), (900, 1090), (860, 990)]:              # 松：成簇的小墨点，长在山上
        for _ in range(9):
            g.append(blob(r, cx + r.uniform(-34, 34), cy + r.uniform(-14, 14), r.uniform(3, 6), r.uniform(5, 9), r.choice(['#123E3A', '#1E5446']), .9))
    g.append(ink([(880, 640), (884, 760), (878, 880)], 4, '#FFFFFF', .85, (.1, .1)))              # 瀑布
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    p.append(f'<path d="M0 1172 C300 1150 760 1190 1080 1160 L1080 1350 L0 1350Z" fill="#1D5F72"/>')   # 江
    for _ in range(26):
        x, y = r.uniform(0, 1000), r.uniform(1190, 1340)
        p.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x+r.uniform(30, 90):.0f}" y2="{y:.0f}" stroke="#7EC0C8" stroke-width="2" opacity=".5"/>')
    p.append(tag('MOUNTAIN · SPRING', color='#0B3B2A', rule='#C2410C'))
    p.append(headline(META['lines'], y=272, size=56, colors=('#0B3B2A', '#C2410C'), lh=78))
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.12, light=True))
    return page(''.join(p))
