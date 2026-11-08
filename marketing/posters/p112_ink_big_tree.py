from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=112, slug='ink-big-tree', title='树下坐一会儿', lines=['换边的时候，', '先去树下坐一会儿。'],
    style=['水墨重彩', '自然', '光亮'], tone='亮色', demo=False,
    concept='学林风眠的色彩：一棵撑满画面的大树，树冠是一层层透光的绿和黄绿，阳光从叶缝落下，在球场上洒成亮斑；两个人坐在树下长凳上喝水，场上一颗球、一片明晃晃的夏天',
    use='夏天 / 换边休息；打球不只是比赛，也是一段好时光',
)


def svg():
    r = random.Random(112)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#FFF3C4"/>']
    p.append(glow(820, 220, 300, 240, '#FFFFFF', .95))
    p.append(f'<path d="M{X0-10} 700 L{x1+10} 690 L{x1+10} {y1+10} L{X0-10} {y1+10}Z" fill="#4FAE8A"/>')     # 场地
    p.append(wash(r, 700, 1000, ['#5BBB94', '#47A27E', '#6CC8A0'], 18, (20, 50), (.35, .6)))
    for a, b in [((X0 - 20, 760), (x1 + 20, 748)), ((X0 - 20, 900), (x1 + 20, 886)), ((640, 754), (660, 1010))]:
        p.append(ink([a, b], 8, '#FFFBEE', .95, (0, 0)))
    # 树干和大枝：浓墨，几笔
    p.append(ink([(250, 900), (240, 700), (270, 520), (320, 380)], 70, '#3A2A1A', 1, (.02, .3)))
    p.append(ink([(270, 560), (420, 420), (560, 330)], 30, '#3A2A1A', 1, (.05, .7)))
    p.append(ink([(250, 620), (150, 480), (110, 380)], 26, '#3A2A1A', 1, (.05, .7)))
    p.append(ink([(310, 420), (380, 260), (470, 170)], 22, '#3A2A1A', 1, (.05, .7)))
    # 树冠：深绿托底，黄绿发亮，叶缝里透出天光
    for cols, n, sz, op in [(['#2E7A3E', '#24683A', '#3A8A44'], 90, (40, 80), 1), (['#6CB848', '#86C850', '#5AA840'], 130, (24, 50), .95), (['#C6E85A', '#E2F27E', '#B8DE4C'], 110, (10, 26), .95)]:
        for _ in range(n):
            a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random())
            x, y = 400 + 480 * d * math.cos(a), 220 + 250 * d * math.sin(a)
            s_ = r.uniform(*sz)
            p.append(blob(r, x, y, s_, s_ * .7, r.choice(cols), op, r.uniform(-30, 30), .3, 8))
    for _ in range(40):
        p.append(blob(r, 400 + r.uniform(-420, 420), 220 + r.uniform(-200, 180), r.uniform(5, 12), r.uniform(4, 9), '#FFF8D8', .9))
    # 树影里的光斑
    p.append('<ellipse cx="380" cy="840" rx="380" ry="150" fill="#1E5A48" opacity=".3" filter="url(#bl28)"/>')
    for _ in range(30):
        x, y = r.uniform(X0, 640), r.uniform(720, 1000)
        p.append(blob(r, x, y, r.uniform(12, 26), r.uniform(5, 9), '#E8F7B0', r.uniform(.5, .85)))
    # 长凳和两个人
    p.append(ink([(360, 830), (580, 826)], 14, '#7A4A22', 1, (0, 0)))
    p.append(ink([(372, 832), (372, 880)], 8, '#3A2A1A', 1, (0, 0)))
    p.append(ink([(568, 828), (568, 876)], 8, '#3A2A1A', 1, (0, 0)))
    K = '#1A1A18'
    for bx, shirt, tilt in [(420, '#FFFFFF', -6), (520, '#F49A6A', 8)]:
        p.append(ink([(bx, 826), (bx + tilt * .5, 790), (bx + tilt, 760)], 34, shirt, 1, (.35, .3)))
        p.append(blob(r, bx + tilt * 1.2, 740, 13, 15, K, 1))
        p.append(ink([(bx - 8, 828), (bx + 16, 840), (bx + 14, 876)], 11, K, 1, (.1, .1)))
        p.append(ink([(bx + 6, 828), (bx + 30, 838), (bx + 30, 876)], 11, K, 1, (.1, .1)))
    p.append(ink([(436, 786), (452, 770), (456, 742)], 7, K, 1, (0, 0)))                            # 举瓶喝水
    p.append(ink([(456, 744), (450, 718)], 9, '#6EC6E8', 1, (0, 0)))
    p.append(ink([(504, 786), (476, 800)], 7, K, 1, (0, 0)))
    p.append(ink([(560, 830), (600, 760)], 5, K, 1, (0, 0)))                                         # 靠在凳边的拍子
    p.append(f'<ellipse cx="610" cy="740" rx="14" ry="22" transform="rotate(25 610 740)" fill="none" stroke="{K}" stroke-width="4"/>')
    p.append('<ellipse cx="822" cy="882" rx="22" ry="5" fill="#1E5A48" opacity=".4"/>')
    p.append(gball(818, 868, 16, 0, '112'))
    p.append(seal(944, 900, 36))
    return page(frame(''.join(p), '换边的时候，先去树下坐一会儿。', 'SUMMER', 112))
