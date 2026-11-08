from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=111, slug='ink-sea-wind', title='海边的场', lines=['海边的场，', '球总往左飘。'],
    style=['水墨重彩', '自然', '天地', '光亮'], tone='亮色', demo=False,
    concept='学林风眠的格局：方画里七成是天——大团发亮的白云、透亮的蓝；下面一条饱满的群青海，崖上一小块球场，一个人抛球发球，衣角被风吹起；几只海鸥是几笔墨',
    use='海边球场 / 有风的日子；天地很大，人很自在',
)


def svg():
    r = random.Random(111)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<defs><linearGradient id="sk111" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F86C8"/><stop offset=".55" stop-color="#7CC0E6"/><stop offset="1" stop-color="#D8EEF4"/></linearGradient></defs>',
         f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="url(#sk111)"/>']
    p.append(wash(r, Y0, 600, ['#4C9AD4', '#6AB0E0', '#3A8CCB'], 14, (30, 70), (.25, .5)))
    for cx, cy, sc in [(380, 300, 1.0), (800, 210, .7), (900, 470, .55), (180, 520, .5)]:     # 大白云：暗部 + 亮部 + 一圈光
        for _ in range(int(16 * sc) + 6):
            p.append(blob(r, cx + r.uniform(-200, 200) * sc, cy + r.uniform(10, 80) * sc, r.uniform(60, 110) * sc, r.uniform(40, 70) * sc, r.choice(['#B9D0E2', '#A6C2DA']), .9))
        for _ in range(int(22 * sc) + 8):
            p.append(blob(r, cx + r.uniform(-190, 190) * sc, cy + r.uniform(-90, 40) * sc, r.uniform(50, 100) * sc, r.uniform(40, 80) * sc, r.choice(['#FFFFFF', '#FBFAF2', '#F2F6F8']), .95))
        p.append(glow(cx - 40 * sc, cy - 60 * sc, 160 * sc, 90 * sc, '#FFFFFF', .7, 28))
    p.append(f'<path d="M{X0-10} 640 L{x1+10} 630 L{x1+10} 820 L{X0-10} 820Z" fill="#1F5FB0"/>')            # 海
    p.append(wash(r, 640, 810, ['#2A70C0', '#1A4E9A', '#3C88D0', '#A8D4EE'], 20, (6, 16), (.5, .9)))
    p.append(glow(760, 650, 200, 16, '#FFFFFF', .7, 14))
    p.append(f'<path d="M{X0-10} 790 C300 760 600 770 {x1+10} 740 L{x1+10} {y1+10} L{X0-10} {y1+10}Z" fill="#8FC85A"/>')  # 崖顶草地
    p.append(wash(r, 790, 1000, ['#A6D468', '#7CB84A', '#C4E27A'], 18, (14, 34), (.5, .8)))
    p.append(ink([(X0 - 20, 800), (300, 770), (600, 776), (x1 + 20, 748)], 10, '#4E7A2E', .7, (0, 0)))
    p.append('<path d="M210 860 L860 836 L960 1000 L120 1010Z" fill="#3F9C7A"/>')
    for a, b in [((210, 860), (860, 836)), ((860, 836), (960, 1000)), ((120, 1010), (210, 860)), ((180, 912), (900, 890))]:
        p.append(ink([a, b], 7, '#FFFBEE', .95, (0, 0)))
    for x in range(200, 880, 70):                                                                 # 低矮的围网柱
        p.append(ink([(x, 850 - (x - 200) * .035), (x, 800 - (x - 200) * .035)], 4, '#2E3A30', .55, (0, 0)))
    # 人：发球抛球，衣角被风吹向左
    K = '#16181A'
    p.append(ink([(600, 958), (606, 910), (612, 872)], 14, K, 1, (.1, .2)))
    p.append(ink([(616, 958), (624, 912), (622, 872)], 14, K, 1, (.1, .2)))
    p.append(ink([(616, 876), (612, 830), (606, 796)], 34, '#FFFFFF', 1, (.35, .3)))
    p.append(ink([(604, 820), (574, 828), (552, 832)], 12, '#FFFFFF', .95, (.1, .9)))              # 被风吹起的衣角
    p.append(blob(r, 604, 778, 13, 15, K, 1))
    p.append(ink([(610, 800), (622, 760), (630, 720)], 7, K, 1, (.05, .6)))
    p.append(ink([(600, 804), (580, 784), (584, 756)], 8, K, 1, (.05, .1)))
    p.append(f'<ellipse cx="578" cy="736" rx="10" ry="17" transform="rotate(-20 578 736)" fill="none" stroke="{K}" stroke-width="4"/>')
    p.append(gball(600, 664, 10, 0, '111'))                                                        # 球被风推到了左边
    p.append(ink([(632, 700), (624, 680), (606, 670)], 2.5, '#FFFFFF', .7, (.8, 0)))
    for x, y, s_ in [(220, 600, 1), (300, 570, .7), (840, 580, .8)]:                                # 海鸥
        p.append(ink([(x - 22 * s_, y), (x - 8 * s_, y - 10 * s_), (x, y)], 4, '#22262A', .9, (.2, .1)))
        p.append(ink([(x, y), (x + 10 * s_, y - 12 * s_), (x + 26 * s_, y - 4 * s_)], 4, '#22262A', .9, (.1, .2)))
    p.append(seal(944, 120, 36))
    return page(frame(''.join(p), '海边的场，球总往左飘。', 'SEA WIND', 111))
