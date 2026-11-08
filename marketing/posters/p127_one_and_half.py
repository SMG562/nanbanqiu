from lib import *
from lin import DEFS, blob, ink, glow, wash, poem, seal

META = dict(
    id=127, slug='one-and-half', title='来了一个半', lines=['约了三个人，', '来了一个半。', '一个在热身，', '半个在看天。'],
    style=['题画诗', '幽默', '春天', '光亮'], tone='亮色', demo=False,
    concept='借老树画画的诗画配，往上走一步：春天大片留白的天，一枝桃花从角上探进来，花瓣在飘；场上一个人在压腿热身，另一个躺在场边双手枕头看天——这就是「半个」',
    use='约球的日常：有人准时、有人爽约、有人人到心没到；好笑不刻薄',
)


def svg():
    r = random.Random(127)
    p = [f'<defs>{DEFS}<linearGradient id="sk127" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFDDF0"/><stop offset=".6" stop-color="#F4F1E4"/><stop offset="1" stop-color="#FBF5E6"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk127)"/>']
    for cx, cy, s in [(300, 420, 1), (760, 560, .7)]:                                                             # 淡云
        p.append(glow(cx, cy, 220 * s, 50 * s, '#FFFFFF', .9, 28))
    br = [ink([(1110, 40), (980, 120), (860, 170), (760, 260)], 22, '#3A2A24', 1, (.02, .85)),
          ink([(980, 120), (940, 60), (900, 40)], 10, '#3A2A24', 1, (.05, .9)),
          ink([(860, 170), (820, 120), (780, 110)], 9, '#3A2A24', 1, (.05, .9)),
          ink([(900, 150), (890, 230), (850, 290)], 8, '#3A2A24', 1, (.05, .9))]
    for _ in range(26):                                                                                           # 桃花：五瓣，粉白
        x, y = r.uniform(740, 1060), r.uniform(40, 300)
        if abs((y - 40) - (1110 - x) * .55) > 90 and r.random() < .6:
            continue
        for k in range(5):
            a = k * 72 + r.uniform(-10, 10)
            br.append(blob(r, x + 9 * math.cos(math.radians(a)), y + 9 * math.sin(math.radians(a)), 8, 6, r.choice(['#F6B8C8', '#FAD2DC', '#F29AB2']), .95, a))
        br.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="3" fill="#C2405A"/>')
    for _ in range(14):                                                                                           # 飘下来的花瓣
        x, y = r.uniform(380, 900), r.uniform(320, 900)
        br.append(blob(r, x, y, 6, 4, '#F6B8C8', .9, r.uniform(0, 180)))
    p.append('<g filter="url(#paint2)">' + ''.join(br) + '</g>')
    n0 = len(p)
    p.append('<path d="M0 900 C320 880 760 900 1080 884 L1080 1350 L0 1350Z" fill="#9FD07A"/>')
    p.append(wash(r, 900, 1170, ['#A8D684', '#8CC468', '#B8DE90'], 16, (14, 30), (.4, .7), -100, 1080))
    p.append('<path d="M220 940 L860 930 L960 1160 L120 1170Z" fill="#4BA88A"/>')
    for d in ['M220 940 L860 930 L960 1160 L120 1170Z', 'M170 1050 L910 1040', 'M540 935 L540 1165']:
        p.append(f'<path d="{d}" stroke="#FFFBEE" stroke-width="5" fill="none"/>')
    K = '#2A2420'
    fig = []
    # 一个：压腿热身
    fig += [ink([(380, 1100), (392, 1060), (400, 1022)], 9, K, 1, (.1, .1)), ink([(404, 1022), (440, 1060), (482, 1094)], 9, K, 1, (.1, .1)),
            ink([(400, 1024), (396, 990), (392, 962)], 26, '#FFFFFF', 1, (.35, .3)), f'<circle cx="392" cy="944" r="11" fill="{K}"/>',
            ink([(394, 972), (370, 950), (360, 924)], 6, K, 1, (.1, .1)), ink([(398, 972), (420, 950), (430, 924)], 6, K, 1, (.1, .1))]
    # 半个：躺在场边，双手枕头看天
    fig += [ink([(640, 1150), (700, 1146), (760, 1138)], 22, '#FFD27A', 1, (.3, .3)), f'<circle cx="626" cy="1146" r="11" fill="{K}"/>',
            ink([(760, 1140), (800, 1120), (836, 1136)], 8, K, 1, (.1, .1)), ink([(760, 1142), (810, 1148), (846, 1146)], 8, K, 1, (.1, .1)),
            ink([(640, 1140), (614, 1128), (604, 1144)], 5, K, 1, (.1, .1)),
            ink([(860, 1150), (900, 1110)], 4, K, 1, (0, 0)), f'<ellipse cx="906" cy="1094" rx="10" ry="17" transform="rotate(20 906 1094)" fill="none" stroke="{K}" stroke-width="3.5"/>']
    fig.append('<circle cx="520" cy="1090" r="6" fill="#C6EA3D" stroke="#7FA21C" stroke-width="1.2"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(fig) + '</g>')
    p[n0:] = ['<g transform="translate(540 1180) scale(1.3) translate(-540 -1180)">' + ''.join(p[n0:]) + '</g>']
    txt, xl, yb = poem(META['lines'], 300, 200, 40, '#2A2A26')
    p.append(txt)
    p.append(seal(xl - 44, yb + 34, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
