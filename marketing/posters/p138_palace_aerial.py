from lib import *
from lin import DEFS, blob, glow
from song import roof

META = dict(
    id=138, slug='palace-aerial', title='原来在这儿', lines=['找了半天，', '原来在这儿。'],
    style=['宫阙', '俯瞰', '图案', '光亮'], tone='亮色', demo=False,
    concept='从高处俯看一座宫城：一进又一进的金瓦大殿沿中轴排开，朱墙围出一个个院落，白石广场、成排的古树；其中一个院子不是院子，是一块绿色的球场，两个人在打——满纸的金瓦红墙，一眼找到那块绿',
    use='找球场 / 地图找场；整体观、图案感、会心一笑',
)


def svg():
    r = random.Random(138)
    p = [f'<defs>{DEFS}</defs><rect width="{W}" height="{H}" fill="#E8DFC8"/>']
    for y in range(0, 1200, 3):
        p.append(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="#D2C6A8" stroke-width=".6" opacity=".25"/>')
    # 院落网格：朱墙围合
    g = []
    cols = [60, 300, 780, 1020]
    rows = [360, 560, 760, 960, 1180]
    for y0, y1 in zip(rows, rows[1:]):
        g.append(f'<rect x="40" y="{y0}" width="1000" height="{y1 - y0}" fill="none" stroke="#B8322A" stroke-width="14"/>')
    g.append('<rect x="290" y="360" width="500" height="820" fill="#F4EEE0"/>')                                   # 中轴白石
    for x in (290, 790):
        g.append(f'<line x1="{x}" y1="360" x2="{x}" y2="1180" stroke="#B8322A" stroke-width="14"/>')
    for x in range(60, 290, 34):                                                                               # 两侧古树
        for y in range(380, 1170, 34):
            if r.random() < .55:
                g.append(blob(r, x + r.uniform(-6, 6), y + r.uniform(-6, 6), r.uniform(12, 18), r.uniform(12, 18), r.choice(['#3E7A4A', '#4E8E56', '#2E6A3E']), .95))
    for x in range(810, 1030, 34):
        for y in range(380, 1170, 34):
            if (x, y) and r.random() < .55:
                g.append(blob(r, x + r.uniform(-6, 6), y + r.uniform(-6, 6), r.uniform(12, 18), r.uniform(12, 18), r.choice(['#3E7A4A', '#4E8E56', '#2E6A3E']), .95))
    # 中轴大殿：从远到近，一殿比一殿大
    for y, w, h in [(380, 300, 90), (590, 380, 110), (990, 360, 110)]:
        g.append(f'<rect x="{540 - w*.42:.0f}" y="{y + h:.0f}" width="{w*.84:.0f}" height="{h*.35:.0f}" fill="#B8322A"/>')
        g.append(roof(540, y, w, h))
    # 第三进院子：球场
    g.append('<rect x="320" y="790" width="440" height="150" fill="#4AA484"/>')
    for d in ['M330 800 L750 800 L750 930 L330 930Z', 'M330 818 L750 818 M330 912 L750 912', 'M430 800 L430 930 M650 800 L650 930', 'M430 865 L650 865']:
        g.append(f'<path d="{d}" stroke="#FFFFFF" stroke-width="3" fill="none"/>')
    g.append('<line x1="540" y1="790" x2="540" y2="940" stroke="#1E2A22" stroke-width="4"/>')
    for x, y in [(400, 850), (690, 880)]:
        g.append(f'<circle cx="{x}" cy="{y}" r="9" fill="#2A2420"/><circle cx="{x}" cy="{y+12}" r="8" fill="#FFFFFF"/>')
    g.append('<circle cx="600" cy="858" r="5" fill="#C6EA3D" stroke="#7FA21C" stroke-width="1.2"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    # 天：上方一片云把宫城托出来
    p.append('<rect width="1080" height="360" fill="#7FB4DE"/>')
    p.append(glow(540, 368, 700, 22, '#FFFFFF', .9, 14))
    p.append(tag('FROM ABOVE', y=120, color='#FFFFFF', rule='#C6EA3D', op=.85))
    p.append(headline(META['lines'], y=236, size=50, colors=('#FFFFFF', '#FFE27A'), lh=70))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.07, light=True))
    return page(''.join(p))
