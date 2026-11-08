from lib import *
from lin import DEFS, blob, ink, glow, wash, poem, seal

META = dict(
    id=129, slug='summer-icepop', title='去买冰棍', lines=['知了叫得欢，', '太阳照得狠。', '打完这一盘，', '我去买冰棍。'],
    style=['题画诗', '幽默', '夏天', '光亮'], tone='亮色', demo=False,
    concept='诗画配：盛夏的大天、一大团白云，一棵浓绿的树把影子铺在场边；树下的人已经坐下，举着一根冰棍，拍子横在膝上；树干上趴着一只小小的知了，要凑近才看见',
    use='夏天打球；会心一笑、明亮、轻松',
)


def svg():
    r = random.Random(129)
    p = [f'<defs>{DEFS}<linearGradient id="sk129" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FB0E6"/><stop offset=".6" stop-color="#BFE2F4"/><stop offset="1" stop-color="#F6F4E6"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk129)"/>']
    cl = []
    for _ in range(26):                                                                                           # 一大团白云（右上）
        cl.append(blob(r, 760 + r.uniform(-200, 200), 330 + r.uniform(-40, 90), r.uniform(60, 110), r.uniform(50, 80), r.choice(['#C8DCEA', '#B4CCE0']), .95))
    for _ in range(34):
        cl.append(blob(r, 760 + r.uniform(-190, 190), 300 + r.uniform(-110, 50), r.uniform(50, 100), r.uniform(40, 80), r.choice(['#FFFFFF', '#FBFBF4']), .97))
    p.append('<g filter="url(#paint2)">' + ''.join(cl) + '</g>')
    p.append(glow(720, 260, 200, 100, '#FFFFFF', .6, 28))
    n0 = len(p)
    p.append('<path d="M0 930 C320 920 760 940 1080 924 L1080 1350 L0 1350Z" fill="#8CC86A"/>')
    p.append('<path d="M360 960 L1100 950 L1100 1180 L300 1180Z" fill="#3FA88E"/>')
    for d in ['M360 960 L1100 950', 'M330 1070 L1100 1060', 'M300 1180 L360 960']:
        p.append(f'<path d="{d}" stroke="#FFFBEE" stroke-width="5" fill="none"/>')
    t = [ink([(170, 1090), (176, 900), (160, 760), (190, 640)], 48, '#4A3624', 1, (.02, .3)),
         ink([(176, 760), (300, 660), (400, 640)], 18, '#4A3624', 1, (.05, .8)), ink([(180, 700), (90, 600)], 16, '#4A3624', 1, (.05, .8))]
    for cols, n, sz in [(['#2E7A3E', '#24683A'], 70, (40, 70)), (['#4E9A44', '#5EAA4C'], 90, (24, 46)), (['#8CC85A', '#A8D86A'], 60, (10, 22))]:
        for _ in range(n):
            a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random())
            t.append(blob(r, 200 + 300 * d * math.cos(a), 560 + 170 * d * math.sin(a), r.uniform(*sz), r.uniform(*sz) * .7, r.choice(cols), .95))
    t.append('<ellipse cx="240" cy="1110" rx="260" ry="40" fill="#2E6A44" opacity=".35"/>')                       # 树荫
    t.append(blob(r, 182, 840, 9, 13, '#3A2E1E', 1) + ink([(176, 834), (166, 826)], 3, '#E8E2C8', .8, (0, 0)) + ink([(188, 834), (198, 826)], 3, '#E8E2C8', .8, (0, 0)))   # 知了
    K = '#2A2420'
    t += [ink([(300, 1100), (330, 1110), (346, 1140)], 9, K, 1, (.1, .1)), ink([(310, 1102), (350, 1104), (370, 1136)], 9, K, 1, (.1, .1)),
          ink([(300, 1100), (296, 1060), (300, 1030)], 28, '#FFFFFF', 1, (.35, .3)), f'<circle cx="302" cy="1010" r="12" fill="{K}"/>',
          ink([(308, 1048), (330, 1030), (338, 1004)], 6, K, 1, (.1, .1)),                                       # 举着冰棍
          '<rect x="332" y="970" width="16" height="30" rx="7" fill="#F28A3A"/><rect x="338" y="998" width="4" height="12" fill="#E8D8B0"/>',
          ink([(270, 1090), (410, 1100)], 4, K, 1, (0, 0)), f'<ellipse cx="426" cy="1102" rx="18" ry="11" fill="none" stroke="{K}" stroke-width="3.5"/>',
          '<circle cx="640" cy="1120" r="6" fill="#C6EA3D" stroke="#7FA21C" stroke-width="1.2"/>']
    p.append('<g filter="url(#paint2)">' + ''.join(t) + '</g>')
    p[n0:] = ['<g transform="translate(300 1180) scale(1.25) translate(-300 -1180)">' + ''.join(p[n0:]) + '</g>']
    txt, xl, yb = poem(META['lines'], 980, 560, 40, '#2A2A26')
    p.append(txt)
    p.append(seal(xl - 44, yb + 34, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
