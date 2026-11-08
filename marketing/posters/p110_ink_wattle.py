from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=110, slug='ink-wattle', title='金合欢开了', lines=['球飞进金合欢里，', '找了十分钟。'],
    style=['水墨重彩', '自然', '幽默', '光亮'], tone='亮色', demo=False,
    concept='学林风眠的画法、不搬他的题材：春天一整片金合欢开成金黄的云，天是透亮的青；球场边一个白衣人弯腰钻进花丛找球——那颗黄绿的球就藏在花里，要看一会儿才找得到',
    use='墨尔本春天（8–9 月金合欢开）；光亮、饱满的季节海报',
)


def svg():
    r = random.Random(110)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<defs><linearGradient id="sk110" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EC4D8"/><stop offset=".6" stop-color="#CFE9E4"/><stop offset="1" stop-color="#FFF6D8"/></linearGradient></defs>',
         f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="url(#sk110)"/>']
    p.append(wash(r, Y0, 420, ['#A8DAE4', '#E8F6F2', '#8CCBDC', '#FFFFFF'], 22, (30, 80), (.35, .7)))
    p.append(glow(700, 260, 280, 200, '#FFFBE8', .9))
    p.append(ink([(X0 - 40, 560), (300, 520), (620, 548), (x1 + 40, 520)], 70, '#8FB7C4', .8, (0, 0)))        # 远山，淡青
    p.append(f'<path d="M{X0-10} 600 L{x1+10} 580 L{x1+10} {y1+10} L{X0-10} {y1+10}Z" fill="#7FC06A"/>')
    p.append(wash(r, 590, 1000, ['#93CC72', '#6EB25C', '#B4DA7E', '#5EA552'], 24, (20, 50), (.4, .75)))
    p.append('<path d="M420 640 L900 630 L1010 960 L330 980Z" fill="#3E9A86"/>')                                # 场地（亮青）
    for a, b in [((420, 640), (900, 630)), ((900, 630), (1010, 960)), ((330, 980), (420, 640)), ((395, 740), (930, 728)), ((660, 740), (676, 970))]:
        p.append(ink([a, b], 7, '#FFFBEE', .95, (0, 0)))
    # 金合欢：大团大团的金黄，一层暗金、一层亮黄、一层几乎白的高光
    trees = [(210, 330, 230, 260), (230, 690, 210, 170), (980, 300, 160, 230)]
    for cx, cy, rx, ry in trees:
        p.append(ink([(cx + 10, cy + ry + 120), (cx - 10, cy + ry * .3), (cx + 30, cy - ry * .2)], 22, '#5A4A22', .9, (.05, .6)))
    for cx, cy, rx, ry in trees:
        for layer, cols, n, sz in [(0, ['#D9A21A', '#C98E12'], 60, (26, 44)), (1, ['#F6C928', '#FFD83A', '#F2B81C'], 120, (14, 30)), (2, ['#FFEE7A', '#FFF6B8'], 70, (6, 14))]:
            for _ in range(n):
                a = r.uniform(0, 2 * math.pi)
                d = math.sqrt(r.random())
                x, y = cx + rx * d * math.cos(a), cy + ry * d * math.sin(a) - layer * 8
                s_ = r.uniform(*sz)
                p.append(blob(r, x, y, s_, s_ * .85, r.choice(cols), r.uniform(.8, 1), 0, .3, 7))
        for _ in range(16):                                                                         # 细叶，几笔绿
            a = r.uniform(0, 2 * math.pi)
            x, y = cx + rx * .9 * math.cos(a), cy + ry * .9 * math.sin(a)
            p.append(ink([(x, y), (x + 30 * math.cos(a), y + 30 * math.sin(a))], 6, '#6E8E3A', .7, (.1, .8)))
    p.append(gball(318, 742, 15, 20, '110'))                                                         # 藏在花里的球
    # 白衣人弯腰钻进花丛：只露出后半身
    K = '#1A1A18'
    p.append(ink([(452, 852), (446, 800), (436, 760)], 16, K, 1, (.1, .2)))
    p.append(ink([(476, 852), (474, 800), (450, 760)], 16, K, 1, (.1, .2)))
    p.append(ink([(440, 770), (410, 740), (372, 724)], 44, '#FFFDF4', 1, (.35, .1)))                  # 白衣，探进花里
    p.append(ink([(444, 772), (414, 760), (380, 750)], 4, '#B8B4A0', .7, (.2, .2)))
    p.append(ink([(462, 760), (500, 708), (540, 690)], 6, K, 1, (0, 0)))                                # 背后斜着的球拍
    p.append(f'<ellipse cx="560" cy="676" rx="16" ry="26" transform="rotate(60 560 676)" fill="none" stroke="{K}" stroke-width="5"/>')
    p.append(ink([(440, 856), (462, 858)], 9, K, 1, (.2, .3)))
    p.append(ink([(468, 856), (490, 858)], 9, K, 1, (.2, .3)))
    p.append(seal(944, 900, 36))
    return page(frame(''.join(p), '球飞进金合欢里，找了十分钟。', 'SPRING', 110))
