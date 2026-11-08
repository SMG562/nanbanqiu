from lib import *
from lin import DEFS, blob, ink, glow, poem, seal

META = dict(
    id=137, slug='river-panorama', title='沿着江走', lines=['沿着江走，', '就是球场。'],
    style=['宋画', '青绿山水', '天地', '光亮'], tone='亮色', demo=False,
    concept='借《千里江山图》的全景：上面一大片金色的天，几重石青石绿的山从左到右连成一片，一条大江横贯画面；江上一座长桥，桥中间一个亭子；近岸平地上一块球场，几个米粒大的人沿着江边往球场走',
    use='附近的球场 / 距离筛选；江山很大，过个桥就能打球',
)


def range_(r, y, h, colors, n, x0=-60, x1=1140, sharp=1.6):
    """一重连绵山：一串圆润又有棱的峰（和 122 同一画法）连成一片，底边压到 y+400。"""
    d = ''
    x = x0
    while x < x1:
        w = r.uniform(150, 260)
        pk = h * r.uniform(.5, 1)
        cx = x + w / 2
        pts = []
        for i in range(19):
            t = -1 + 2 * i / 18
            k = (1 - abs(t)) ** 1.5 * (1 + .18 * math.sin(t * 9 + cx)) + r.uniform(-.03, .03)
            pts.append((cx + w * .75 * t, y - pk * max(0, k)))
        d += f'M{pts[0][0]:.0f} {y + 400} ' + ' '.join(f'L{a:.0f} {b:.0f}' for a, b in pts) + f' L{pts[-1][0]:.0f} {y + 400}Z '
        x += w * .8
    return d


def svg():
    r = random.Random(137)
    grads = ''
    for gid, top, mid in [('a137', '#7FA8C8', '#A8CCB6'), ('b137', '#2E6EA6', '#4AA488'), ('c137', '#1E5C92', '#2F9676')]:
        grads += (f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".5" stop-color="{mid}"/><stop offset="1" stop-color="#E4C88A"/></linearGradient>')
    p = [f'<defs>{DEFS}{grads}<linearGradient id="sk137" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0D9A2"/><stop offset="1" stop-color="#FBF3DE"/></linearGradient>'
         '<linearGradient id="rv137" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE4DA"/><stop offset="1" stop-color="#9EC6C0"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk137)"/>', glow(300, 260, 260, 180, '#FFFFFF', .85)]
    g = [f'<path d="{range_(r, 560, 200, None, 0)}" fill="url(#a137)"/>']
    g.append(glow(540, 580, 640, 50, '#FFFFFF', .9, 28))
    g.append(f'<path d="{range_(r, 700, 300, None, 0)}" fill="url(#b137)"/>')
    for _ in range(500):                                                                                       # 石青山上的细皴
        x, y = r.uniform(0, 1080), r.uniform(420, 760)
        g.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x + r.uniform(-4, 4):.0f}" y2="{y + r.uniform(6, 14):.0f}" stroke="#174E7E" stroke-width="1.2" opacity=".18"/>')
    g.append(glow(540, 740, 640, 40, '#FFFFFF', .85, 28))
    g.append('<path d="M-20 760 C300 740 700 770 1100 750 L1100 940 C760 960 300 930 -20 950Z" fill="url(#rv137)"/>')   # 江
    for _ in range(40):
        x, y = r.uniform(0, 1060), r.uniform(770, 935)
        g.append(f'<path d="M{x:.0f} {y:.0f} q12 -4 24 0 t24 0" fill="none" stroke="#7EA8A4" stroke-width="1.4" opacity=".6"/>')
    for x, y in [(240, 820), (820, 870)]:                                                                     # 小船
        g.append(f'<path d="M{x-26} {y} L{x+26} {y} L{x+18} {y+8} L{x-18} {y+8}Z" fill="#6A4A2A"/><line x1="{x}" y1="{y}" x2="{x}" y2="{y-34}" stroke="#4A3420" stroke-width="2"/>'
                 f'<path d="M{x+2} {y-32} L{x+20} {y-6} L{x+2} {y-6}Z" fill="#F2E8D0"/>')
    # 长桥 + 亭子
    g.append('<path d="M150 900 C350 860 650 860 900 900" fill="none" stroke="#7A5A3A" stroke-width="10"/>')
    for i in range(13):
        x = 170 + i * 58
        yy = 900 - 40 * math.sin(math.pi * (x - 150) / 750)
        g.append(f'<line x1="{x:.0f}" y1="{yy:.0f}" x2="{x:.0f}" y2="{yy + 46:.0f}" stroke="#6A4A2E" stroke-width="5"/>')
    g.append('<rect x="508" y="836" width="56" height="26" fill="#B8322A"/><path d="M494 840 L536 812 L578 840Z" fill="#2E5A6A"/>')
    # 近岸：平地、村舍、柳、球场
    g.append('<path d="M-20 920 C300 900 700 930 1100 910 L1100 1200 L-20 1200Z" fill="#C8D49A"/>')
    for _ in range(9):                                                                                        # 近岸柳树
        x = r.uniform(30, 1050)
        if 600 < x < 940:
            continue
        g.append(ink([(x, 1120), (x + 4, 1040)], 7, '#4A3A28', 1, (0, .3)))
        for _ in range(9):
            g.append(blob(r, x + r.uniform(-34, 34), 1030 + r.uniform(-26, 14), r.uniform(14, 22), r.uniform(10, 16), r.choice(['#3E6E4A', '#4E8456', '#2E5A3E']), .95))
    g.append('<path d="M640 960 L900 954 L928 996 L612 1002Z" fill="#4AA484"/>')
    g.append('<path d="M640 960 L900 954 L928 996 L612 1002Z M626 980 L914 974 M770 957 L771 999" stroke="#FBF5E6" stroke-width="2.4" fill="none"/>')
    for x, y in [(700, 976), (840, 970)]:
        g.append(f'<rect x="{x-2.5}" y="{y-14}" width="5" height="14" rx="2.5" fill="#FFFFFF"/><circle cx="{x}" cy="{y-18}" r="3.4" fill="#2A2620"/>')
    g.append('<circle cx="760" cy="968" r="3.2" fill="#C6EA3D"/>')
    for x, y in [(380, 960), (410, 966), (440, 972)]:                                                          # 往桥上走的人
        g.append(f'<rect x="{x-2.5}" y="{y-14}" width="5" height="14" rx="2.5" fill="#FFFFFF"/><circle cx="{x}" cy="{y-18}" r="3.4" fill="#2A2620"/>')
    for x, y in [(160, 960), (220, 980), (980, 980), (1040, 960)]:                                            # 村舍
        g.append(f'<rect x="{x-20}" y="{y-14}" width="40" height="18" fill="#F2E8D0"/><path d="M{x-26} {y-12} L{x} {y-30} L{x+26} {y-12}Z" fill="#5A4A3A"/>')
    for _ in range(40):
        g.append(blob(r, r.uniform(0, 1080), r.uniform(940, 1060), r.uniform(4, 8), r.uniform(6, 12), r.choice(['#2E5A3E', '#3E6E4A']), .9))
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    txt, xl, yb = poem(META['lines'], 1000, 120, 42, '#3A3428')
    p.append(txt)
    p.append(seal(xl - 40, yb + 32, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
