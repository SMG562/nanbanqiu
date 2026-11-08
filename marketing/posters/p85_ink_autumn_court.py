from lib import *
from lin import blob, ink, seal, gball, frame, X0, Y0, S

META = dict(
    id=85, slug='ink-autumn-court', title='秋林球场', lines=['秋天，', '场上的叶子比球多。'],
    style=['水墨重彩', '插画', '意境'], tone='暖色', demo=False,
    concept='水墨重彩方画：一排浓墨树干立在金黄、橙红的秋林前，林后一片亮天；树下一块绿球场，落叶铺了一层，一颗荧光球混在叶子里',
    use='秋天 / 季节感，朋友圈配图；球场一年四季都有人打',
)


def svg():
    r = random.Random(85)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#4A3418"/>']
    for k in range(7):                            # 林后的亮天：几笔横扫
        y = 330 + k * 26 + r.uniform(-8, 8)
        p.append(ink([(240 + r.uniform(-40, 40), y), (560, y - 6), (880 + r.uniform(-40, 40), y + 4)], r.uniform(34, 52), r.choice(['#F4E2A6', '#FFF1C4', '#EED08A']), .9, (.3, .3)))
    cols = ['#E8A93A', '#D9752A', '#B8452A', '#F2CF5B', '#7A4E1C', '#2E4B3C', '#F0B848']
    for i in range(420):                          # 秋林：一层层色块，越往下越密越暗
        y = r.uniform(Y0 - 20, 680)
        x = r.uniform(X0 - 20, x1 + 20)
        if 380 < x < 720 and 300 < y < 470 and r.random() < .75:
            continue                              # 给亮天留空
        c = r.choice(cols if y < 560 else cols[1:3] + ['#5A3A16', '#2E4B3C'])
        s = r.uniform(18, 52)
        p.append(blob(r, x, y, s, s * r.uniform(.5, .9), c, r.uniform(.75, 1), r.uniform(0, 180)))
    p.append(f'<path d="M{X0} 690 L{x1} 670 L{x1} {y1} L{X0} {y1}Z" fill="#26402E"/>')
    for _ in range(26):                           # 地面横向笔触
        y = r.uniform(700, 1005)
        x = r.uniform(X0 - 40, x1 - 100)
        p.append(ink([(x, y), (x + r.uniform(90, 260), y + r.uniform(-6, 6))], r.uniform(8, 18), r.choice(['#1B3024', '#335A40', '#5A4220']), .7, (.3, .3)))
    p.append(ink([(X0 - 20, 688), (400, 680), (x1 + 20, 668)], 22, '#17120C', .85, (.1, .1)))
    p.append('<path d="M190 1010 L330 735 L790 728 L950 1010Z" fill="#3E6E4C"/>')      # 球场
    p.append(ink([(330, 735), (790, 728)], 7, '#EFE6CC', .9, (0, 0)))
    p.append(ink([(330, 735), (190, 1010)], 8, '#EFE6CC', .9, (0, .1)))
    p.append(ink([(790, 728), (950, 1010)], 8, '#EFE6CC', .9, (0, .1)))
    p.append(ink([(300, 800), (820, 790)], 6, '#EFE6CC', .85, (0, 0)))
    p.append(ink([(560, 795), (566, 1010)], 6, '#EFE6CC', .8, (0, 0)))
    p.append(ink([(275, 838), (848, 828)], 9, '#1A1712', 1, (.05, .05)))                # 球网
    for _ in range(14):
        xx = r.uniform(285, 840)
        p.append(ink([(xx, 838), (xx + 2, 812)], 3, '#1A1712', .7, (0, 0)))
    for _ in range(90):                           # 落叶
        y = r.uniform(760, 1005)
        x = r.uniform(170, 980)
        p.append(blob(r, x, y, r.uniform(7, 16), r.uniform(4, 8), r.choice(cols[:4]), r.uniform(.8, 1), r.uniform(0, 180), .35, 6))
    p.append('<ellipse cx="642" cy="944" rx="30" ry="9" fill="#10201A" opacity=".55"/>')
    p.append(gball(636, 916, 28, -30, '85'))
    for _ in range(5):
        y = r.uniform(925, 950)
        p.append(blob(r, 636 + r.uniform(-40, 40), y, 13, 6, r.choice(cols[:3]), 1, r.uniform(0, 180), .3, 6))
    trunks = [(120, 18), (215, 12), (300, 24), (395, 9), (735, 14), (840, 26), (930, 11), (985, 17)]
    for x, w in trunks:                           # 浓墨树干，一笔到顶
        base = 690 + r.uniform(-10, 60) if x in (300, 840) else 700
        top = Y0 - 10
        bend = r.uniform(-30, 30)
        p.append(ink([(x, base + (60 if w > 20 else 0)), (x + bend * .3, 500), (x + bend, 260), (x + bend * 1.2, top)], w, '#17120C', .95, (.02, .02)))
        for _ in range(2):
            by = r.uniform(180, 480)
            d = r.choice([-1, 1])
            p.append(ink([(x + bend * .6, by), (x + d * 50, by - 50), (x + d * r.uniform(90, 130), by - r.uniform(90, 140))], w * .45, '#17120C', .9, (.05, .6)))
    p.append(seal(930, 870, 40))
    return page(frame(''.join(p), '秋天，场上的叶子比球多。', 'AUTUMN', 85))
