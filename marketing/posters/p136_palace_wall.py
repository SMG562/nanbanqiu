from lib import *
from lin import DEFS, blob, ink, glow, wash, poem, seal

META = dict(
    id=136, slug='palace-wall', title='绕了半圈', lines=['球场在墙那边，', '绕了半圈。'],
    style=['宫墙', '云天', '透视', '光亮'], tone='亮色', demo=False,
    concept='一道朱红宫墙从画面右边顶天立地地压过来，金黄琉璃瓦顶一路收向远方；墙头探出一树金黄银杏，头上是一大片蓝天白云；墙根下一个人背着球拍走着，影子拖在石板路上',
    use='找球场 / 走过去的路；红墙金瓦蓝天的大俗大雅',
)


def svg():
    r = random.Random(136)
    VX, VY = 150, 760                                                                                        # 消失点
    p = [f'<defs>{DEFS}<linearGradient id="sk136" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C78C8"/><stop offset=".7" stop-color="#7CB8E6"/><stop offset="1" stop-color="#CFE6F4"/></linearGradient>'
         '<linearGradient id="wl136" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#B8302A"/><stop offset="1" stop-color="#D86A50"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk136)"/>']
    cl = []
    for cx, cy, s in [(680, 150, .8), (300, 470, .6)]:
        for _ in range(int(14 * s) + 6):
            cl.append(blob(r, cx + r.uniform(-170, 170) * s, cy + r.uniform(0, 60) * s, r.uniform(60, 100) * s, r.uniform(36, 60) * s, '#D2E2EE', .95))
        for _ in range(int(20 * s) + 6):
            cl.append(blob(r, cx + r.uniform(-160, 160) * s, cy + r.uniform(-70, 30) * s, r.uniform(50, 90) * s, r.uniform(36, 66) * s, '#FFFFFF', .97))
    p.append('<g filter="url(#paint2)">' + ''.join(cl) + '</g>')
    p.append(f'<path d="M0 {VY+40} L1080 {VY+40} L1080 1350 L0 1350Z" fill="#E4DCC8"/>')                         # 石板路
    for k in range(1, 14):
        y = VY + 40 + (1350 - VY) * (k / 13) ** 1.8
        p.append(f'<line x1="0" y1="{y:.0f}" x2="1080" y2="{y:.0f}" stroke="#C8BEA6" stroke-width="1.5"/>')
    for k in range(-6, 14):
        p.append(f'<line x1="{VX}" y1="{VY+40}" x2="{VX + k * 160}" y2="1350" stroke="#C8BEA6" stroke-width="1.2"/>')
    # 银杏：墙后探出来
    tr = []
    for _ in range(260):
        a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random())
        tr.append(blob(r, 560 + 260 * d * math.cos(a), 470 + 170 * d * math.sin(a), r.uniform(12, 24), r.uniform(9, 16), r.choice(['#F2C230', '#F6D458', '#E8A820', '#FBE38A']), .97))
    p.append('<g filter="url(#paint2)">' + ''.join(tr) + '</g>')
    # 宫墙：右边近、左边远
    p.append(f'<path d="M1080 330 L{VX} {VY-60} L{VX} {VY+40} L1080 1240Z" fill="url(#wl136)"/>')
    p.append(f'<path d="M1080 330 L{VX} {VY-60} L{VX} {VY+40} L1080 1240Z" fill="#000" opacity=".0"/>')
    for k in range(8):                                                                                       # 墙面刷痕
        t = r.uniform(.05, .95)
        p.append(f'<path d="M1080 {330 + 910 * t:.0f} L{VX} {VY - 60 + 100 * t:.0f}" stroke="#A82A24" stroke-width="{r.uniform(2, 6):.0f}" opacity=".25"/>')
    p.append(f'<path d="M1080 1240 L{VX} {VY+40} L{VX} {VY+46} L1080 1290Z" fill="#8A2A22"/>')                    # 墙基
    p.append(f'<path d="M1080 250 L{VX-14} {VY-80} L{VX} {VY-60} L1080 330Z" fill="#E8B23A"/>')                    # 琉璃瓦顶
    p.append(f'<path d="M1080 250 L{VX-14} {VY-80} L{VX-10} {VY-86} L1080 226Z" fill="#C88A22"/>')
    for k in range(40):
        t = (k / 40) ** 1.6
        x = 1080 - (1080 - VX) * t
        y1, y2 = 250 + (VY - 80 - 250) * t, 330 + (VY - 60 - 330) * t
        p.append(f'<line x1="{x:.0f}" y1="{y1:.0f}" x2="{x:.0f}" y2="{y2:.0f}" stroke="#B8781A" stroke-width="{max(1, 4 * (1 - t)):.1f}"/>')
    # 人：墙根下走着，背着球拍，影子拖在地上
    px, py = 470, 990
    p.append(f'<path d="M{px-6} {py} L{px-120} {py+26} L{px-112} {py+32} L{px+6} {py+4}Z" fill="#8A8070" opacity=".45"/>')
    fig = [ink([(px - 4, py), (px - 2, py - 26), (px, py - 46)], 7, '#2A2420', 1, (.1, .1)), ink([(px + 8, py), (px + 4, py - 26), (px + 2, py - 46)], 7, '#2A2420', 1, (.1, .1)),
           ink([(px + 1, py - 44), (px, py - 70), (px + 2, py - 88)], 20, '#FFFFFF', 1, (.3, .3)), f'<circle cx="{px+2}" cy="{py-100}" r="9" fill="#2A2420"/>',
           ink([(px - 8, py - 86), (px - 14, py - 112)], 4, '#2A2420', 1, (0, 0)), f'<ellipse cx="{px-16}" cy="{py-124}" rx="8" ry="13" fill="none" stroke="#2A2420" stroke-width="3"/>']
    p.append('<g filter="url(#paint2)">' + ''.join(fig) + '</g>')
    txt, xl, yb = poem(META['lines'], 200, 110, 40, '#FFFFFF')
    p.append(txt)
    p.append(seal(xl - 38, yb + 32, 28))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08))
    return page(''.join(p))
