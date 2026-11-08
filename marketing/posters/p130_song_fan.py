from lib import *
from lin import DEFS, blob, ink, glow

META = dict(
    id=130, slug='song-fan', title='先看会儿山', lines=['早到了半小时，', '先看会儿山。'],
    style=['宋画', '团扇', '留白', '光亮'], tone='浅色', demo=False,
    concept='宋人团扇小品 × 马远「一角」：天青底上一面绢色圆扇，画只占扇面左下一角——一块山石、一棵探出去的松，松下一小块球场，一个人早到了，站着看远山；扇面其余全是雾和水',
    use='早到 / 等人；宋画的留白就是等待的时间',
)


def svg():
    r = random.Random(130)
    cx, cy, R = 540, 600, 390
    p = [f'<defs>{DEFS}<linearGradient id="bg130" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C4D8D2"/><stop offset="1" stop-color="#E6EDE8"/></linearGradient>'
         f'<radialGradient id="fan130" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#FAF4E4"/><stop offset="1" stop-color="#EADCBC"/></radialGradient>'
         f'<clipPath id="fc130"><circle cx="{cx}" cy="{cy}" r="{R}"/></clipPath></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#bg130)"/>',
         f'<circle cx="{cx+6}" cy="{cy+14}" r="{R}" fill="#6E8A80" opacity=".25" filter="url(#bl14)"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#fan130)"/>']
    g = []
    for i, (y, op) in enumerate([(560, .25), (620, .18)]):                                                   # 远山：两抹淡墨
        g.append(ink([(560, y), (700, y - 70 + i * 20), (820, y - 20), (980, y - 50)], 60 - i * 16, '#7E9690', op, (.4, .4)))
    g.append(glow(700, 680, 360, 60, '#FFFFFF', .9, 28))
    for k in range(9):                                                                                       # 水纹：极淡的几笔
        y = 760 + k * 22
        g.append(ink([(420 + k * 10, y), (700, y + 3), (960, y - 2)], 2.2, '#9AA8A0', .35, (.4, .4)))
    g.append('<path d="M140 980 C170 860 220 760 300 700 C340 670 380 690 400 740 C430 800 440 880 470 1000Z" fill="#5C6A5E"/>')     # 一角山石
    g.append(ink([(150, 960), (220, 780), (300, 700)], 10, '#2A302A', .9, (.05, .3)))
    g.append(ink([(330, 700), (380, 760), (420, 860)], 7, '#2A302A', .7, (.1, .4)))
    g.append(ink([(300, 704), (360, 600), (470, 540), (600, 520)], 14, '#2A2620', 1, (.02, .9)))            # 探出去的松
    for x, y in [(380, 590), (450, 548), (530, 528), (590, 520), (330, 650)]:
        for _ in range(7):
            g.append(blob(r, x + r.uniform(-30, 30), y + r.uniform(-14, 8), r.uniform(10, 18), r.uniform(4, 7), r.choice(['#2E4A3A', '#3E5E48']), .95, r.uniform(-15, 15)))
    g.append('<path d="M410 930 L610 924 L640 958 L390 964Z" fill="#7DB08A"/>')                              # 松下一小块场
    for d in ['M410 930 L610 924 L640 958 L390 964Z', 'M400 946 L626 940']:
        g.append(f'<path d="{d}" stroke="#FBF5E6" stroke-width="2" fill="none"/>')
    g.append('<rect x="584" y="908" width="6" height="18" rx="3" fill="#FFFFFF"/><circle cx="587" cy="903" r="4.5" fill="#2A2620"/>')
    g.append('<line x1="580" y1="912" x2="572" y2="926" stroke="#2A2620" stroke-width="2"/>')
    g.append('<circle cx="502" cy="950" r="3" fill="#C6EA3D"/>')
    p.append(f'<g clip-path="url(#fc130)"><g filter="url(#paint2)">{"".join(g)}</g></g>')
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#B89E6A" stroke-width="4"/>')
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{R-10}" fill="none" stroke="#B89E6A" stroke-width="1" opacity=".6"/>')
    p.append(tag('EARLY · 5:30 PM', y=120, color='#2E4A42', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=1074, size=44, colors=('#2E4A42', '#9E2A2B'), lh=62))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
