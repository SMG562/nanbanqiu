from lib import *
from lin import DEFS, blob, ink, glow, poem, seal

META = dict(
    id=142, slug='dew-footprints', title='有人先到了', lines=['露水还在，', '有人先到了。'],
    style=['意境', '清晨', '光亮'], tone='浅色', demo=False,
    concept='清晨的球场铺满一层银白的露水，朝阳从远处低低地照过来，场地泛着粉金的光；一行深色的脚印从画面下方一路走到网前，网前放着一个球包和一颗球，人不在画里',
    use='早场 / 第一个到；不画人，只画人留下的痕迹',
)


def svg():
    r = random.Random(142)
    p = [f'<defs>{DEFS}<linearGradient id="sk142" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD2E8"/><stop offset=".7" stop-color="#F8D8C8"/><stop offset="1" stop-color="#FFE8C8"/></linearGradient>'
         '<linearGradient id="ct142" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8E4D8"/><stop offset="1" stop-color="#9CC4B0"/></linearGradient></defs>',
         f'<rect width="{W}" height="470" fill="url(#sk142)"/>', glow(760, 450, 200, 70, '#FFF6DC', .95)]
    p.append('<g filter="url(#paint2)">' + ''.join(blob(r, x, 452 + r.uniform(-8, 8), r.uniform(30, 50), r.uniform(18, 30), r.choice(['#B8C8C4', '#A8BCB8']), .9) for x in range(0, 1100, 44)) + '</g>')
    p.append('<path d="M0 470 L1080 470 L1080 1350 L0 1350Z" fill="url(#ct142)"/>')
    for _ in range(900):                                                                                       # 露珠闪光
        y = r.uniform(480, 1180)
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{y:.0f}" r="{r.uniform(.6, 1.8) * (y - 400) / 400:.1f}" fill="#FFFFFF" opacity="{r.uniform(.3, .9):.2f}"/>')
    p.append(glow(760, 520, 380, 90, '#FFE8D0', .6, 28))
    VX, VY = 540, 470
    for x in (-120, 1200, 140, 940):
        p.append(f'<line x1="{VX + (x - VX) * .3:.0f}" y1="500" x2="{x}" y2="1350" stroke="#FFFFFF" stroke-width="7" opacity=".9"/>')
    p.append('<line x1="140" y1="500" x2="940" y2="500" stroke="#FFFFFF" stroke-width="5"/>')
    p.append('<line x1="90" y1="540" x2="990" y2="540" stroke="#2A2E2A" stroke-width="6"/>')                 # 网
    for i in range(46):
        x = 90 + i * 20
        p.append(f'<line x1="{x}" y1="540" x2="{x + 1}" y2="574" stroke="#2A2E2A" stroke-width="1.2" opacity=".6"/>')
    p.append('<line x1="90" y1="574" x2="990" y2="574" stroke="#2A2E2A" stroke-width="1.5" opacity=".5"/>')
    # 一行脚印：从下往上，越远越小
    for k in range(18):
        t = k / 17
        y = 1170 - (1170 - 600) * (t ** .8)
        sc = 1.2 - t * .85
        x = 520 + 40 * math.sin(t * 3) + (18 if k % 2 else -18) * sc
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{11 * sc:.1f}" ry="{20 * sc:.1f}" transform="rotate({-6 if k % 2 else 6} {x:.0f} {y:.0f})" fill="#5E8E7A" opacity=".75"/>')
    p.append('<rect x="572" y="588" width="70" height="26" rx="12" fill="#2E5A4A"/><rect x="600" y="582" width="16" height="8" rx="3" fill="#2E5A4A"/>')   # 球包
    p.append('<circle cx="560" cy="606" r="8" fill="#C6EA3D"/>')
    txt, xl, yb = poem(META['lines'], 160, 110, 40, '#2E3A4A')
    p.append(txt)
    p.append(seal(xl - 40, yb + 32, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.06, light=True))
    return page(''.join(p))
