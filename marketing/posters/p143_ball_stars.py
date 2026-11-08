from lib import *
from lin import DEFS, blob, ink, glow, poem, seal

META = dict(
    id=143, slug='ball-stars', title='满地都是星星', lines=['练完发球，', '满地都是星星。'],
    style=['意境', '黄昏', '光亮'], tone='亮色', demo=False,
    concept='黄昏，天从橙金过渡到透亮的蓝紫，最早的几颗星出来了；下面的球场上撒了一地练完发球的球，一颗颗都微微发光，和天上的星连成一片；球筐倒在一边，人坐在场边歇着',
    use='练发球 / 一个人练球；地上的星河，新的境界',
)


def svg():
    r = random.Random(143)
    p = [f'<defs>{DEFS}<linearGradient id="sk143" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4A8E"/><stop offset=".45" stop-color="#9A86C0"/><stop offset=".75" stop-color="#F6A878"/><stop offset="1" stop-color="#FFD69A"/></linearGradient>'
         '<linearGradient id="ct143" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E7EA8"/><stop offset="1" stop-color="#2E5E78"/></linearGradient></defs>',
         f'<rect width="{W}" height="700" fill="url(#sk143)"/>']
    for _ in range(40):
        x, y = r.uniform(0, 1080), r.uniform(20, 400)
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(1, 2.4):.1f}" fill="#FFFFFF" opacity="{r.uniform(.5, 1):.2f}"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(blob(r, x, 690 + r.uniform(-14, 6), r.uniform(30, 60), r.uniform(20, 40), r.choice(['#4A4E78', '#3E4470']), 1) for x in range(0, 1100, 50)) + '</g>')
    p.append('<path d="M0 700 L1080 700 L1080 1350 L0 1350Z" fill="url(#ct143)"/>')
    p.append(glow(540, 720, 600, 50, '#FFC89A', .45, 28))
    for d in ['M-80 1350 L240 710 L840 710 L1160 1350', 'M60 900 L1020 900', 'M540 710 L540 1350']:
        p.append(f'<path d="{d}" stroke="#E8ECF4" stroke-width="5" opacity=".7" fill="none"/>')
    balls = ''
    for _ in range(90):                                                                                        # 地上的星：越近越大
        y = r.uniform(720, 1170)
        rr = 3 + (y - 700) / 470 * 11
        x = r.uniform(80, 1000)
        balls += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr * 2.2:.1f}" fill="#E4F76A" opacity=".18" filter="url(#bl6)"/><circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.1f}" fill="#C6EA3D"/><circle cx="{x - rr*.3:.1f}" cy="{y - rr*.3:.1f}" r="{rr*.35:.1f}" fill="#F2FFB0" opacity=".8"/>'
    p.append(balls)
    p.append('<path d="M800 1080 L900 1060 L930 1130 L830 1150Z" fill="none" stroke="#1E2A3A" stroke-width="4"/>')   # 倒下的球筐
    for i in range(1, 5):
        p.append(f'<line x1="{800 + i*25}" y1="{1080 - i*5}" x2="{830 + i*25}" y2="{1150 - i*5}" stroke="#1E2A3A" stroke-width="2"/>')
    K = '#1A1E2A'
    fig = [ink([(160, 1090), (200, 1096), (210, 1130)], 9, K, 1, (.1, .1)), ink([(166, 1092), (214, 1090), (226, 1128)], 9, K, 1, (.1, .1)),
           ink([(160, 1090), (156, 1056), (160, 1028)], 26, '#FFFFFF', 1, (.35, .3)), f'<circle cx="160" cy="1010" r="11" fill="{K}"/>',
           ink([(158, 1044), (130, 1070), (122, 1092)], 6, K, 1, (.1, .1))]
    p.append('<g filter="url(#paint2)">' + ''.join(fig) + '</g>')
    txt, xl, yb = poem(META['lines'], 1000, 110, 40, '#FFF6E4')
    p.append(txt)
    p.append(seal(xl - 40, yb + 32, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.07))
    return page(''.join(p))
